using CollegeRating.Data;
using CollegeRating.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers
{
    [ApiController]
    [Route("api/events")]
    public class EventsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EventsController(AppDbContext context) => _context = context;

        [HttpGet("feed")]
        public IActionResult GetFeed(int count = 10)
        {
            var events = _context.ActivityEvents
                .OrderByDescending(e => e.CreatedAt)
                .Take(count)
                .Select(e => new
                {
                    e.Id,
                    e.Text,
                    time = e.CreatedAt.ToString("HH:mm"),
                    date = e.CreatedAt.ToString("dd.MM.yyyy")
                })
                .ToList();
            return Ok(events);
        }

        [HttpGet("achievements")]
        public IActionResult GetAchievements()
        {
            var groupsWithPoints = _context.Groups
                .Select(g => new
                {
                    g.Name,
                    TotalPoints = g.Students.Sum(s => s.Rating.TotalPoints)
                })
                .AsEnumerable()
                .OrderByDescending(x => x.TotalPoints)
                .ToList();

            var mostActiveGroup = groupsWithPoints.FirstOrDefault();

            var topStudentToday = _context.Students
                .Include(s => s.Rating)
                .AsEnumerable()
                .OrderByDescending(s => s.Rating?.TotalPoints ?? 0)
                .FirstOrDefault();

            var totalStudents = _context.Students.Count();
            var studentsWithNominations = _context.StudentNominations.Select(sn => sn.StudentId).Distinct().Count();
            var teamSpirit = totalStudents > 0 ? (studentsWithNominations * 100 / totalStudents) : 0;

            return Ok(new
            {
                mostActiveGroup = mostActiveGroup?.Name ?? "—",
                breakthrough = topStudentToday != null
                    ? $"{topStudentToday.FullName} (+{topStudentToday.Rating?.TotalPoints ?? 0})"
                    : "—",
                bestDiscipline = "Алгоритмы",
                teamSpirit = $"{teamSpirit}%"
            });
        }

        public static void AddEvent(AppDbContext context, string text, string eventType = "general")
        {
            context.ActivityEvents.Add(new ActivityEvent
            {
                Text = text,
                CreatedAt = DateTime.UtcNow,
                EventType = eventType
            });
            context.SaveChanges();
        }
    }
}