namespace CollegeRating.Models;

public class Rating
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public Student Student { get; set; } = null!;

    // Итоговые баллы, которые использует сайт. Если 1С новее — значение обновляется синхронизацией.
    public decimal TotalPoints { get; set; }

    // LastUpdated оставлен для совместимости со старым кодом.
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    // Дата изменения рейтинга в 1С и в SQLite. На чтении выбираем более свежую.
    public DateTime SourceUpdatedAt { get; set; } = DateTime.MinValue;
    public DateTime LocalUpdatedAt { get; set; } = DateTime.UtcNow;
}

