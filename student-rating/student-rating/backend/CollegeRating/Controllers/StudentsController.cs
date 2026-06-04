using CollegeRating.Data;
using CollegeRating.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers
{
    [ApiController]
    [Route("api/students")]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StudentsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("rating")]
        public IActionResult GetRating()
        {
            var students = _context.Students
                .Include(s => s.Group)
                .Include(s => s.Rating)
                .ToList();

            var ratingRows = students
                .OrderByDescending(s => s.Rating?.TotalPoints ?? 0)
                .Select((s, index) => new
                {
                    id = s.Id,
                    rank = index + 1,
                    fullName = s.FullName,
                    group = s.Group.Name,
                    total = s.Rating?.TotalPoints ?? 0
                })
                .ToList();

            return Ok(ratingRows);
        }

        [HttpPost("points")]
        public IActionResult AddPoints([FromBody] AddPointsRequest request)
        {
            var student = _context.Students
                .Include(s => s.Rating)
                .FirstOrDefault(s => s.Id == request.StudentId);

            if (student == null) return NotFound();

            if (student.Rating == null)
            {
                student.Rating = new Rating { StudentId = student.Id, TotalPoints = 0 };
                _context.Ratings.Add(student.Rating);
            }

            student.Rating.TotalPoints += request.Points;
            student.Rating.LastUpdated = DateTime.UtcNow;
            _context.SaveChanges();

            EventsController.AddEvent(_context, $"{student.FullName} получил {request.Points} баллов", "points_added");

            return Ok(new { total = student.Rating.TotalPoints });
        }
    }

    public class AddPointsRequest
    {
        public int StudentId { get; set; }
        public decimal Points { get; set; }
    }
}