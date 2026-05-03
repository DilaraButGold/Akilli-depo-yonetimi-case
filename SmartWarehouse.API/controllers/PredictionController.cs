using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.Repositories;
using SmartWarehouse.API.Entities;

namespace SmartWarehouse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PredictionController : ControllerBase
{
    private readonly IRepository<StockMovement> _stockRepo;

    public PredictionController(IRepository<StockMovement> stockRepo)
    {
        _stockRepo = stockRepo;
    }

    [HttpGet("stock-forecast")]
    public async Task<IActionResult> GetStockForecast()
    {
        var companyId = User.FindFirst("CompanyId")?.Value ?? string.Empty;
        var thresholdDays = 3; // 3 günden az stok kalırsa uyarı ver
        var evaluationDays = 7; // Son 7 günün ortalamasına bak

        var since = DateTime.UtcNow.AddDays(-30);

        // Son 30 gündeki tüm IN/OUT hareketlerini al
        var movements = await _stockRepo.Query(companyId)
            .Where(m => m.CreatedAt >= since && (m.MovementType == "IN" || m.MovementType == "OUT"))
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        // Ürün bazında günlük çıkışları ve güncel stoğu hesapla
        var dailyOut = new Dictionary<int, Dictionary<string, int>>();
        var currentStock = new Dictionary<int, int>();

        foreach (var m in movements)
        {
            var dateKey = m.CreatedAt.ToString("yyyy-MM-dd");

            if (m.MovementType == "OUT")
            {
                if (!dailyOut.ContainsKey(m.ProductId))
                    dailyOut[m.ProductId] = new Dictionary<string, int>();

                if (!dailyOut[m.ProductId].ContainsKey(dateKey))
                    dailyOut[m.ProductId][dateKey] = 0;

                dailyOut[m.ProductId][dateKey] += m.Quantity;

                if (!currentStock.ContainsKey(m.ProductId))
                    currentStock[m.ProductId] = 0;

                currentStock[m.ProductId] -= m.Quantity;
            }
            else if (m.MovementType == "IN")
            {
                if (!currentStock.ContainsKey(m.ProductId))
                    currentStock[m.ProductId] = 0;

                currentStock[m.ProductId] += m.Quantity;
            }
        }

        var predictions = new List<object>();

        foreach (var kvp in dailyOut)
        {
            var productId = kvp.Key;
            var daily = kvp.Value;

            var sortedDates = daily.Keys.OrderBy(d => d).TakeLast(evaluationDays).ToList();
            if (!sortedDates.Any()) continue;

            var totalOut = sortedDates.Sum(d => daily[d]);
            var avgDaily = (double)totalOut / sortedDates.Count;

            var stockNow = Math.Max(0, currentStock.GetValueOrDefault(productId, 0));

            // Sonsuz değer yerine null kullanacağız
            double? daysLeft = null;
            if (avgDaily > 0)
                daysLeft = Math.Round(stockNow / avgDaily, 1);

            var warning = daysLeft.HasValue && daysLeft.Value <= thresholdDays;

            predictions.Add(new
            {
                productId,
                avgDailyOut = Math.Round(avgDaily, 2),
                currentStock = stockNow,
                estimatedDaysLeft = daysLeft, // null JSON'da null olur, hata vermez
                warning
            });
        }

        return Ok(new { predictions });
    }
}