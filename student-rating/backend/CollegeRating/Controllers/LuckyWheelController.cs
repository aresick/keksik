using CollegeRating.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeRating.Controllers;

[ApiController]
[Route("api/lucky-wheel")]
[Authorize]
public class LuckyWheelController : ControllerBase
{
    private readonly LuckyWheelService _service;
    private readonly CurrentUserService _currentUser;

    public LuckyWheelController(LuckyWheelService service, CurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetState(CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        return Ok(await _service.GetStateAsync(_currentUser.UserId.Value, ct));
    }

    [HttpPost("spin")]
    public async Task<IActionResult> Spin(CancellationToken ct)
    {
        if (!_currentUser.IsStudent) return Forbid();
        if (_currentUser.UserId == null) return Unauthorized();

        try
        {
            return Ok(await _service.SpinAsync(_currentUser.UserId.Value, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("leaders")]
    [AllowAnonymous]
    public async Task<IActionResult> Leaders(CancellationToken ct) => Ok(await _service.GetLeadersAsync(ct));
}

