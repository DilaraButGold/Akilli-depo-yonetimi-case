using SmartWarehouse.API.DTOs.WarehouseZoneDTOs;

namespace SmartWarehouse.API.Managers;

public interface IWarehouseZoneManager
{
    Task<(IEnumerable<WarehouseZoneDto> Data, int TotalCount)> GetPaginatedAsync(string companyId, int page, int pageSize, string? searchTerm);
    Task<WarehouseZoneDto?> GetByIdAsync(int id, string companyId);
    Task<WarehouseZoneDto> CreateAsync(CreateWarehouseZoneDto dto);
    Task<bool> UpdateAsync(UpdateWarehouseZoneDto dto);
    Task<bool> DeleteAsync(int id, string companyId);
}