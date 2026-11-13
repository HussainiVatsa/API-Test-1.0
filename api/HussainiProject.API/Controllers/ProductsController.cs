using HussainiProject.API.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HussainiProject.API.Controllers
{
    // Defines the route for this controller as "api/products"
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly ShopContext _context;

        // Constructor to inject the ShopContext dependency
        public ProductsController(ShopContext context)
        {
            _context = context;
            
            // Ensures the database is created, if it does not exist
            _context.Database.EnsureCreated();
        }

        // GET: api/products
        [HttpGet]
        public async Task<ActionResult> GetAllProducts()
        {
            // Asynchronously fetches all products from the database and returns them
            return Ok(await _context.Products
                .Include(product => product.Options)
                .ToArrayAsync());
        }

        // GET: api/products/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult> GetProduct(int id)
        {
            var product = await _context.Products
                .Include(item => item.Options)
                .FirstOrDefaultAsync(item => item.Id == id);
            if (product == null)
            {
                // Returns 404 if the product is not found
                return NotFound();
            }
            // Returns the product if found
            return Ok(product);
        }

        // POST: api/products
        [HttpPost]
        public async Task<ActionResult<Product>> PostProduct(Product product)
        {
            if (product.Options == null || product.Options.Count == 0)
            {
                product.Options = new List<ProductOption>
                {
                    new() { Name = "Standard", Price = product.Price }
                };
            }
            if (HasDuplicateOptionNames(product.Options))
            {
                return BadRequest("Product option names must be unique.");
            }
            product.Price = product.Options.Min(option => option.Price);

            /*
            // Validates the model state, uncomment if you have validation rules
            if (!ModelState.IsValid) {
                return BadRequest();
            }
            */
            // Adds the new product to the context
            _context.Products.Add(product);
            // Saves the changes to the database
            await _context.SaveChangesAsync();

            // Returns a 201 Created response with a link to the newly created product
            return CreatedAtAction(
                "GetProduct",
                new { id = product.Id },
                product);
        }

        // PUT: api/products/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult> PutProduct(int id, Product product)
        {
            // Checks if the provided ID matches the product's ID
            if (id != product.Id)
            {
                return BadRequest();
            }
            if (product.Options != null && HasDuplicateOptionNames(product.Options))
            {
                return BadRequest("Product option names must be unique.");
            }

            var existingProduct = await _context.Products
                .Include(item => item.Options)
                .FirstOrDefaultAsync(item => item.Id == id);
            if (existingProduct == null)
            {
                return NotFound();
            }

            existingProduct.Sku = product.Sku;
            existingProduct.Name = product.Name;
            existingProduct.Description = product.Description;
            existingProduct.IsAvailable = product.IsAvailable;
            existingProduct.ImageUrl = product.ImageUrl;
            existingProduct.CategoryId = product.CategoryId;

            if (product.Options != null && product.Options.Count > 0)
            {
                _context.ProductOptions.RemoveRange(existingProduct.Options);
                existingProduct.Options = product.Options.Select(option => new ProductOption
                {
                    Name = option.Name.Trim(),
                    Price = option.Price,
                    ProductId = id
                }).ToList();
            }
            else
            {
                foreach (var option in existingProduct.Options)
                {
                    option.Price = product.Price;
                }
            }

            existingProduct.Price = existingProduct.Options.Count > 0
                ? existingProduct.Options.Min(option => option.Price)
                : product.Price;
            await _context.SaveChangesAsync();

            // Returns 204 No Content if successful
            return NoContent();
        }

        private static bool HasDuplicateOptionNames(IEnumerable<ProductOption> options)
        {
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            return options.Any(option =>
                string.IsNullOrWhiteSpace(option.Name) ||
                !names.Add(option.Name.Trim()));
        }

        // DELETE: api/products/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult<Product>> DeleteProduct(int id)
        {
            // Finds the product by ID
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                // Returns 404 if the product is not found
                return NotFound();
            }

            // Removes the product from the context
            _context.Products.Remove(product);
            // Saves the changes to the database
            await _context.SaveChangesAsync();

            // Returns the deleted product
            return product;
        }

        // POST: api/products/Delete?ids=1&ids=2&ids=3
        [HttpPost]
        [Route("Delete")]
        public async Task<ActionResult> DeleteMultiple([FromQuery] int[] ids)
        {
            var products = new List<Product>();
            foreach (var id in ids)
            {
                var product = await _context.Products.FindAsync(id);

                if (product == null)
                {
                    return NotFound();
                }

                // Adds the product to the list of products to be deleted
                products.Add(product);
            }

            // Removes all the products in the list from the context
            _context.Products.RemoveRange(products);
            // Saves the changes to the database
            await _context.SaveChangesAsync();

            // Returns the deleted products
            return Ok(products);
        }
    }
}
