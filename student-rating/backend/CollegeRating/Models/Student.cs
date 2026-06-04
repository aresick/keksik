using System.ComponentModel.DataAnnotations;

namespace CollegeRating.Models;

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

    public string? ExternalId { get; set; }
    public DateTime SourceUpdatedAt { get; set; } = DateTime.MinValue;
    public DateTime LocalUpdatedAt { get; set; } = DateTime.UtcNow;
}

