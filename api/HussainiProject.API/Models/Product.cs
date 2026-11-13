using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HussainiProject.API.Models
{
    public class Product
    {
        // Unique identifier for the product
        public int Id { get; set; }

        // SKU (Stock Keeping Unit) is required and has a default value of an empty string
        [Required]
        public string Sku { get; set; } = string.Empty;

        // Name of the product is required and has a default value of an empty string
        [Required]
        public string Name { get; set; } = string.Empty;

        // Description of the product is required and has a default value of an empty string
        [Required]
        public string Description { get; set; } = string.Empty;

        // Price of the product
        public decimal Price { get; set; }

        // Availability status of the product
        public bool IsAvailable { get; set; }

        // Relative URL of the product image served by the client
        public string ImageUrl { get; set; } = string.Empty;

        // Foreign key for the Category entity, required
        [Required]
        public int CategoryId { get; set; }

        public virtual List<ProductOption> Options { get; set; } = new();

        // Navigation property for the Category, ignored during JSON serialization to prevent circular references
        [JsonIgnore]
        public virtual Category? Category { get; set; }
    }
}
