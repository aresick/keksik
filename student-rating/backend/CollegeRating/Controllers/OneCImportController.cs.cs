using CollegeRating.Data;
using CollegeRating.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers
{
    [ApiController]
    [Route("api/import/1c")]
    [AllowAnonymous]
    public class OneCImportController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public OneCImportController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost]
        public async Task<IActionResult> Import([FromBody] OneCImportDto dto, CancellationToken ct)
        {
            var expectedKey = _configuration["OneCImport:Key"];

            // var expectedKey = _configuration["OneCImport:Key"];
            //
            // if (!string.IsNullOrWhiteSpace(expectedKey))
            // {
            //     var actualKey = Request.Headers["X-Import-Key"].FirstOrDefault();
            //
            //     if (actualKey != expectedKey)
            //         return Unauthorized(new { message = "Неверный ключ импорта" });
            // }

            var now = DateTime.UtcNow;

            var studentRole = await EnsureRoleAsync("Student", ct);
            var teacherRole = await EnsureRoleAsync("Teacher", ct);
            var adminRole = await EnsureRoleAsync("Admin", ct);

            await ImportGroupsAsync(dto.Groups, now, ct);
            await ImportStudentsAsync(dto.Students, studentRole.Id, now, ct);
            await ImportTeachersAsync(dto.Teachers, teacherRole.Id, now, ct);
            await ImportNominationsAsync(dto.Nominations, now, ct);

            await EnsureAdminAsync(adminRole.Id, ct);
            await EnsureRatingsAsync(ct);

            await _context.SaveChangesAsync(ct);

            return Ok(new
            {
                message = "Данные из 1С успешно импортированы",
                groups = dto.Groups.Count,
                students = dto.Students.Count,
                teachers = dto.Teachers.Count,
                nominations = dto.Nominations.Count
            });
        }

        private async Task<Role> EnsureRoleAsync(string name, CancellationToken ct)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == name, ct);

            if (role != null)
                return role;

            role = new Role { Name = name };
            _context.Roles.Add(role);
            await _context.SaveChangesAsync(ct);

            return role;
        }

        private async Task ImportGroupsAsync(List<OneCGroupDto> groups, DateTime now, CancellationToken ct)
        {
            foreach (var item in groups)
            {
                if (string.IsNullOrWhiteSpace(item.ExternalId) || string.IsNullOrWhiteSpace(item.Name))
                    continue;

                var group = await _context.Groups
                    .FirstOrDefaultAsync(g => g.ExternalId == item.ExternalId, ct);

                if (group == null)
                {
                    group = new Group
                    {
                        ExternalId = item.ExternalId,
                        Name = item.Name.Trim(),
                        SourceUpdatedAt = item.UpdatedAt ?? now,
                        LocalUpdatedAt = now
                    };

                    _context.Groups.Add(group);
                }
                else
                {
                    var sourceDate = item.UpdatedAt ?? now;

                    if (group.LocalUpdatedAt == null || sourceDate >= group.LocalUpdatedAt)
                    {
                        group.Name = item.Name.Trim();
                        group.SourceUpdatedAt = sourceDate;
                    }
                }
            }

            await _context.SaveChangesAsync(ct);
        }

        private async Task ImportStudentsAsync(List<OneCStudentDto> students, int roleId, DateTime now, CancellationToken ct)
        {
            foreach (var item in students)
            {
                if (string.IsNullOrWhiteSpace(item.ExternalId))
                    continue;

                var group = await _context.Groups
                    .FirstOrDefaultAsync(g => g.ExternalId == item.GroupExternalId, ct);

                if (group == null)
                {
                    group = await _context.Groups.FirstOrDefaultAsync(ct);
                }

                if (group == null)
                    continue;

                var fullName = BuildFullName(item.LastName, item.FirstName, item.MiddleName);

                if (string.IsNullOrWhiteSpace(fullName))
                    fullName = "Студент без ФИО";

                var email = NormalizeLoginToEmail(item.Login, "student.local");

                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.ExternalId == item.ExternalId, ct);

                if (student == null)
                {
                    student = new Student
                    {
                        ExternalId = item.ExternalId,
                        FullName = fullName,
                        Email = email,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("demo"),
                        GroupId = group.Id,
                        RoleId = roleId,
                        SourceUpdatedAt = item.UpdatedAt ?? now,
                        LocalUpdatedAt = now
                    };

                    _context.Students.Add(student);
                }
                else
                {
                    var sourceDate = item.UpdatedAt ?? now;

                    if (student.LocalUpdatedAt == null || sourceDate >= student.LocalUpdatedAt)
                    {
                        student.FullName = fullName;
                        student.Email = email;
                        student.GroupId = group.Id;
                        student.RoleId = roleId;
                        student.SourceUpdatedAt = sourceDate;
                    }
                }
            }

            await _context.SaveChangesAsync(ct);
        }

        private async Task ImportTeachersAsync(List<OneCTeacherDto> teachers, int roleId, DateTime now, CancellationToken ct)
        {
            var defaultGroup = await _context.Groups.FirstOrDefaultAsync(ct);

            if (defaultGroup == null)
                return;

            foreach (var item in teachers)
            {
                if (string.IsNullOrWhiteSpace(item.ExternalId))
                    continue;

                var fullName = BuildFullName(item.LastName, item.FirstName, item.MiddleName);

                if (string.IsNullOrWhiteSpace(fullName))
                    fullName = "Преподаватель";

                var email = NormalizeLoginToEmail(item.Login, "teacher.local");

                var teacher = await _context.Students
                    .FirstOrDefaultAsync(s => s.ExternalId == item.ExternalId, ct);

                if (teacher == null)
                {
                    teacher = new Student
                    {
                        ExternalId = item.ExternalId,
                        FullName = fullName,
                        Email = email,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("demo"),
                        GroupId = defaultGroup.Id,
                        RoleId = roleId,
                        SourceUpdatedAt = item.UpdatedAt ?? now,
                        LocalUpdatedAt = now
                    };

                    _context.Students.Add(teacher);
                }
                else
                {
                    var sourceDate = item.UpdatedAt ?? now;

                    if (teacher.LocalUpdatedAt == null || sourceDate >= teacher.LocalUpdatedAt)
                    {
                        teacher.FullName = fullName;
                        teacher.Email = email;
                        teacher.GroupId = defaultGroup.Id;
                        teacher.RoleId = roleId;
                        teacher.SourceUpdatedAt = sourceDate;
                    }
                }
            }

            await _context.SaveChangesAsync(ct);
        }

        private async Task ImportNominationsAsync(List<OneCNominationDto> nominations, DateTime now, CancellationToken ct)
        {
            foreach (var item in nominations)
            {
                if (string.IsNullOrWhiteSpace(item.ExternalId) || string.IsNullOrWhiteSpace(item.Title))
                    continue;

                var nomination = await _context.Nominations
                    .FirstOrDefaultAsync(n => n.ExternalId == item.ExternalId, ct);

                var type = NormalizeNominationType(item.Type);
                var weight = item.Weight <= 0 ? 1 : item.Weight;

                if (nomination == null)
                {
                    nomination = new Nomination
                    {
                        ExternalId = item.ExternalId,
                        Title = item.Title.Trim(),
                        Type = type,
                        Weight = weight,
                        SourceUpdatedAt = item.UpdatedAt ?? now,
                        LocalUpdatedAt = now
                    };

                    _context.Nominations.Add(nomination);
                }
                else
                {
                    var sourceDate = item.UpdatedAt ?? now;

                    if (nomination.LocalUpdatedAt == null || sourceDate >= nomination.LocalUpdatedAt)
                    {
                        nomination.Title = item.Title.Trim();
                        nomination.Type = type;
                        nomination.Weight = weight;
                        nomination.SourceUpdatedAt = sourceDate;
                    }
                }
            }

            await _context.SaveChangesAsync(ct);
        }

        private async Task EnsureRatingsAsync(CancellationToken ct)
        {
            var studentIds = await _context.Students
                .Select(s => s.Id)
                .ToListAsync(ct);

            var ratedIds = await _context.Ratings
                .Select(r => r.StudentId)
                .ToListAsync(ct);

            var missing = studentIds
                .Except(ratedIds)
                .Select(id => new Rating
                {
                    StudentId = id,
                    TotalPoints = 0,
                    LastUpdated = DateTime.UtcNow
                })
                .ToList();

            if (missing.Count > 0)
                _context.Ratings.AddRange(missing);
        }

        private async Task EnsureAdminAsync(int adminRoleId, CancellationToken ct)
        {
            if (await _context.Students.AnyAsync(s => s.Email == "admin@college.edu", ct))
                return;

            var group = await _context.Groups.FirstOrDefaultAsync(ct);

            if (group == null)
                return;

            _context.Students.Add(new Student
            {
                FullName = "Админ Колледжа",
                Email = "admin@college.edu",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("demo"),
                GroupId = group.Id,
                RoleId = adminRoleId,
                LocalUpdatedAt = DateTime.UtcNow
            });
        }

        private static string BuildFullName(string? lastName, string? firstName, string? middleName)
        {
            return $"{lastName} {firstName} {middleName}"
                .Replace("  ", " ")
                .Trim();
        }

        private static string NormalizeLoginToEmail(string? login, string domain)
        {
            if (string.IsNullOrWhiteSpace(login))
                return $"{Guid.NewGuid():N}@{domain}";

            login = login.Trim();

            if (login.Contains("@"))
                return login;

            return $"{login}@{domain}";
        }

        private static string NormalizeNominationType(string? type)
        {
            var value = type?.Trim().ToLowerInvariant() ?? "";

            if (value.Contains("шут") || value == "fun")
                return "fun";

            return "motivating";
        }
    }

    public class OneCImportDto
    {
        public List<OneCGroupDto> Groups { get; set; } = new();
        public List<OneCStudentDto> Students { get; set; } = new();
        public List<OneCTeacherDto> Teachers { get; set; } = new();
        public List<OneCNominationDto> Nominations { get; set; } = new();
    }

    public class OneCGroupDto
    {
        public string ExternalId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime? UpdatedAt { get; set; }
    }

    public class OneCStudentDto
    {
        public string ExternalId { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string MiddleName { get; set; } = string.Empty;
        public string GroupExternalId { get; set; } = string.Empty;
        public string Login { get; set; } = string.Empty;
        public DateTime? UpdatedAt { get; set; }
    }

    public class OneCTeacherDto
    {
        public string ExternalId { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string MiddleName { get; set; } = string.Empty;
        public string Login { get; set; } = string.Empty;
        public DateTime? UpdatedAt { get; set; }
    }

    public class OneCNominationDto
    {
        public string ExternalId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Weight { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}