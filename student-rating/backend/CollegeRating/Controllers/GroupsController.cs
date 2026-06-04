using CollegeRating.Data;
using CollegeRating.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers;

[ApiController]
[Route("api/groups")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly DataSyncService _sync;

    public GroupsController(AppDbContext context, DataSyncService sync)
    {
        _context = context;
        _sync = sync;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        await _sync.SyncFromOneCAsync(ct);
        var groups = await _context.Groups
            .OrderBy(g => g.Name)
            .Select(g => new { g.Id, g.Name })
            .ToListAsync(ct);
        return Ok(groups);
    }
}

