using CollegeRating.Data;
using CollegeRating.DTOs;
using CollegeRating.Models;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Services;

public class LuckyWheelService
{
    private readonly AppDbContext _context;
    private readonly EventLogService _events;
    private static readonly Random Random = new();

    private static readonly LuckyPrizeDto[] Prizes =
    {
        new("spark", "+5 искр", 5, "#2dd4bf", "Бодрый старт для личной игровой серии."),
        new("focus", "+8 фокуса", 8, "#fbbf24", "Сегодня концентрация явно на твоей стороне."),
        new("combo", "+12 комбо", 12, "#8b5cf6", "Красивый выпад: почти маленький джекпот."),
        new("badge", "Бейдж дня", 10, "#38bdf8", "Витринный бонус для личного профиля."),
        new("boost", "+15 буст", 15, "#34d399", "Сильный прокрут, можно гордиться."),
        new("quest", "Мини-квест", 7, "#f472b6", "Колесо просит сделать маленький шаг к победе."),
        new("lucky", "+20 удачи", 20, "#f59e0b", "Редкий сочный бонус для игрового зачета."),
        new("calm", "+3 дзен", 3, "#93c5fd", "Небольшой, но приятный спокойный выигрыш.")
    };

    public LuckyWheelService(AppDbContext context, EventLogService events)
    {
        _context = context;
        _events = events;
    }

    public async Task<LuckyWheelStateDto> GetStateAsync(int studentId, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var spins = await _context.LuckyWheelSpins
            .Where(s => s.StudentId == studentId)
            .OrderByDescending(s => s.CreatedAt)
            .Take(7)
            .ToListAsync(ct);

        var total = await _context.LuckyWheelSpins
            .Where(s => s.StudentId == studentId)
            .SumAsync(s => s.Value, ct);

        return new LuckyWheelStateDto
        {
            Prizes = Prizes,
            History = spins.Select(ToDto).ToList(),
            TodaySpin = spins.FirstOrDefault(s => s.SpinDate == today) is { } todaySpin ? ToDto(todaySpin) : null,
            Total = total,
            Leaders = await GetLeadersAsync(ct)
        };
    }

    public async Task<LuckySpinDto> SpinAsync(int studentId, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var exists = await _context.LuckyWheelSpins.AnyAsync(s => s.StudentId == studentId && s.SpinDate == today, ct);
        if (exists) throw new InvalidOperationException("Сегодня колесо уже крутили");

        var prize = Prizes[Random.Next(Prizes.Length)];
        var spin = new LuckyWheelSpin
        {
            StudentId = studentId,
            PrizeCode = prize.Id,
            Label = prize.Label,
            Value = prize.Value,
            SpinDate = today,
            CreatedAt = DateTime.UtcNow
        };

        _context.LuckyWheelSpins.Add(spin);
        _events.Add($"Студент прокрутил колесо удачи и получил {prize.Label}", "lucky_wheel");
        await _context.SaveChangesAsync(ct);
        return ToDto(spin);
    }

    public async Task<IReadOnlyList<LuckySpinDto>> GetLeadersAsync(CancellationToken ct = default)
    {
        return await _context.LuckyWheelSpins
            .GroupBy(s => new { s.StudentId, s.Student.FullName })
            .Select(g => new { g.Key.StudentId, g.Key.FullName, Value = g.Sum(x => x.Value) })
            .OrderByDescending(x => x.Value)
            .Take(5)
            .Select(x => new LuckySpinDto($"wheel-{x.StudentId}", x.FullName, x.Value, "топ недели"))
            .ToListAsync(ct);
    }

    private static LuckySpinDto ToDto(LuckyWheelSpin spin) =>
        new(spin.Id.ToString(), spin.Label, spin.Value, spin.SpinDate);
}

