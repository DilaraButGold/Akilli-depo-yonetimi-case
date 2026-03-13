using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.DTOs.StockMovementDTOs;
using SmartWarehouse.API.Entities;
using SmartWarehouse.API.Repositories;

namespace SmartWarehouse.API.Managers;

public class StockMovementManager : IStockMovementManager
{
    private readonly IRepository<StockMovement> _repository;

    public StockMovementManager(IRepository<StockMovement> repository)
    {
        _repository = repository;
    }

    // Mevcut stok miktarını hesapla (IN - OUT)
    public async Task<int> GetCurrentStockAsync(int productId, string companyId)
    {
        var movements = await _repository.Query(companyId)
            .Where(m => m.ProductId == productId)
            .ToListAsync();

        int totalIn = movements.Where(m => m.MovementType == "IN").Sum(m => m.Quantity);
        int totalOut = movements.Where(m => m.MovementType == "OUT").Sum(m => m.Quantity);

        return totalIn - totalOut;
    }

    public async Task<IEnumerable<StockMovementDto>> GetRecentMovementsAsync(string companyId, int count)
    {
        var movements = await _repository.Query(companyId)
            .Include(m => m.Product)
            .Include(m => m.WarehouseZone)
            .OrderByDescending(m => m.CreatedAt)
            .Take(count)
            .ToListAsync();

        return movements.Select(m => new StockMovementDto
        {
            Id = m.Id,
            ProductId = m.ProductId,
            ProductName = m.Product?.Name ?? "Bilinmiyor",
            WarehouseZoneId = m.WarehouseZoneId,
            ZoneName = m.WarehouseZone?.Name ?? "Bilinmiyor",
            Quantity = m.Quantity,
            MovementType = m.MovementType,
            CreatedAt = m.CreatedAt
        });
    }

    public async Task<bool> AddMovementAsync(CreateStockMovementDto dto)
    {
        // KURAL: Eğer bir çıkış (OUT) işlemi yapılıyorsa stok kontrolü yapmalıyız
        if (dto.MovementType == "OUT")
        {
            int currentStock = await GetCurrentStockAsync(dto.ProductId, dto.CompanyId);
            if (currentStock < dto.Quantity) return false; // Yetersiz stok!
        }

        var entity = new StockMovement
        {
            ProductId = dto.ProductId,
            WarehouseZoneId = dto.WarehouseZoneId,
            Quantity = dto.Quantity,
            MovementType = dto.MovementType,
            CompanyId = dto.CompanyId
        };

        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();
        return true;
    }
}