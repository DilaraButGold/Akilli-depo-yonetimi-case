namespace SmartWarehouse.API.Entities;

public class ProductMaterial : BaseEntity
{
    public int ProductId { get; set; } // Mamul Ürün
    public Product Product { get; set; } = null!;

    public int MaterialId { get; set; } // Hammadde
    public Product Material { get; set; } = null!;

    public decimal Quantity { get; set; } // 1 birim mamul için gereken hammadde miktarı
    public string? Unit { get; set; } // Adet, kg, metre vb.
}