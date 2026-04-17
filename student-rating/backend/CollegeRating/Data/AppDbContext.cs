using CollegeRating.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Reflection.Emit;

namespace CollegeRating.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<Student> Students { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Rating> Ratings { get; set; }
        public DbSet<Nomination> Nominations { get; set; }
        public DbSet<StudentNomination> StudentNominations { get; set; }
        public DbSet<ActivityEvent> ActivityEvents { get; set; }

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Student>()
                .HasOne(s => s.Rating)
                .WithOne(r => r.Student)
                .HasForeignKey<Rating>(r => r.StudentId);
        }
    }
}