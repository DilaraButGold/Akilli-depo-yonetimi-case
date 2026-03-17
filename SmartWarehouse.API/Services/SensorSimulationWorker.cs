using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.Data;
using SmartWarehouse.API.Entities;
using SmartWarehouse.API.Hubs;

namespace SmartWarehouse.API.Services;

public class SensorSimulationWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IHubContext<WarehouseHub> _hubContext;
    private readonly ILogger<SensorSimulationWorker> _logger;

    public SensorSimulationWorker(
        IServiceProvider serviceProvider, 
        IHubContext<WarehouseHub> hubContext,
        ILogger<SensorSimulationWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Akıllı Depo Sensör Simülasyonu Başladı...");

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                string companyId = "COMP-101"; 

                var product = await dbContext.Products
                    .Where(p => p.CompanyId == companyId && !p.IsDeleted)
                    .OrderBy(r => Guid.NewGuid()) 
                    .FirstOrDefaultAsync(stoppingToken);

                var zone = await dbContext.WarehouseZones
                    .Where(z => z.CompanyId == companyId && !z.IsDeleted)
                    .OrderBy(r => Guid.NewGuid())
                    .FirstOrDefaultAsync(stoppingToken);

                if (product != null && zone != null)
                {
                    int randomQuantity = new Random().Next(1, 11); 

                    var movement = new StockMovement
                    {
                        ProductId = product.Id,
                        WarehouseZoneId = zone.Id,
                        Quantity = randomQuantity,
                        MovementType = "IN", 
                        CompanyId = companyId,
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.StockMovements.Add(movement);
                    await dbContext.SaveChangesAsync(stoppingToken);

                    string notificationMessage = $"[RFID SENSÖR] {zone.Name} bölgesine {randomQuantity} adet '{product.Name}' girişi tespit edildi.";
                    
                    await _hubContext.Clients.All.SendAsync("ReceiveStockUpdate", new
                    {
                        Message = notificationMessage,
                        ProductId = product.Id,
                        Quantity = randomQuantity,
                        Type = "IN"
                    }, stoppingToken);

                    _logger.LogInformation(notificationMessage);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Simülasyon sırasında bir hata oluştu.");
            }
        }
    }
}