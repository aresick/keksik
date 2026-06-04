using CollegeRating.Data;
using CollegeRating.Models;
using CollegeRating.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers;

[ApiController]
[Route("api/nominations")]
[Authorize]
public class NominationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly EventLogService _events;

    public NominationsController(AppDbContext context, EventLogService events)
    {
        _context = context;
        _events = events;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var nominations = await _context.Nominations
            .OrderBy(n => n.Title)
            .ToListAsync(ct);

        return Ok(nominations);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Nomination nomination, CancellationToken ct)
    {
        if (!User.IsInRole("Admin")) return Forbid();

        nomination.Id = 0;
        nomination.LocalUpdatedAt = DateTime.UtcNow;

        _context.Nominations.Add(nomination);

        _events.Add($"Добавлена номинация: {nomination.Title}", "nomination_added");

        await _context.SaveChangesAsync(ct);

        return Ok(nomination);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        if (!User.IsInRole("Admin")) return Forbid();

        var nomination = await _context.Nominations.FindAsync([id], ct);

        if (nomination == null)
            return NotFound();

        var assigned = await _context.StudentNominations
            .Where(sn => sn.NominationId == id)
            .ToListAsync(ct);

        _context.StudentNominations.RemoveRange(assigned);
        _context.Nominations.Remove(nomination);

        _events.Add($"Удалена номинация: {nomination.Title}", "nomination_deleted");

        await _context.SaveChangesAsync(ct);

        return Ok();
    }
}