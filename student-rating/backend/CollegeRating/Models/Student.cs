using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Text.RegularExpressions;

namespace CollegeRating.Models
{
    public class Student
    {
        public int Id { get; set; }
        [Required] public string FullName { get; set; } = string.Empty;
        [Required] public string Email { get; set; } = string.Empty;
        [Required] public string PasswordHash { get; set; } = string.Empty;
        public int GroupId { get; set; }
        public Group Group { get; set; } = null!;
        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;
        public Rating? Rating { get; set; }
    }
}