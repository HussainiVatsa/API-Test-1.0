using HussainiProject.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HussainiProject.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly ShopContext _context;

        public CategoriesController(ShopContext context)
        {
            _context = context;
            _context.Database.EnsureCreated();
        }

        [HttpGet]
        public async Task<ActionResult> GetAllCategories()
        {
            var categories = await _context.Categories
                .AsNoTracking()
                .OrderBy(category => category.Id)
                .Select(category => new { category.Id, category.Name })
                .ToArrayAsync();

            return Ok(categories);
        }
    }
}
