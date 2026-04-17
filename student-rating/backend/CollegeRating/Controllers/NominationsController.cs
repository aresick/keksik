using CollegeRating.Data;
using CollegeRating.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeRating.Controllers
{
    [ApiController]
    [Route("api/nominations")]
    [Authorize]
    public class NominationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NominationsController(AppDbContext context) => _context = context;

        [HttpGet]
        public IActionResult GetAll() => Ok(_context.Nominations.ToList());

        [HttpPost]
        public IActionResult Create([FromBody] Nomination nomination)
        {
            _context.Nominations.Add(nomination);
            _context.SaveChanges();
            EventsController.AddEvent(_context, $"Добавлена номинация: {nomination.Title}", "nomination_added");
            return Ok(nomination);
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            var nom = _context.Nominations.Find(id);
            if (nom == null) return NotFound();
            _context.Nominations.Remove(nom);
            _context.SaveChanges();
            return Ok();
        }
    }
}