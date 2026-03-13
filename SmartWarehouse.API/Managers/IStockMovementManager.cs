using SmartWarehouse.API.DTOs.StockMovementDTOs;

namespace SmartWarehouse.API.Managers;

public interface IStockMovementManager
{
    Task<IEnumerable<StockMovementDto>> GetRecentMovementsAsync(string companyId, int count);
    Task<int> GetCurrentStockAsync(int productId, string companyId);
    Task<bool> AddMovementAsync(CreateStockMovementDto dto);
}