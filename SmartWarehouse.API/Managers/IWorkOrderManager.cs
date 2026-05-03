using SmartWarehouse.API.DTOs.WorkOrderDTOs;

namespace SmartWarehouse.API.Managers;

public interface IWorkOrderManager
{
    /// <summary>
    /// Yeni bir üretim emri oluşturur. Reçeteden malzeme listesini otomatik çıkarır.
    /// </summary>
    Task<WorkOrderDto> CreateWorkOrderAsync(CreateWorkOrderDto dto, string companyId);
    
    /// <summary>
    /// Üretim emrini başlatır. Malzeme yeterliliğini kontrol eder, yeterliyse hammaddeleri rezerve eder.
    /// </summary>
    Task<bool> StartWorkOrderAsync(int workOrderId, string companyId);
    
    /// <summary>
    /// Üretim emrini tamamlar. Mamul stoğa eklenir, hammaddeler düşülür, fire kaydedilir.
    /// </summary>
    Task<bool> CompleteWorkOrderAsync(int workOrderId, decimal actualQuantity, Dictionary<int, decimal>? wastedQuantities, string companyId);
    
    /// <summary>
    /// Üretim emrini iptal eder. Rezerve edilmiş stokları geri bırakır.
    /// </summary>
    Task<bool> CancelWorkOrderAsync(int workOrderId, string companyId);
    
    /// <summary>
    /// Sayfalı ve filtrelenmiş üretim emri listesi döndürür.
    /// </summary>
    Task<(IEnumerable<WorkOrderDto> Data, int TotalCount)> GetWorkOrdersPaginatedAsync(string companyId, int page, int pageSize, string? status = null);
    
    /// <summary>
    /// ID'ye göre üretim emri detayını getirir.
    /// </summary>
    Task<WorkOrderDto?> GetWorkOrderByIdAsync(int id, string companyId);
}