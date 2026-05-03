namespace SmartWarehouse.API.Entities;

public class WorkOrderOperation : BaseEntity
{
    public int WorkOrderId { get; set; }
    public WorkOrder WorkOrder { get; set; } = null!;

    public string OperationName { get; set; } = string.Empty; // Kesim, Montaj, Boya vb.
    public int Sequence { get; set; } // Sıra No
    public WorkOrderOperationStatus Status { get; set; } = WorkOrderOperationStatus.Beklemede;

    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    public Guid? AssignedEmployeeId { get; set; }
    public AppUser? AssignedEmployee { get; set; }

    public string? Notes { get; set; }
}

public enum WorkOrderOperationStatus
{
    Beklemede,
    DevamEdiyor,
    Tamamlandi,
    Atlandi
}