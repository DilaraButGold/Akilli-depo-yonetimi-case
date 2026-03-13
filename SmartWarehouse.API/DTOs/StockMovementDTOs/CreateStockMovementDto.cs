namespace SmartWarehouse.API.DTOs.StockMovementDTOs;

public class CreateStockMovementDto
{
    public int ProductId { get; set; }
    public int WarehouseZoneId { get; set; }
    public int Quantity { get; set; }
    public string MovementType { get; set; } = string.Empty; // "IN" veya "OUT"
    public string CompanyId { get; set; } = string.Empty;
}