using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.DTOs.WorkOrderDTOs;
using SmartWarehouse.API.Entities;
using SmartWarehouse.API.Repositories;

namespace SmartWarehouse.API.Managers;

public class WorkOrderManager : IWorkOrderManager
{
    private readonly IRepository<WorkOrder> _workOrderRepository;
    private readonly IRepository<Product> _productRepository;
    private readonly IRepository<ProductMaterial> _productMaterialRepository;
    private readonly IRepository<StockMovement> _stockMovementRepository;
    private readonly IRepository<WarehouseZone> _zoneRepository;

    public WorkOrderManager(
        IRepository<WorkOrder> workOrderRepository,
        IRepository<Product> productRepository,
        IRepository<ProductMaterial> productMaterialRepository,
        IRepository<StockMovement> stockMovementRepository,
        IRepository<WarehouseZone> zoneRepository)
    {
        _workOrderRepository = workOrderRepository;
        _productRepository = productRepository;
        _productMaterialRepository = productMaterialRepository;
        _stockMovementRepository = stockMovementRepository;
        _zoneRepository = zoneRepository;
    }

    public async Task<WorkOrderDto> CreateWorkOrderAsync(CreateWorkOrderDto dto, string companyId)
    {
        // 1. Mamul ürünü ve reçetesini getir
        var product = await _productRepository.Query(companyId)
            .Include(p => p.BillOfMaterials)
            .ThenInclude(bom => bom.Material)
            .FirstOrDefaultAsync(p => p.Id == dto.ProductId);

        if (product == null)
            throw new Exception("Ürün bulunamadı.");

        if (!product.BillOfMaterials.Any())
            throw new Exception("Bu ürün için tanımlanmış bir reçete bulunmuyor.");

        // 2. Üretim emri numarası oluştur (basit: ÜE-2025-001 formatı)
        var today = DateTime.UtcNow;
        var year = today.Year;
        var countToday = await _workOrderRepository.Query(companyId)
            .CountAsync(wo => wo.OrderDate.Year == year && wo.OrderDate.Month == today.Month && wo.OrderDate.Day == today.Day);
        var workOrderNumber = $"ÜE-{year}-{today.Month:D2}{today.Day:D2}-{(countToday + 1):D3}";

        // 3. Üretim emri entity'sini oluştur
        var workOrder = new WorkOrder
        {
            WorkOrderNumber = workOrderNumber,
            ProductId = dto.ProductId,
            PlannedQuantity = dto.PlannedQuantity,
            PlannedStartDate = dto.PlannedStartDate,
            PlannedEndDate = dto.PlannedEndDate,
            Notes = dto.Notes,
            Status = WorkOrderStatus.Taslak,
            CompanyId = companyId
        };

        // 4. Reçetedeki malzemeleri WorkOrderMaterial olarak ekle
        foreach (var bomItem in product.BillOfMaterials)
        {
            workOrder.Materials.Add(new WorkOrderMaterial
            {
                MaterialId = bomItem.MaterialId,
                RequiredQuantity = bomItem.Quantity * dto.PlannedQuantity,
                IssuedQuantity = 0,
                WastedQuantity = 0,
                CompanyId = companyId
            });
        }

        await _workOrderRepository.AddAsync(workOrder);
        await _workOrderRepository.SaveChangesAsync();

        return await MapToDtoAsync(workOrder, companyId);
    }

    public async Task<bool> StartWorkOrderAsync(int workOrderId, string companyId)
    {
        var workOrder = await _workOrderRepository.Query(companyId)
            .Include(wo => wo.Materials)
            .ThenInclude(m => m.Material)
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId);

        if (workOrder == null)
            throw new Exception("Üretim emri bulunamadı.");

        if (workOrder.Status != WorkOrderStatus.Taslak && workOrder.Status != WorkOrderStatus.Onaylandi)
            throw new Exception("Üretim emri başlatılamaz durumda.");

        // Malzeme yeterlilik kontrolü
        foreach (var material in workOrder.Materials)
        {
            var availableStock = await GetAvailableStockAsync(material.MaterialId, companyId);
            if (availableStock < material.RequiredQuantity)
                throw new Exception($"'{material.Material.Name}' için yeterli stok yok. Gereken: {material.RequiredQuantity}, Mevcut: {availableStock}");
        }

        // Malzemeleri rezerve et (stoktan düşmeden sadece rezerve kaydı tutulabilir; burada basitlik için direkt stok düşüyoruz)
        foreach (var material in workOrder.Materials)
        {
            // Varsayılan bir raf seç (ilk bulduğu rafı kullan)
            var defaultZone = await _zoneRepository.Query(companyId).FirstOrDefaultAsync();
            if (defaultZone == null)
                throw new Exception("Depoda raf tanımlı değil.");

            await _stockMovementRepository.AddAsync(new StockMovement
            {
                ProductId = material.MaterialId,
                WarehouseZoneId = defaultZone.Id,
                Quantity = (int)material.RequiredQuantity,
                MovementType = "OUT",
                CompanyId = companyId,
                CreatedAt = DateTime.UtcNow
            });
            material.IssuedQuantity = material.RequiredQuantity;
        }

        workOrder.Status = WorkOrderStatus.Uretimde;
        workOrder.ActualStartDate = DateTime.UtcNow;

        _workOrderRepository.Update(workOrder);
        await _workOrderRepository.SaveChangesAsync();

