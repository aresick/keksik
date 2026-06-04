using CollegeRating.Data;
using CollegeRating.DTOs;
using CollegeRating.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly JwtService _jwtService;

        public AuthController(AppDbContext context, JwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        [HttpPost("login")]
        public IActionResult Login(LoginRequest request)
        {
            var user = _context.Students
                .Include(s => s.Role)
                .Include(s => s.Group)
                .FirstOrDefault(x => x.Email == request.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new { message = "Неверный логин или пароль" });

            var token = _jwtService.GenerateToken(user);

            return Ok(new
            {
                token,
                user = new
                {
                    id = user.Id,
                    fullName = user.FullName,
                    email = user.Email,
                    role = user.Role.Name.ToLower(),
                    initials = string.Concat(user.FullName.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                                              .Where(w => char.IsLetter(w[0]))
                                              .Select(w => char.ToUpper(w[0])))
                }
            });
        }
    }
}