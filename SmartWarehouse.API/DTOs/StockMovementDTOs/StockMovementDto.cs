namespace SmartWarehouse.API.DTOs.StockMovementDTOs;

public class StockMovementDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int WarehouseZoneId { get; set; }
    public string ZoneName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string MovementType { get; set; } = string.Empty; 
    public DateTime CreatedAt { get; set; }
}