        return true;
    }

    public async Task<bool> CompleteWorkOrderAsync(int workOrderId, decimal actualQuantity, Dictionary<int, decimal>? wastedQuantities, string companyId)
    {
        var workOrder = await _workOrderRepository.Query(companyId)
            .Include(wo => wo.Materials)
            .Include(wo => wo.Product)
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId);

        if (workOrder == null)
            throw new Exception("Üretim emri bulunamadı.");

        if (workOrder.Status != WorkOrderStatus.Uretimde)
            throw new Exception("Sadece üretimde olan emirler tamamlanabilir.");

        // 1. Mamul stoğa ekle
        var defaultZone = await _zoneRepository.Query(companyId).FirstOrDefaultAsync();
        if (defaultZone == null)
            throw new Exception("Depoda raf tanımlı değil.");

        await _stockMovementRepository.AddAsync(new StockMovement
        {
            ProductId = workOrder.ProductId,
            WarehouseZoneId = defaultZone.Id,
            Quantity = (int)actualQuantity,
            MovementType = "IN",
            CompanyId = companyId,
            CreatedAt = DateTime.UtcNow
        });

        // 2. Fire miktarlarını güncelle
        if (wastedQuantities != null)
        {
            foreach (var material in workOrder.Materials)
            {
                if (wastedQuantities.TryGetValue(material.MaterialId, out var wasted))
                {
                    material.WastedQuantity = wasted;
                }
            }
        }

        workOrder.ActualQuantity = actualQuantity;
        workOrder.ActualEndDate = DateTime.UtcNow;
        workOrder.Status = WorkOrderStatus.Tamamlandi;

        _workOrderRepository.Update(workOrder);
        await _workOrderRepository.SaveChangesAsync();

        return true;
    }

    public async Task<bool> CancelWorkOrderAsync(int workOrderId, string companyId)
    {
        var workOrder = await _workOrderRepository.Query(companyId)
            .Include(wo => wo.Materials)
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId);

        if (workOrder == null)
            throw new Exception("Üretim emri bulunamadı.");

        if (workOrder.Status == WorkOrderStatus.Tamamlandi)
            throw new Exception("Tamamlanmış bir üretim emri iptal edilemez.");

        // Eğer üretim başlamışsa ve stok düşülmüşse, malzemeleri geri ekle (iade)
        if (workOrder.Status == WorkOrderStatus.Uretimde)
        {
            var defaultZone = await _zoneRepository.Query(companyId).FirstOrDefaultAsync();
            if (defaultZone == null)
                throw new Exception("Depoda raf tanımlı değil.");

            foreach (var material in workOrder.Materials.Where(m => m.IssuedQuantity > 0))
            {
                await _stockMovementRepository.AddAsync(new StockMovement
                {
                    ProductId = material.MaterialId,
                    WarehouseZoneId = defaultZone.Id,
                    Quantity = (int)material.IssuedQuantity,
                    MovementType = "IN",
                    CompanyId = companyId,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        workOrder.Status = WorkOrderStatus.Iptal;
        _workOrderRepository.Update(workOrder);
        await _workOrderRepository.SaveChangesAsync();

        return true;
    }

    public async Task<(IEnumerable<WorkOrderDto> Data, int TotalCount)> GetWorkOrdersPaginatedAsync(string companyId, int page, int pageSize, string? status = null)
    {
        var query = _workOrderRepository.Query(companyId)
            .Include(wo => wo.Product)
            .Include(wo => wo.Materials)
            .ThenInclude(m => m.Material)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<WorkOrderStatus>(status, true, out var statusEnum))
                query = query.Where(wo => wo.Status == statusEnum);
        }

        var totalCount = await query.CountAsync();

        var workOrders = await query
            .OrderByDescending(wo => wo.OrderDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = new List<WorkOrderDto>();
        foreach (var wo in workOrders)
        {
            dtos.Add(await MapToDtoAsync(wo, companyId));
        }

        return (dtos, totalCount);
    }

    public async Task<WorkOrderDto?> GetWorkOrderByIdAsync(int id, string companyId)
    {
        var workOrder = await _workOrderRepository.Query(companyId)
            .Include(wo => wo.Product)
            .Include(wo => wo.Materials)
            .ThenInclude(m => m.Material)
            .FirstOrDefaultAsync(wo => wo.Id == id);

        if (workOrder == null)
            return null;

        return await MapToDtoAsync(workOrder, companyId);
    }

    #region Helper Methods

    private async Task<int> GetAvailableStockAsync(int productId, string companyId)
    {
        var totalIn = await _stockMovementRepository.Query(companyId)
            .Where(m => m.ProductId == productId && m.MovementType == "IN")
            .SumAsync(m => m.Quantity);

        var totalOut = await _stockMovementRepository.Query(companyId)
            .Where(m => m.ProductId == productId && m.MovementType == "OUT")
            .SumAsync(m => m.Quantity);

        return totalIn - totalOut;
    }

    private async Task<WorkOrderDto> MapToDtoAsync(WorkOrder workOrder, string companyId)
    {
        var dto = new WorkOrderDto
        {
            Id = workOrder.Id,
            WorkOrderNumber = workOrder.WorkOrderNumber,
            OrderDate = workOrder.OrderDate,
            Status = workOrder.Status.ToString(),
            ProductName = workOrder.Product?.Name ?? "Bilinmiyor",
            PlannedQuantity = workOrder.PlannedQuantity,
            ActualQuantity = workOrder.ActualQuantity,
            Materials = new List<WorkOrderMaterialDto>()
        };

        foreach (var material in workOrder.Materials)
        {
            var availableStock = await GetAvailableStockAsync(material.MaterialId, companyId);
            dto.Materials.Add(new WorkOrderMaterialDto
            {
                MaterialId = material.MaterialId,
                MaterialName = material.Material?.Name ?? "Bilinmiyor",
                RequiredQuantity = material.RequiredQuantity,
                IssuedQuantity = material.IssuedQuantity,
                AvailableStock = availableStock
            });
        }

        return dto;
    }

    #endregion
}