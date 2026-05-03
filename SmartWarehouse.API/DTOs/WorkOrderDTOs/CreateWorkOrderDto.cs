namespace SmartWarehouse.API.DTOs.WorkOrderDTOs;

public class CreateWorkOrderDto
{
    public int ProductId { get; set; }
    public decimal PlannedQuantity { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public string? Notes { get; set; }
}