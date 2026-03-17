using SmartWarehouse.API.DTOs.StockMovementDTOs;
using SmartWarehouse.API.DTOs.ReportDTOs;

namespace SmartWarehouse.API.Managers;

public interface IStockMovementManager
{
    Task<IEnumerable<StockMovementDto>> GetRecentMovementsAsync(string companyId, int count);
    Task<int> GetCurrentStockAsync(int productId, string companyId);
    Task<bool> AddMovementAsync(CreateStockMovementDto dto);
    Task<Dictionary<string, ZoneOccupancyDto>> GetZoneOccupanciesAsync(string companyId);
    Task<bool> ResetDataAsync(string companyId);
    Task<bool> InitializeZonesAsync(string companyId);
    Task<List<RackDetailDto>> GetRackDetailsAsync(int warehouseZoneId, string companyId);
    Task<WarehouseReportDto> GetWarehouseReportAsync(string companyId);
    Task<byte[]> GeneratePdfReportAsync(string companyId);
}