using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartWarehouse.API.DTOs.StockMovementDTOs;
using SmartWarehouse.API.Managers;
using SmartWarehouse.API.Entities;
using SmartWarehouse.API.Constants;
using SmartWarehouse.API.Repositories;
using Microsoft.EntityFrameworkCore; // 🆕 Eklendi

namespace SmartWarehouse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StockMovementsController : ControllerBase
{
    private readonly IStockMovementManager _manager;
    private readonly IProductManager _productManager;
    private readonly IRepository<StockMovement> _stockRepository;
    private string CurrentCompanyId => User.FindFirst("CompanyId")?.Value ?? string.Empty;

    public StockMovementsController(
        IStockMovementManager manager,
        IProductManager productManager,
        IRepository<StockMovement> stockRepository)
    {
        _manager = manager;
        _productManager = productManager;
        _stockRepository = stockRepository;
    }

    [HttpGet("summary")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager},{UserRoles.WarehouseStaff},{UserRoles.Accountant}")]
    public async Task<IActionResult> GetSummary()
    {
        var (_, totalCount) = await _productManager.GetPaginatedAsync(CurrentCompanyId, 1, 1000, null);
        var recent = await _manager.GetRecentMovementsAsync(CurrentCompanyId, 10);
        return Ok(new { Success = true, TotalProducts = totalCount, RecentMovementsCount = recent.Count(), Status = "Sistem Aktif" });
    }

    [HttpGet("current-stock/{productId}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager},{UserRoles.WarehouseStaff}")]
    public async Task<IActionResult> GetStock(int productId)
    {
        var stock = await _manager.GetCurrentStockAsync(productId, CurrentCompanyId);
        return Ok(new { ProductId = productId, Stock = stock });
    }

    [HttpPost("add")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager},{UserRoles.WarehouseStaff}")]
    public async Task<IActionResult> Add([FromBody] CreateStockMovementDto dto)
    {
        dto.CompanyId = CurrentCompanyId;
        var result = await _manager.AddMovementAsync(dto);
        if (!result) return BadRequest(new { Success = false, Message = "Kapasite dolu veya yetersiz stok!" });
        return Ok(new { Success = true, Message = "İşlem başarıyla kaydedildi." });
    }

    [HttpGet("occupancies")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager},{UserRoles.WarehouseStaff}")]
    public async Task<IActionResult> GetOccupancies()
    {
        var occupancies = await _manager.GetZoneOccupanciesAsync(CurrentCompanyId);
        return Ok(new { Success = true, Data = occupancies });
    }

    [HttpPost("reset-all-data")]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<IActionResult> ResetAllData()
    {
        await _manager.ResetDataAsync(CurrentCompanyId);
        return Ok(new { Success = true, Message = "Veriler sıfırlandı." });
    }

    [HttpPost("initialize-zones")]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<IActionResult> InitializeZones()
    {
        await _manager.InitializeZonesAsync(CurrentCompanyId);
        return Ok(new { Success = true, Message = "Tüm bölgeler oluşturuldu." });
    }

    [HttpGet("rack-details/{warehouseZoneId}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager},{UserRoles.WarehouseStaff}")]
    public async Task<IActionResult> GetRackDetails(int warehouseZoneId)
    {
        var details = await _manager.GetRackDetailsAsync(warehouseZoneId, CurrentCompanyId);
        return Ok(new { Success = true, Data = details });
    }

    [HttpGet("report")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager},{UserRoles.Accountant}")]
    public async Task<IActionResult> GetReport()
    {
        var report = await _manager.GetWarehouseReportAsync(CurrentCompanyId);
        return Ok(new { Success = true, Data = report });
    }

    [HttpGet("report/pdf")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager},{UserRoles.Accountant}")]
    public async Task<IActionResult> DownloadPdfReport()
    {
        var pdfBytes = await _manager.GeneratePdfReportAsync(CurrentCompanyId);
        return File(pdfBytes, "application/pdf", $"DepoRaporu_{DateTime.Now:yyyyMMdd_HHmmss}.pdf");
    }

    [HttpGet("history")]
    [Authorize]
    public async Task<IActionResult> GetHistory(
        [FromQuery] string companyId,
        [FromQuery] DateTime? since = null)
    {
        if (string.IsNullOrEmpty(companyId))
            return BadRequest("CompanyId zorunludur.");

        var query = _stockRepository.Query(companyId)
            .Where(m => m.MovementType == "OUT" || m.MovementType == "IN");

        if (since.HasValue)
            query = query.Where(m => m.CreatedAt >= since.Value);

        var history = await query
            .OrderBy(m => m.CreatedAt)
            .Select(m => new
            {
                ProductId = m.ProductId,
                Quantity = m.Quantity,
                Type = m.MovementType,
                Date = m.CreatedAt
            })
            .ToListAsync(); // using Microsoft.EntityFrameworkCore gerekli

        return Ok(new { Data = history });
    }
}