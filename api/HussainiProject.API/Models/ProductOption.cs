using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HussainiProject.API.Models
{
    public class ProductOption
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(80)]
        public string Name { get; set; } = string.Empty;

        [Range(typeof(decimal), "0", "999999999")]
        public decimal Price { get; set; }

        public int ProductId { get; set; }

        [JsonIgnore]
        public virtual Product? Product { get; set; }
    }
}
