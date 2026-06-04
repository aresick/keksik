using CollegeRating.Data;
using CollegeRating.DTOs;
using CollegeRating.Models;
using CollegeRating.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers;

[ApiController]
[Route("api/students")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly EventLogService _events;

    public StudentsController(AppDbContext context, EventLogService events)
    {
        _context = context;
        _events = events;
    }

    [HttpGet("rating")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRating(CancellationToken ct)
    {
        var students = await _context.Students
            .Include(s => s.Group)
            .Include(s => s.Role)
            .Include(s => s.Rating)
            .Where(s => s.Role.Name == "Student")
            .ToListAsync(ct);

        var rows = students
            .OrderByDescending(s => s.Rating?.TotalPoints ?? 0)
            .ThenBy(s => s.FullName)
            .Select((s, index) => new RatingRowDto(
                s.Id,
                index + 1,
                s.FullName,
                s.Group != null ? s.Group.Name : "Без группы",
                s.Rating?.TotalPoints ?? 0))
            .ToList();

        return Ok(rows);
    }

    [HttpPost("points")]
    public async Task<IActionResult> AddPoints(AddPointsRequest request, CancellationToken ct)
    {
        if (!User.IsInRole("Admin")) return Forbid();

        var student = await _context.Students
            .Include(s => s.Rating)
            .Include(s => s.Role)
            .FirstOrDefaultAsync(s => s.Id == request.StudentId && s.Role.Name == "Student", ct);

        if (student == null)
            return NotFound(new { message = "Студент не найден" });

        var rating = EnsureRating(student);
        rating.TotalPoints = Math.Max(0, rating.TotalPoints + request.Points);
        rating.LocalUpdatedAt = DateTime.UtcNow;
        rating.LastUpdated = rating.LocalUpdatedAt;

        _events.Add($"{student.FullName}: изменение баллов {request.Points:+0.##;-0.##;0}", "points_added");

        await _context.SaveChangesAsync(ct);

        return Ok(new { total = rating.TotalPoints });
    }

    private Rating EnsureRating(Student student)
    {
        if (student.Rating != null)
            return student.Rating;

        student.Rating = new Rating
        {
            StudentId = student.Id,
            TotalPoints = 0,
            LocalUpdatedAt = DateTime.UtcNow,
            LastUpdated = DateTime.UtcNow
        };

        _context.Ratings.Add(student.Rating);

        return student.Rating;
    }
}

public class AddPointsRequest
{
    public int StudentId { get; set; }
    public decimal Points { get; set; }
}