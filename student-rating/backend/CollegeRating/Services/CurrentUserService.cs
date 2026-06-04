using System.Security.Claims;

namespace CollegeRating.Services;

public class CurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    public CurrentUserService(IHttpContextAccessor httpContextAccessor) => _httpContextAccessor = httpContextAccessor;

    public int? UserId
    {
        get
        {
            var raw = _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }

    public bool IsAdmin => _httpContextAccessor.HttpContext?.User.IsInRole("Admin") == true;
    public bool IsTeacher => _httpContextAccessor.HttpContext?.User.IsInRole("Teacher") == true;
    public bool IsStudent => _httpContextAccessor.HttpContext?.User.IsInRole("Student") == true;
}

