namespace SmartWarehouse.API.Entities;

public class WorkOrderMaterial : BaseEntity
{
    public int WorkOrderId { get; set; }
    public WorkOrder WorkOrder { get; set; } = null!;

    public int MaterialId { get; set; } // Hammadde Ürün ID
    public Product Material { get; set; } = null!;

    public decimal RequiredQuantity { get; set; } // Reçeteden gelen ihtiyaç
    public decimal IssuedQuantity { get; set; } // Depodan çekilen miktar
    public decimal WastedQuantity { get; set; } // Fire

    public int? FromRafId { get; set; }
    public WarehouseZone? FromRaf { get; set; }
}