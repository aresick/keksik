using CollegeRating.Data;
using CollegeRating.DTOs;
using CollegeRating.Models;
using CollegeRating.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers;

[ApiController]
[Route("api/requests")]
[Authorize]
public class RequestsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly CurrentUserService _currentUser;
    private readonly EventLogService _events;

    public RequestsController(AppDbContext context, CurrentUserService currentUser, EventLogService events)
    {
        _context = context;
        _currentUser = currentUser;
        _events = events;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        if (!_currentUser.IsAdmin) return Forbid();
        return Ok(await _context.ApprovalRequests.OrderByDescending(r => r.CreatedAt).ToListAsync(ct));
    }

    [HttpPost]
    public async Task<IActionResult> Create(ApprovalRequestDto dto, CancellationToken ct)
    {
        var userId = _currentUser.UserId;
        if (userId == null) return Unauthorized();
        if (!_currentUser.IsTeacher && !_currentUser.IsAdmin) return Forbid();

        var request = new ApprovalRequest
        {
            RequestType = dto.RequestType,
            Title = dto.Title,
            Description = dto.Description ?? string.Empty,
            StudentId = dto.StudentId,
            NominationId = dto.NominationId,
            Points = dto.Points,
            NominationTitle = dto.NominationTitle,
            NominationType = dto.NominationType,
            NominationWeight = dto.NominationWeight,
            CreatedById = userId.Value,
            CreatedAt = DateTime.UtcNow
        };

        _context.ApprovalRequests.Add(request);
        _events.Add($"Создана заявка: {request.Title}", "request_created");
        await _context.SaveChangesAsync(ct);
        return Ok(request);
    }

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, CancellationToken ct)
    {
        if (!_currentUser.IsAdmin) return Forbid();

        var request = await _context.ApprovalRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (request == null) return NotFound();
        if (request.Status != "pending") return BadRequest("Заявка уже обработана");

        switch (request.RequestType)
        {
            case "points-add": await ApplyPointsAsync(request, 1, ct); break;
            case "points-remove": await ApplyPointsAsync(request, -1, ct); break;
            case "nomination-add": AddNomination(request); break;
            case "nomination-delete": await DeleteNominationAsync(request, ct); break;
            default: return BadRequest("Неизвестный тип заявки");
        }

        request.Status = "approved";
        request.ResolvedAt = DateTime.UtcNow;
        _events.Add($"Заявка одобрена: {request.Title}", "request_approved");
        await _context.SaveChangesAsync(ct);
        return Ok(request);
    }

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, CancellationToken ct)
    {
        if (!_currentUser.IsAdmin) return Forbid();
        var request = await _context.ApprovalRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (request == null) return NotFound();
        request.Status = "rejected";
        request.ResolvedAt = DateTime.UtcNow;
        _events.Add($"Заявка отклонена: {request.Title}", "request_rejected");
        await _context.SaveChangesAsync(ct);
        return Ok(request);
    }

    [HttpDelete("processed")]
    public async Task<IActionResult> ClearProcessed(CancellationToken ct)
    {
        if (!_currentUser.IsAdmin) return Forbid();
        var processed = await _context.ApprovalRequests.Where(r => r.Status != "pending").ToListAsync(ct);
        _context.ApprovalRequests.RemoveRange(processed);
        await _context.SaveChangesAsync(ct);
        return Ok(new { deleted = processed.Count });
    }

    private async Task ApplyPointsAsync(ApprovalRequest request, int direction, CancellationToken ct)
    {
        if (request.StudentId == null || request.Points == null) return;
        var student = await _context.Students.Include(s => s.Rating)
            .FirstOrDefaultAsync(s => s.Id == request.StudentId.Value, ct);
        if (student == null) return;

        if (student.Rating == null)
        {
            student.Rating = new Rating { StudentId = student.Id };
            _context.Ratings.Add(student.Rating);
        }

        student.Rating.TotalPoints = Math.Max(0, student.Rating.TotalPoints + request.Points.Value * direction);
        student.Rating.LocalUpdatedAt = DateTime.UtcNow;
        student.Rating.LastUpdated = student.Rating.LocalUpdatedAt;
    }

    private void AddNomination(ApprovalRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NominationTitle)) return;
        _context.Nominations.Add(new Nomination
        {
            Title = request.NominationTitle,
            Type = request.NominationType ?? "motivating",
            Weight = request.NominationWeight ?? 1,
            LocalUpdatedAt = DateTime.UtcNow
        });
    }

    private async Task DeleteNominationAsync(ApprovalRequest request, CancellationToken ct)
    {
        if (request.NominationId == null) return;
        var nomination = await _context.Nominations.FindAsync([request.NominationId.Value], ct);
        if (nomination == null) return;

        var assignments = _context.StudentNominations.Where(sn => sn.NominationId == nomination.Id);
        _context.StudentNominations.RemoveRange(assignments);
        _context.Nominations.Remove(nomination);
    }
}

