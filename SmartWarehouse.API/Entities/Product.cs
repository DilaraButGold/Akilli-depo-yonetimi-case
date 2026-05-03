namespace SmartWarehouse.API.Entities;

public class Product : BaseEntity
{
    // Ürün Adı
    public string Name { get; set; } = string.Empty;
    
    // Ürün Barkodu
    public string Barcode { get; set; } = string.Empty;
    
    // Ürün Açıklaması
    public string Description { get; set; } = string.Empty;

    // Ürün Reçetesi (Bill of Materials) - Hammadde listesi
    public ICollection<ProductMaterial> BillOfMaterials { get; set; } = new List<ProductMaterial>();
}