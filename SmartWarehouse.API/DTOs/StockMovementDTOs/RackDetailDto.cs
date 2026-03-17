namespace SmartWarehouse.API.DTOs.StockMovementDTOs;

public class RackDetailDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string CompanyId { get; set; } = string.Empty;
}