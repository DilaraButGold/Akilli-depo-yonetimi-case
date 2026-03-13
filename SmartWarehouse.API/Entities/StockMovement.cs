namespace SmartWarehouse.API.Entities;

// Ürün depoya ne zaman GİRDİ (IN) veya ÇIKTI (OUT) loglarını tutacağımız yer.
public class StockMovement : BaseEntity
{
    public int ProductId { get; set; }
    
    public Product? Product { get; set; } 

    public int WarehouseZoneId { get; set; }
    
    public WarehouseZone? WarehouseZone { get; set; }

    public int Quantity { get; set; } 
    
    public string MovementType { get; set; } = string.Empty; 
}