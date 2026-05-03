namespace SmartWarehouse.API.Entities;

public class WorkOrder : BaseEntity
{
    public string WorkOrderNumber { get; set; } = string.Empty; // Örn: ÜE-2024-001
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    public WorkOrderStatus Status { get; set; } = WorkOrderStatus.Taslak;

    // Üretilecek Mamul
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public decimal PlannedQuantity { get; set; }
    public decimal ActualQuantity { get; set; }

    public string? Notes { get; set; }

    // Maliyet (Opsiyonel)
    public decimal EstimatedCost { get; set; }
    public decimal ActualCost { get; set; }

    // Navigation Properties
    public ICollection<WorkOrderMaterial> Materials { get; set; } = new List<WorkOrderMaterial>();
    public ICollection<WorkOrderOperation> Operations { get; set; } = new List<WorkOrderOperation>();
}

public enum WorkOrderStatus
{
    Taslak,
    Onaylandi,
    Uretimde,
    Tamamlandi,
    Iptal
}