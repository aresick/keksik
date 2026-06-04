using CollegeRating.Data;
using CollegeRating.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers
{
    [ApiController]
    [Route("api/student-nominations")]
    [Authorize]
    public class StudentNominationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StudentNominationsController(AppDbContext context) => _context = context;

        [HttpGet]
        public IActionResult GetAll()
        {
            var data = _context.StudentNominations
                .Include(sn => sn.Student).ThenInclude(s => s.Group)
                .Include(sn => sn.Nomination)
                .ToList()
                .Select(sn => new
                {
                    sn.Id,
                    studentId = sn.StudentId,
                    studentName = sn.Student.FullName,
                    group = sn.Student.Group.Name,
                    nominationId = sn.NominationId,
                    nominationTitle = sn.Nomination.Title,
                    awardedAt = sn.AwardedAt.ToString("yyyy-MM-dd")
                });
            return Ok(data);
        }

        [HttpPost]
        public IActionResult Assign([FromBody] AssignNominationRequest request)
        {
            var exists = _context.StudentNominations.Any(sn =>
                sn.StudentId == request.StudentId && sn.NominationId == request.NominationId);
            if (exists) return BadRequest("Номинация уже назначена");

            var student = _context.Students.Include(s => s.Rating).FirstOrDefault(s => s.Id == request.StudentId);
            var nomination = _context.Nominations.Find(request.NominationId);
            if (student == null || nomination == null) return NotFound();

            var sn = new StudentNomination
            {
                StudentId = request.StudentId,
                NominationId = request.NominationId,
                AwardedAt = DateTime.UtcNow
            };
            _context.StudentNominations.Add(sn);

            // Начисление баллов = вес номинации
            if (student.Rating == null)
            {
                student.Rating = new Rating { StudentId = student.Id, TotalPoints = 0 };
                _context.Ratings.Add(student.Rating);
            }
            student.Rating.TotalPoints += nomination.Weight;
            student.Rating.LastUpdated = DateTime.UtcNow;

            _context.SaveChanges();

            EventsController.AddEvent(_context,
                $"{student.FullName} получил номинацию «{nomination.Title}» (+{nomination.Weight} баллов)",
                "nomination_assigned");

            return Ok();
        }

        [HttpDelete("{id}")]
        public IActionResult Remove(int id)
        {
            var sn = _context.StudentNominations.Find(id);
            if (sn == null) return NotFound();
            _context.StudentNominations.Remove(sn);
            _context.SaveChanges();
            return Ok();
        }
    }

    public class AssignNominationRequest
    {
        public int StudentId { get; set; }
        public int NominationId { get; set; }
    }
}