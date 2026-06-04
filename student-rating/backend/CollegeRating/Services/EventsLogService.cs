using CollegeRating.Data;
using CollegeRating.Models;

namespace CollegeRating.Services;

public class EventLogService
{
    private readonly AppDbContext _context;
    public EventLogService(AppDbContext context) => _context = context;

    public void Add(string text, string eventType = "general")
    {
        _context.ActivityEvents.Add(new ActivityEvent
        {
            Text = text,
            EventType = eventType,
            CreatedAt = DateTime.UtcNow
        });
    }
}

