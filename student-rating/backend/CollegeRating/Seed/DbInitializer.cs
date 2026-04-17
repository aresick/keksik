using CollegeRating.Models;
using CollegeRating.Data;

namespace CollegeRating.Seed
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            if (context.Groups.Any())
                return;

            // 1. Роли
            var roles = new List<Role>
            {
                new Role { Name = "Student" },
                new Role { Name = "Teacher" },
                new Role { Name = "Admin" }
            };
            context.Roles.AddRange(roles);
            context.SaveChanges();

            // 2. Группы
            var groups = new List<Group>
            {
                new Group { Name = "3ПД-123-о" },
                new Group { Name = "3ПД-223-о" },
                new Group { Name = "3ПД-323-о" },
                new Group { Name = "3ПД-423-о" },
                new Group { Name = "3ПД-523-о" },
                new Group { Name = "3ИСП-223-о" },
                new Group { Name = "3ИСП-323-о" },
                new Group { Name = "3ПКД-123-об" },
                new Group { Name = "3ИСП-23-с" },
                new Group { Name = "3ПКД-23-с" },
                new Group { Name = "3ИСП-123-об" },
                new Group { Name = "3Б-23-о" },
                new Group { Name = "3БД-23-о" },
                new Group { Name = "3ОДЛ-23-о" },
                new Group { Name = "3ЗУ-23-о" },
                new Group { Name = "3ТДио-23-о" },
                new Group { Name = "3ЮРпо-223-о" },
                new Group { Name = "3ТГ-123-об" },
                new Group { Name = "3ТГ-223-о" },
                new Group { Name = "3ПКД-223-о" },
                new Group { Name = "3ЮРсо-223-о" }
            };
            context.Groups.AddRange(groups);
            context.SaveChanges();

            // 3. Студенты
            var students = new List<Student>();
            var studentRoleId = roles.First(r => r.Name == "Student").Id;
            var teacherRoleId = roles.First(r => r.Name == "Teacher").Id;

            foreach (var group in groups)
            {
                for (int i = 1; i <= 25; i++)
                {
                    students.Add(new Student
                    {
                        FullName = $"Студент {i} ({group.Name})",
                        Email = $"student{i}_group{group.Id}@test.com",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                        GroupId = group.Id,
                        RoleId = studentRoleId
                    });
                }
            }

            // Демо-пользователи
            students.Add(new Student
            {
                FullName = "Иван Петров",
                Email = "ivan@student.edu",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("demo"),
                GroupId = groups[0].Id,
                RoleId = studentRoleId
            });
            students.Add(new Student
            {
                FullName = "Алексей Преподаватель",
                Email = "alexey@teacher.edu",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("demo"),
                GroupId = groups[0].Id,
                RoleId = teacherRoleId
            });

            context.Students.AddRange(students);
            context.SaveChanges();

            // 4. Номинации
            var nominations = new List<Nomination>
            {
                new Nomination { Title = "Код-мастер", Type = "motivating", Weight = 1.3m },
                new Nomination { Title = "Идейный генератор", Type = "motivating", Weight = 1.2m },
                new Nomination { Title = "Архитектор решений", Type = "motivating", Weight = 1.15m },
                new Nomination { Title = "Документационный ниндзя", Type = "motivating", Weight = 1.1m },
                new Nomination { Title = "Командный катализатор", Type = "motivating", Weight = 1.05m },
                new Nomination { Title = "Спящий тайфун", Type = "fun", Weight = 0.4m },
                new Nomination { Title = "Стелс-студент", Type = "fun", Weight = 0.45m },
                new Nomination { Title = "Энерджайзер", Type = "fun", Weight = 0.75m }
            };
            context.Nominations.AddRange(nominations);
            context.SaveChanges();

            // 5. Рейтинги (все с нуля)
            var ratings = new List<Rating>();
            foreach (var student in students)
            {
                ratings.Add(new Rating
                {
                    StudentId = student.Id,
                    TotalPoints = 0,
                    LastUpdated = DateTime.UtcNow
                });
            }
            context.Ratings.AddRange(ratings);
            context.SaveChanges();

            // 6. Начальные события для ленты
            var events = new List<ActivityEvent>
            {
                new ActivityEvent { Text = "Система запущена. Добро пожаловать!", CreatedAt = DateTime.UtcNow, EventType = "system" },
                new ActivityEvent { Text = "Добавлены первые номинации", CreatedAt = DateTime.UtcNow.AddMinutes(-5), EventType = "nomination_added" },
                new ActivityEvent { Text = "Группа 3ПД-123-о вышла в лидеры", CreatedAt = DateTime.UtcNow.AddHours(-1), EventType = "group_leader" },
                new ActivityEvent { Text = "Лидер дня: Студент 1 (3ПД-123-о)", CreatedAt = DateTime.UtcNow.AddHours(-2), EventType = "student_top" }
            };
            context.ActivityEvents.AddRange(events);
            context.SaveChanges();
        }
    }
}