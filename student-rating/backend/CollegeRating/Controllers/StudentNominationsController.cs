using CollegeRating.Data;
using CollegeRating.DTOs;
using CollegeRating.Models;
using CollegeRating.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers;

[ApiController]
[Route("api/student-nominations")]
[Authorize]
public class StudentNominationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly EventLogService _events;

    public StudentNominationsController(AppDbContext context, EventLogService events)
    {
        _context = context;
        _events = events;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var data = await _context.StudentNominations
            .Include(sn => sn.Student).ThenInclude(s => s.Group)
            .Include(sn => sn.Nomination)
            .OrderByDescending(sn => sn.AwardedAt)
            .Select(sn => new
            {
                sn.Id,
                studentId = sn.StudentId,
                studentName = sn.Student.FullName,
                group = sn.Student.Group.Name,
                nominationId = sn.NominationId,
                nominationTitle = sn.Nomination.Title,
                awardedAt = sn.AwardedAt.ToString("yyyy-MM-dd")
            })
            .ToListAsync(ct);
        return Ok(data);
    }

    [HttpPost]
    public async Task<IActionResult> Assign(AssignNominationRequest request, CancellationToken ct)
    {
        if (!User.IsInRole("Teacher") && !User.IsInRole("Admin")) return Forbid();

        var exists = await _context.StudentNominations.AnyAsync(sn =>
            sn.StudentId == request.StudentId && sn.NominationId == request.NominationId, ct);
        if (exists) return BadRequest("Номинация уже назначена");

        var student = await _context.Students.Include(s => s.Rating).FirstOrDefaultAsync(s => s.Id == request.StudentId, ct);
        var nomination = await _context.Nominations.FindAsync([request.NominationId], ct);
        if (student == null || nomination == null) return NotFound();

        _context.StudentNominations.Add(new StudentNomination
        {
            StudentId = request.StudentId,
            NominationId = request.NominationId,
            AwardedAt = DateTime.UtcNow,
            LocalUpdatedAt = DateTime.UtcNow
        });

        var rating = EnsureRating(student);
        rating.TotalPoints += nomination.Weight;
        rating.LocalUpdatedAt = DateTime.UtcNow;
        rating.LastUpdated = rating.LocalUpdatedAt;

        _events.Add($"{student.FullName} получил номинацию «{nomination.Title}» (+{nomination.Weight} баллов)", "nomination_assigned");
        await _context.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Remove(int id, CancellationToken ct)
    {
        if (!User.IsInRole("Teacher") && !User.IsInRole("Admin")) return Forbid();

        var sn = await _context.StudentNominations
            .Include(x => x.Student).ThenInclude(s => s.Rating)
            .Include(x => x.Nomination)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (sn == null) return NotFound();

        // При удалении назначения возвращаем баллы назад, чтобы рейтинг не разъезжался.
        if (sn.Student.Rating != null)
        {
            sn.Student.Rating.TotalPoints = Math.Max(0, sn.Student.Rating.TotalPoints - sn.Nomination.Weight);
            sn.Student.Rating.LocalUpdatedAt = DateTime.UtcNow;
            sn.Student.Rating.LastUpdated = sn.Student.Rating.LocalUpdatedAt;
        }

        _context.StudentNominations.Remove(sn);
        _events.Add($"Убрана номинация «{sn.Nomination.Title}» у {sn.Student.FullName}", "nomination_removed");
        await _context.SaveChangesAsync(ct);
        return Ok();
    }

    private Rating EnsureRating(Student student)
    {
        if (student.Rating != null) return student.Rating;
        student.Rating = new Rating { StudentId = student.Id, TotalPoints = 0, LocalUpdatedAt = DateTime.UtcNow };
        _context.Ratings.Add(student.Rating);
        return student.Rating;
    }
}

