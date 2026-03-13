namespace SmartWarehouse.API.Entities;


public class WarehouseZone : BaseEntity
{
    // Bölge Adı
    public string Name { get; set; } = string.Empty; 
    
    // Bölge Açıklaması
    public string Description { get; set; } = string.Empty;
}