namespace SmartWarehouse.API.DTOs.ReportDTOs;

public class WarehouseReportDto
{
    public string CompanyId { get; set; } = string.Empty;
    public DateTime ReportDate { get; set; }
    public int TotalProducts { get; set; }
    public int TotalStock { get; set; }
    public List<ZoneReportDto> Zones { get; set; } = new();
    public List<CriticalProductDto> CriticalProducts { get; set; } = new();
    public List<ProductStockDto> ProductStocks { get; set; } = new();
}

public class ZoneReportDto
{
    public string Zone { get; set; } = string.Empty;
    public int Stock { get; set; }
    public int Capacity { get; set; }
    public int OccupancyPercentage { get; set; }
}

public class CriticalProductDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int TotalStock { get; set; }
    public int CriticalThreshold { get; set; } = 50;
}

public class ProductStockDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public int TotalStock { get; set; }
    public List<RackLocationDto> Locations { get; set; } = new();
}

public class RackLocationDto
{
    public string ZoneName { get; set; } = string.Empty;
    public int Quantity { get; set; }
}