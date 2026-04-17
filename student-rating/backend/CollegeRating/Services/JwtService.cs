using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using CollegeRating.Models;

namespace CollegeRating.Services
{
    public class JwtService
    {
        private readonly IConfiguration _config;
        public JwtService(IConfiguration config) => _config = config;

        public string GenerateToken(Student user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.Name, user.Email),
                new Claim(ClaimTypes.Role, user.RoleId.ToString())
            };
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                expires: DateTime.Now.AddDays(1),
                claims: claims,
                signingCredentials: creds);
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}