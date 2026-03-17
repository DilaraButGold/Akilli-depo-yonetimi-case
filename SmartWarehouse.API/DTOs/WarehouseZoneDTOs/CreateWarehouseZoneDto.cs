namespace SmartWarehouse.API.DTOs.WarehouseZoneDTOs;

public class CreateWarehouseZoneDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int? Capacity { get; set; } // nullable, backend'de 50 default
    public string CompanyId { get; set; } = string.Empty;
}