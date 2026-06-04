using CollegeRating.Models;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Data;

public class AppDbContext : DbContext
{
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<Nomination> Nominations => Set<Nomination>();
    public DbSet<StudentNomination> StudentNominations => Set<StudentNomination>();
    public DbSet<ActivityEvent> ActivityEvents => Set<ActivityEvent>();
    public DbSet<ApprovalRequest> ApprovalRequests => Set<ApprovalRequest>();
    public DbSet<LuckyWheelSpin> LuckyWheelSpins => Set<LuckyWheelSpin>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Student>()
            .HasOne(s => s.Rating)
            .WithOne(r => r.Student)
            .HasForeignKey<Rating>(r => r.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Student>()
            .HasIndex(s => s.Email)
            .IsUnique();

        modelBuilder.Entity<Student>()
            .HasIndex(s => s.ExternalId)
            .IsUnique()
            .HasFilter("ExternalId IS NOT NULL");

        modelBuilder.Entity<Group>()
            .HasIndex(g => g.ExternalId)
            .IsUnique()
            .HasFilter("ExternalId IS NOT NULL");

        modelBuilder.Entity<Rating>()
            .Property(r => r.TotalPoints)
            .HasConversion<double>();

        modelBuilder.Entity<ApprovalRequest>()
            .Property(r => r.Points)
            .HasConversion<double?>();

        modelBuilder.Entity<ApprovalRequest>()
            .Property(r => r.NominationWeight)
            .HasConversion<double?>();

        modelBuilder.Entity<Nomination>()
            .Property(n => n.Weight)
            .HasConversion<double>();

        modelBuilder.Entity<LuckyWheelSpin>()
            .HasIndex(s => new { s.StudentId, s.SpinDate })
            .IsUnique();
    }
}

