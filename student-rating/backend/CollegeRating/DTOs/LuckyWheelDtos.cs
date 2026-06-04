namespace CollegeRating.DTOs;

public record LuckyPrizeDto(string Id, string Label, int Value, string Tone, string Description);
public record LuckySpinDto(string Id, string Label, int Value, string Date);

public class LuckyWheelStateDto
{
    public IReadOnlyList<LuckyPrizeDto> Prizes { get; set; } = Array.Empty<LuckyPrizeDto>();
    public IReadOnlyList<LuckySpinDto> History { get; set; } = Array.Empty<LuckySpinDto>();
    public IReadOnlyList<LuckySpinDto> Leaders { get; set; } = Array.Empty<LuckySpinDto>();
    public LuckySpinDto? TodaySpin { get; set; }
    public int Total { get; set; }
}

