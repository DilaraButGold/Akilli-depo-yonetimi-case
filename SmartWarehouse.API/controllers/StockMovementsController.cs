using Microsoft.AspNetCore.Mvc;
using SmartWarehouse.API.DTOs.StockMovementDTOs;
using SmartWarehouse.API.Managers;

namespace SmartWarehouse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StockMovementsController : ControllerBase
{
    private readonly IStockMovementManager _manager;
    private readonly IProductManager _productManager;

    public StockMovementsController(IStockMovementManager manager, IProductManager productManager)
    {
        _manager = manager;
        _productManager = productManager;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string companyId)
    {
        var (_, totalCount) = await _productManager.GetPaginatedAsync(companyId, 1, 1000, null);
        var recent = await _manager.GetRecentMovementsAsync(companyId, 10);
        return Ok(new { Success = true, TotalProducts = totalCount, RecentMovementsCount = recent.Count(), Status = "Sistem Aktif" });
    }

    [HttpGet("current-stock/{productId}")]
    public async Task<IActionResult> GetStock(int productId, [FromQuery] string companyId)
    {
        var stock = await _manager.GetCurrentStockAsync(productId, companyId);
        return Ok(new { ProductId = productId, Stock = stock });
    }

    [HttpPost("add")]
    public async Task<IActionResult> Add([FromBody] CreateStockMovementDto dto)
    {
        var result = await _manager.AddMovementAsync(dto);
        if (!result) return BadRequest(new { Success = false, Message = "Kapasite dolu veya yetersiz stok!" });
        return Ok(new { Success = true, Message = "İşlem başarıyla kaydedildi." });
    }

    [HttpGet("occupancies")]
    public async Task<IActionResult> GetOccupancies([FromQuery] string companyId)
    {
        var occupancies = await _manager.GetZoneOccupanciesAsync(companyId);
        return Ok(new { Success = true, Data = occupancies });
    }

    [HttpPost("reset-all-data")]
    public async Task<IActionResult> ResetAllData([FromQuery] string companyId)
    {
        await _manager.ResetDataAsync(companyId);
        return Ok(new { Success = true, Message = "Veriler sıfırlandı." });
    }

    [HttpPost("initialize-zones")]
    public async Task<IActionResult> InitializeZones([FromQuery] string companyId)
    {
        await _manager.InitializeZonesAsync(companyId);
        return Ok(new { Success = true, Message = "Tüm bölgeler oluşturuldu." });
    }

    [HttpGet("rack-details/{warehouseZoneId}")]
    public async Task<IActionResult> GetRackDetails(int warehouseZoneId, [FromQuery] string companyId)
    {
        var details = await _manager.GetRackDetailsAsync(warehouseZoneId, companyId);
        return Ok(new { Success = true, Data = details });
    }

    [HttpGet("report")]
    public async Task<IActionResult> GetReport([FromQuery] string companyId)
    {
        var report = await _manager.GetWarehouseReportAsync(companyId);
        return Ok(new { Success = true, Data = report });
    }

    [HttpGet("report/pdf")]
    public async Task<IActionResult> DownloadPdfReport([FromQuery] string companyId)
    {
        var pdfBytes = await _manager.GeneratePdfReportAsync(companyId);
        return File(pdfBytes, "application/pdf", $"DepoRaporu_{DateTime.Now:yyyyMMdd_HHmmss}.pdf");
    }
}