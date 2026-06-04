using CollegeRating.Data;
using CollegeRating.DTOs;
using CollegeRating.Models;
using Microsoft.EntityFrameworkCore;
using System;

namespace CollegeRating.Services;

public class DataSyncService
{
    private readonly AppDbContext _context;
    private readonly ICollegeSource _source;
    private readonly ILogger<DataSyncService> _logger;

    public DataSyncService(AppDbContext context, ICollegeSource source, ILogger<DataSyncService> logger)
    {
        _context = context;
        _source = source;
        _logger = logger;
    }

    // Вызывается перед публичными GET. 1С читается, SQLite обновляется только если 1С новее.
    public async Task<SyncResult> SyncFromOneCAsync(CancellationToken ct = default)
    {
        var groups = await SyncGroupsAsync(ct);
        var students = await SyncStudentsAsync(ct);
        var nominations = await SyncNominationsAsync(ct);
        var ratings = await SyncRatingsAsync(ct);

        await _context.SaveChangesAsync(ct);
        return new SyncResult(groups, students, ratings, nominations, _source.SourceName);
    }

    private async Task<int> SyncGroupsAsync(CancellationToken ct)
    {
        var rows = await _source.GetGroupsAsync(ct);
        var changed = 0;
        foreach (var row in rows)
        {
            var group = await _context.Groups.FirstOrDefaultAsync(g => g.ExternalId == row.ExternalId, ct)
                ?? await _context.Groups.FirstOrDefaultAsync(g => g.Name == row.Name, ct);

            if (group == null)
            {
                _context.Groups.Add(new Group
                {
                    Name = row.Name,
                    ExternalId = row.ExternalId,
                    SourceUpdatedAt = row.UpdatedAt,
                    LocalUpdatedAt = DateTime.UtcNow
                });
                changed++;
                continue;
            }

            if (row.UpdatedAt > group.LocalUpdatedAt && row.UpdatedAt > group.SourceUpdatedAt)
            {
                group.Name = row.Name;
                group.ExternalId ??= row.ExternalId;
                group.SourceUpdatedAt = row.UpdatedAt;
                changed++;
            }
        }
        return changed;
    }

    private async Task<int> SyncStudentsAsync(CancellationToken ct)
    {
        var rows = await _source.GetStudentsAsync(ct);
        var changed = 0;

        foreach (var row in rows)
        {
            var group = await _context.Groups.FirstOrDefaultAsync(g => g.ExternalId == row.GroupExternalId, ct)
                ?? await _context.Groups.FirstOrDefaultAsync(g => g.Name == row.GroupExternalId, ct);
            if (group == null) continue;

            var role = await EnsureRoleAsync(row.RoleName, ct);
            var student = await _context.Students.FirstOrDefaultAsync(s => s.ExternalId == row.ExternalId, ct)
                ?? await _context.Students.FirstOrDefaultAsync(s => s.Email == row.Email, ct);

            if (student == null)
            {
                _context.Students.Add(new Student
                {
                    FullName = row.FullName,
                    Email = row.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("demo"),
                    GroupId = group.Id,
                    RoleId = role.Id,
                    ExternalId = row.ExternalId,
                    SourceUpdatedAt = row.UpdatedAt,
                    LocalUpdatedAt = DateTime.UtcNow
                });
                changed++;
                continue;
            }

            if (row.UpdatedAt > student.LocalUpdatedAt && row.UpdatedAt > student.SourceUpdatedAt)
            {
                student.FullName = row.FullName;
                student.Email = row.Email;
                student.GroupId = group.Id;
                student.RoleId = role.Id;
                student.ExternalId ??= row.ExternalId;
                student.SourceUpdatedAt = row.UpdatedAt;
                changed++;
            }
        }
        return changed;
    }

    private async Task<int> SyncRatingsAsync(CancellationToken ct)
    {
        var rows = await _source.GetRatingsAsync(ct);
        var changed = 0;

        foreach (var row in rows)
        {
            var student = await _context.Students
                .Include(s => s.Rating)
                .FirstOrDefaultAsync(s => s.ExternalId == row.StudentExternalId, ct);
            if (student == null) continue;

            if (student.Rating == null)
            {
                student.Rating = new Rating
                {
                    StudentId = student.Id,
                    TotalPoints = row.TotalPoints,
                    SourceUpdatedAt = row.UpdatedAt,
                    LocalUpdatedAt = DateTime.MinValue,
                    LastUpdated = row.UpdatedAt
                };
                _context.Ratings.Add(student.Rating);
                changed++;
                continue;
            }

            // Главное правило: сайт использует более свежую запись.
            if (row.UpdatedAt > student.Rating.LocalUpdatedAt && row.UpdatedAt > student.Rating.SourceUpdatedAt)
            {
                student.Rating.TotalPoints = row.TotalPoints;
                student.Rating.SourceUpdatedAt = row.UpdatedAt;
                student.Rating.LastUpdated = row.UpdatedAt;
                changed++;
            }
        }
        return changed;
    }

    private async Task<int> SyncNominationsAsync(CancellationToken ct)
    {
        var rows = await _source.GetNominationsAsync(ct);
        var changed = 0;

        foreach (var row in rows)
        {
            var nomination = await _context.Nominations.FirstOrDefaultAsync(n => n.ExternalId == row.ExternalId, ct)
                ?? await _context.Nominations.FirstOrDefaultAsync(n => n.Title == row.Title, ct);

            if (nomination == null)
            {
                _context.Nominations.Add(new Nomination
                {
                    Title = row.Title,
                    Type = row.Type,
                    Weight = row.Weight,
                    ExternalId = row.ExternalId,
                    SourceUpdatedAt = row.UpdatedAt,
                    LocalUpdatedAt = DateTime.UtcNow
                });
                changed++;
                continue;
            }

            if (row.UpdatedAt > nomination.LocalUpdatedAt && row.UpdatedAt > nomination.SourceUpdatedAt)
            {
                nomination.Title = row.Title;
                nomination.Type = row.Type;
                nomination.Weight = row.Weight;
                nomination.ExternalId ??= row.ExternalId;
                nomination.SourceUpdatedAt = row.UpdatedAt;
                changed++;
            }
        }
        return changed;
    }

    private async Task<Role> EnsureRoleAsync(string roleName, CancellationToken ct)
    {
        roleName = string.IsNullOrWhiteSpace(roleName) ? "Student" : roleName.Trim();
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName, ct);
        if (role != null) return role;

        role = new Role { Name = roleName };
        _context.Roles.Add(role);
        await _context.SaveChangesAsync(ct);
        return role;
    }
}

