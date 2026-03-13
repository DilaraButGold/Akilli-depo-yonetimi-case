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

    // 1. Özet Bilgiler (Kartlar için)
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string companyId)
    {
        if (string.IsNullOrEmpty(companyId)) return BadRequest("CompanyId gereklidir.");

        var (products, totalCount) = await _productManager.GetPaginatedAsync(companyId, 1, 1000, null);
        var recentMovements = await _manager.GetRecentMovementsAsync(companyId, 10);
        
        return Ok(new
        {
            Success = true,
            TotalProducts = totalCount,
            RecentMovementsCount = recentMovements.Count(),
            Status = "Sistem Aktif"
        });
    }

    // 2. Ürünün anlık stok miktarını hesapla (Frontend'deki yükleniyor hatasını çözen yer)
    [HttpGet("current-stock/{productId}")]
    public async Task<IActionResult> GetStock(int productId, [FromQuery] string companyId)
    {
        if (string.IsNullOrEmpty(companyId)) return BadRequest("CompanyId gereklidir.");

        var stock = await _manager.GetCurrentStockAsync(productId, companyId);
        
        // Kural: PascalCase dönüyoruz
        return Ok(new { ProductId = productId, Stock = stock });
    }

    // 3. Yeni Stok Hareketi Ekle (Giriş veya Çıkış)
    [HttpPost("add")]
    public async Task<IActionResult> Add([FromBody] CreateStockMovementDto dto)
    {
        if (string.IsNullOrEmpty(dto.CompanyId)) return BadRequest("CompanyId gereklidir.");

        var result = await _manager.AddMovementAsync(dto);
        
        if (!result) 
            return BadRequest(new { Success = false, Message = "Stok hareketi başarısız. (Yetersiz stok veya geçersiz veri)." });

        return Ok(new { Success = true, Message = "Stok hareketi başarıyla kaydedildi." });
    }
}