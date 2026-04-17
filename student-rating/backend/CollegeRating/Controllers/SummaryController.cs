using CollegeRating.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers
{
    [ApiController]
    [Route("api/summary")]
    [Authorize]
    public class SummaryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SummaryController(AppDbContext context) => _context = context;

        [HttpGet]
        public IActionResult Get()
        {
            var groupsCount = _context.Groups.Count();
            var studentsCount = _context.Students.Count();
            var nominationsCount = _context.Nominations.Count();

            var topStudent = _context.Students
                .Include(s => s.Rating)
                .AsEnumerable()
                .OrderByDescending(s => s.Rating?.TotalPoints ?? 0)
                .Select(s => new { FullName = s.FullName, total = s.Rating?.TotalPoints ?? 0 })
                .FirstOrDefault();

            return Ok(new
            {
                groupsCount,
                studentsCount,
                nominationsCount,
                topStudent = topStudent ?? new { FullName = "-", total = 0m }
            });
        }
    }
}