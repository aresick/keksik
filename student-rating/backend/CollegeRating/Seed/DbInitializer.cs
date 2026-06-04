using CollegeRating.Data;
using CollegeRating.Models;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Seed;

public static class DbInitializer
{
    public static void Initialize(AppDbContext context)
    {
        context.Database.Migrate();

        if (!context.Roles.Any())
        {
            context.Roles.AddRange(
                new Role { Name = "Student" },
                new Role { Name = "Teacher" },
                new Role { Name = "Admin" });
            context.SaveChanges();
        }

        if (!context.Groups.Any())
        {
            var groups = new[]
            {
                "3ПД-123-о", "3ПД-223-о", "3ПД-323-о", "3ПД-423-о", "3ПД-523-о",
                "3ИСП-223-о", "3ИСП-323-о", "3ПКД-123-об", "3ИСП-23-с", "3ПКД-23-с",
                "3ИСП-123-об", "3Б-23-о", "3БД-23-о", "3ОДЛ-23-о", "3ЗУ-23-о",
                "3ТДио-23-о", "3ЮРпо-223-о", "3ТГ-123-об", "3ТГ-223-о", "3ПКД-223-о", "3ЮРсо-223-о"
            }.Select(name => new Group { Name = name, LocalUpdatedAt = DateTime.UtcNow });
            context.Groups.AddRange(groups);
            context.SaveChanges();
        }

        var studentRole = context.Roles.First(r => r.Name == "Student");
        var teacherRole = context.Roles.First(r => r.Name == "Teacher");
        var adminRole = context.Roles.First(r => r.Name == "Admin");
        var firstGroup = context.Groups.First();

        EnsureUser(context, "Иван Петров", "ivan@student.edu", "demo", firstGroup.Id, studentRole.Id);
        EnsureUser(context, "Алексей Преподаватель", "alexey@teacher.edu", "demo", firstGroup.Id, teacherRole.Id);
        EnsureUser(context, "Админ Колледжа", "admin@college.edu", "demo", firstGroup.Id, adminRole.Id);

        if (!context.Nominations.Any())
        {
            context.Nominations.AddRange(
                new Nomination { Title = "Код-мастер", Type = "motivating", Weight = 1.3m },
                new Nomination { Title = "Идейный генератор", Type = "motivating", Weight = 1.2m },
                new Nomination { Title = "Архитектор решений", Type = "motivating", Weight = 1.15m },
                new Nomination { Title = "Документационный ниндзя", Type = "motivating", Weight = 1.1m },
                new Nomination { Title = "Командный катализатор", Type = "motivating", Weight = 1.05m },
                new Nomination { Title = "Спящий тайфун", Type = "fun", Weight = 0.4m },
                new Nomination { Title = "Стелс-студент", Type = "fun", Weight = 0.45m },
                new Nomination { Title = "Энерджайзер", Type = "fun", Weight = 0.75m });
            context.SaveChanges();
        }

        if (!context.ActivityEvents.Any())
        {
            context.ActivityEvents.Add(new ActivityEvent { Text = "Система запущена. Добро пожаловать!", EventType = "system" });
            context.SaveChanges();
        }
    }

    private static void EnsureUser(AppDbContext context, string name, string email, string password, int groupId, int roleId)
    {
        var user = context.Students.Include(s => s.Rating).FirstOrDefault(s => s.Email == email);
        if (user == null)
        {
            user = new Student
            {
                FullName = name,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                GroupId = groupId,
                RoleId = roleId,
                LocalUpdatedAt = DateTime.UtcNow
            };
            context.Students.Add(user);
            context.SaveChanges();
        }

        if (user.Rating == null)
        {
            context.Ratings.Add(new Rating { StudentId = user.Id, TotalPoints = 0, LocalUpdatedAt = DateTime.UtcNow });
            context.SaveChanges();
        }
    }
}

