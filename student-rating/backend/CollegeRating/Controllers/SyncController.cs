using CollegeRating.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeRating.Controllers;

[ApiController]
[Route("api/sync")]
[Authorize(Roles = "Admin")]
public class SyncController : ControllerBase
{
    private readonly DataSyncService _sync;
    public SyncController(DataSyncService sync) => _sync = sync;

    [HttpPost("1c")]
    public async Task<IActionResult> Sync1C(CancellationToken ct) => Ok(await _sync.SyncFromOneCAsync(ct));
}

