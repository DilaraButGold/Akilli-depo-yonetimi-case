namespace SmartWarehouse.API.DTOs.WarehouseZoneDTOs;

public class WarehouseZoneDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string CompanyId { get; set; } = string.Empty;
}