using CollegeRating.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers
{
    [ApiController]
    [Route("api/summary")]
    [AllowAnonymous]
    public class SummaryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SummaryController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get(CancellationToken ct)
        {
            var groupsCount = await _context.Groups.CountAsync(ct);
            var studentsCount = await _context.Students.CountAsync(ct);
            var nominationsCount = await _context.Nominations.CountAsync(ct);

            var topStudent = await _context.Students
                .Include(s => s.Rating)
                .OrderByDescending(s => s.Rating != null ? s.Rating.TotalPoints : 0)
                .Select(s => new
                {
                    fullName = s.FullName,
                    total = s.Rating != null ? s.Rating.TotalPoints : 0
                })
                .FirstOrDefaultAsync(ct);

            return Ok(new
            {
                groupsCount,
                studentsCount,
                nominationsCount,
                topStudent = topStudent ?? new { fullName = "-", total = 0m }
            });
        }
    }
}