using CollegeRating.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeRating.Controllers
{
    [ApiController]
    [Route("api/groups")]
    [Authorize]
    public class GroupsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GroupsController(AppDbContext context) => _context = context;

        [HttpGet]
        public IActionResult GetAll()
        {
            var groups = _context.Groups
                .Select(g => new { g.Id, g.Name })
                .ToList();
            return Ok(groups);
        }
    }
}