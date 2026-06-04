using CollegeRating.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _context;
    public EventsController(AppDbContext context) => _context = context;

    [HttpGet("feed")]
    public async Task<IActionResult> GetFeed(int count = 10, CancellationToken ct = default)
    {
        var events = await _context.ActivityEvents
            .OrderByDescending(e => e.CreatedAt)
            .Take(Math.Clamp(count, 1, 50))
            .Select(e => new
            {
                e.Id,
                e.Text,
                time = e.CreatedAt.ToLocalTime().ToString("HH:mm"),
                date = e.CreatedAt.ToLocalTime().ToString("dd.MM.yyyy"),
                e.EventType
            })
            .ToListAsync(ct);
        return Ok(events);
    }

    [HttpGet("achievements")]
    public async Task<IActionResult> GetAchievements(CancellationToken ct)
    {
        var groupsWithPoints = await _context.Groups
            .Select(g => new
            {
                g.Name,
                TotalPoints = g.Students.Sum(s => s.Rating == null ? 0 : s.Rating.TotalPoints)
            })
            .OrderByDescending(x => x.TotalPoints)
            .ToListAsync(ct);

        var topStudent = await _context.Students
            .Include(s => s.Rating)
            .OrderByDescending(s => s.Rating == null ? 0 : s.Rating.TotalPoints)
            .FirstOrDefaultAsync(ct);

        var totalStudents = await _context.Students.CountAsync(ct);
        var studentsWithNominations = await _context.StudentNominations.Select(sn => sn.StudentId).Distinct().CountAsync(ct);
        var teamSpirit = totalStudents > 0 ? studentsWithNominations * 100 / totalStudents : 0;

        return Ok(new
        {
            mostActiveGroup = groupsWithPoints.FirstOrDefault()?.Name ?? "—",
            breakthrough = topStudent != null ? $"{topStudent.FullName} (+{topStudent.Rating?.TotalPoints ?? 0})" : "—",
            bestDiscipline = "Алгоритмы",
            teamSpirit = $"{teamSpirit}%"
        });
    }
}

