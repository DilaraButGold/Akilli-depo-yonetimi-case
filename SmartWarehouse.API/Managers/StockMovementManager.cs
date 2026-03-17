using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.DTOs.StockMovementDTOs;
using SmartWarehouse.API.DTOs.ReportDTOs;
using SmartWarehouse.API.Entities;
using SmartWarehouse.API.Repositories;
using System.Text.Json;
using QuestPDF;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace SmartWarehouse.API.Managers;

public class StockMovementManager : IStockMovementManager
{
    private readonly IRepository<StockMovement> _repository;
    private readonly IRepository<WarehouseZone> _zoneRepository;

    public StockMovementManager(IRepository<StockMovement> repository, IRepository<WarehouseZone> zoneRepository)
    {
        _repository = repository;
        _zoneRepository = zoneRepository;
    }

    public async Task<int> GetCurrentStockAsync(int productId, string companyId)
    {
        var totalIn = await _repository.Query(companyId).Where(m => m.ProductId == productId && m.MovementType == "IN").SumAsync(m => m.Quantity);
        var totalOut = await _repository.Query(companyId).Where(m => m.ProductId == productId && m.MovementType == "OUT").SumAsync(m => m.Quantity);
        return totalIn - totalOut;
    }

    public async Task<IEnumerable<StockMovementDto>> GetRecentMovementsAsync(string companyId, int count)
    {
        var movements = await _repository.Query(companyId)
            .Include(m => m.Product)
            .Include(m => m.WarehouseZone)
            .OrderByDescending(m => m.CreatedAt)
            .Take(count)
            .ToListAsync();

        return movements.Select(m => new StockMovementDto {
            Id = m.Id, ProductId = m.ProductId, ProductName = m.Product?.Name ?? "Bilinmiyor",
            WarehouseZoneId = m.WarehouseZoneId, ZoneName = m.WarehouseZone?.Name ?? "Bilinmiyor",
            Quantity = m.Quantity, MovementType = m.MovementType, CreatedAt = m.CreatedAt
        });
    }

    public async Task<bool> AddMovementAsync(CreateStockMovementDto dto)
    {
        Console.WriteLine($"=== AddMovementAsync çağrıldı ===");
        Console.WriteLine($"ProductId: {dto.ProductId}");
        Console.WriteLine($"WarehouseZoneId: {dto.WarehouseZoneId}");
        Console.WriteLine($"Quantity: {dto.Quantity}");
        Console.WriteLine($"MovementType: {dto.MovementType}");
        Console.WriteLine($"CompanyId: {dto.CompanyId}");

        using var transaction = await _repository.BeginTransactionAsync();
        try
        {
            if (dto.Quantity <= 0) return false;

            if (dto.MovementType == "OUT")
            {
                var currentStock = await GetCurrentStockAsync(dto.ProductId, dto.CompanyId);
                if (currentStock < dto.Quantity) return false;
            }
            else if (dto.MovementType == "IN")
            {
                var zone = await _zoneRepository.GetByIdAsync(dto.WarehouseZoneId, dto.CompanyId);
                if (zone == null) 
                {
                    Console.WriteLine($"Zone bulunamadı! ZoneId: {dto.WarehouseZoneId}");
                    return false;
                }

                // AYNI RAFTA FARKLI ÜRÜN KONTROLÜ
                var existingProducts = await _repository.Query(dto.CompanyId)
                    .Where(m => m.WarehouseZoneId == dto.WarehouseZoneId)
                    .GroupBy(m => m.ProductId)
                    .Select(g => new 
                    { 
                        ProductId = g.Key, 
                        Quantity = g.Sum(m => m.MovementType == "IN" ? m.Quantity : 0) - 
                                  g.Sum(m => m.MovementType == "OUT" ? m.Quantity : 0)
                    })
                    .Where(x => x.Quantity > 0)
                    .ToListAsync();

                if (existingProducts.Any() && existingProducts.First().ProductId != dto.ProductId)
                {
                    var existingProductId = existingProducts.First().ProductId;
                    
                    // Mevcut ürünün adını bul
                    var existingProduct = await _repository.Query(dto.CompanyId)
                        .Include(m => m.Product)
                        .Where(m => m.ProductId == existingProductId)
                        .Select(m => m.Product)
                        .FirstOrDefaultAsync();
                    
                    var existingProductName = existingProduct?.Name ?? "Bilinmeyen Ürün";
                    
                    Console.WriteLine($"UYARI: Bu rafta zaten farklı bir ürün var! (Ürün: {existingProductName}, ID: {existingProductId})");
                    
                    throw new InvalidOperationException($"Bu rafta zaten '{existingProductName}' ürünü bulunuyor! Aynı rafa sadece aynı ürünü ekleyebilirsiniz.");
                }

                // Zone'un mevcut stok miktarını hesapla
                var currentZoneStock = existingProducts.FirstOrDefault()?.Quantity ?? 0;

                Console.WriteLine($"Zone mevcut stok: {currentZoneStock}, Kapasite: {zone.Capacity}, Eklenmek istenen: {dto.Quantity}");

                if (currentZoneStock + dto.Quantity > zone.Capacity)
                {
                    Console.WriteLine($"Kapasite aşımı! Mevcut: {currentZoneStock} + {dto.Quantity} > {zone.Capacity}");
                    return false;
                }
            }
            else
            {
                Console.WriteLine($"Geçersiz MovementType: {dto.MovementType}");
                return false;
            }

            await _repository.AddAsync(new StockMovement
            {
                ProductId = dto.ProductId,
                WarehouseZoneId = dto.WarehouseZoneId,
                Quantity = dto.Quantity,
                MovementType = dto.MovementType,
                CompanyId = dto.CompanyId
            });
            await _repository.SaveChangesAsync();
            await transaction.CommitAsync();
            Console.WriteLine("Stok hareketi başarıyla kaydedildi!");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Hata oluştu: {ex.Message}");
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<Dictionary<string, ZoneOccupancyDto>> GetZoneOccupanciesAsync(string companyId)
    {
        Console.WriteLine($"=== GetZoneOccupanciesAsync çağrıldı. CompanyId: {companyId} ===");
        
        var zones = await _zoneRepository.Query(companyId).ToListAsync();
        Console.WriteLine($"Toplam zone sayısı: {zones.Count}");
        
        if (zones.Count == 0)
        {
            Console.WriteLine("UYARI: Hiç zone bulunamadı! Varsayılan değerler döndürülüyor.");
            var emptyResult = new Dictionary<string, ZoneOccupancyDto>();
            var allZones = new[] { "A", "B", "C", "D", "E", "F" };
            foreach (var zone in allZones)
            {
                emptyResult[zone] = new ZoneOccupancyDto { Stock = 0, Capacity = 1400 };
                Console.WriteLine($"{zone} bölgesi: 0/1400 (varsayılan - zone yok)");
            }
            return emptyResult;
        }
        
        var zoneStocks = new Dictionary<int, int>();

        foreach (var zone in zones)
        {
            var stock = await _repository.Query(companyId)
                .Where(m => m.WarehouseZoneId == zone.Id)
                .GroupBy(m => m.WarehouseZoneId)
                .Select(g => g.Sum(m => m.MovementType == "IN" ? m.Quantity : 0) - g.Sum(m => m.MovementType == "OUT" ? m.Quantity : 0))
                .FirstOrDefaultAsync();
                
            zoneStocks[zone.Id] = stock;
            
            Console.WriteLine($"Zone {zone.Name} (ID: {zone.Id}): stock={stock}, capacity={zone.Capacity}");
        }

        var result = new Dictionary<string, ZoneOccupancyDto>();
        
        var mainZonesList = new[] { "A", "B", "C", "D", "E", "F" };
        
        foreach (var mainZone in mainZonesList)
        {
            var zonesInMain = zones.Where(z => z.Name.StartsWith(mainZone)).ToList();
            if (zonesInMain.Any())
            {
                var totalStock = zonesInMain.Sum(z => zoneStocks.ContainsKey(z.Id) ? zoneStocks[z.Id] : 0);
                var totalCapacity = zonesInMain.Sum(z => z.Capacity);
                
                result[mainZone] = new ZoneOccupancyDto { Stock = totalStock, Capacity = totalCapacity };
                Console.WriteLine($"{mainZone} bölgesi toplam: {totalStock}/{totalCapacity} ({zonesInMain.Count} raf)");
            }
            else
            {
                result[mainZone] = new ZoneOccupancyDto { Stock = 0, Capacity = 1400 };
                Console.WriteLine($"{mainZone} bölgesi: 0/1400 (varsayılan - bu bölgede raf yok)");
            }
        }
        
        var jsonResult = JsonSerializer.Serialize(result);
        Console.WriteLine($"Dönen sonuç: {jsonResult}");
        return result;
    }

    public async Task<bool> ResetDataAsync(string companyId)
    {
        var movements = await _repository.Query(companyId).ToListAsync();
        foreach (var m in movements) _repository.Delete(m);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> InitializeZonesAsync(string companyId)
    {
        var mainZonesList = new[] { "A", "B", "C", "D", "E", "F" };
        
        foreach (var mainZone in mainZonesList)
        {
            for (int aisle = 1; aisle <= 4; aisle++)
            {
                for (int rack = 1; rack <= 7; rack++)
                {
                    var zoneName = $"{mainZone}-K{aisle}-R{rack}";
                    var existingZone = await _zoneRepository.Query(companyId)
                        .FirstOrDefaultAsync(z => z.Name == zoneName);
                    
                    if (existingZone == null)
                    {
                        var newZone = new WarehouseZone
                        {
                            Name = zoneName,
                            Description = $"{mainZone} Bölgesi, Koridor {aisle}, Raf {rack}",
                            CompanyId = companyId,
                            Capacity = 50
                        };
                        await _zoneRepository.AddAsync(newZone);
                        Console.WriteLine($"Zone oluşturuldu: {zoneName}");
                    }
                }
            }
        }
        
        await _zoneRepository.SaveChangesAsync();
        Console.WriteLine("Tüm zone'lar oluşturuldu!");
        return true;
    }

    public async Task<List<RackDetailDto>> GetRackDetailsAsync(int warehouseZoneId, string companyId)
    {
        Console.WriteLine($"=== GetRackDetailsAsync çağrıldı. ZoneId: {warehouseZoneId} ===");
        
        var rackDetails = await _repository.Query(companyId)
            .Include(m => m.Product)
            .Where(m => m.WarehouseZoneId == warehouseZoneId)
            .GroupBy(m => m.ProductId)
            .Select(g => new RackDetailDto
            {
                ProductId = g.Key,
                ProductName = g.First().Product != null ? g.First().Product.Name : "Bilinmiyor",
                Quantity = g.Sum(m => m.MovementType == "IN" ? m.Quantity : 0) - 
                          g.Sum(m => m.MovementType == "OUT" ? m.Quantity : 0),
                CompanyId = companyId
            })
            .Where(x => x.Quantity > 0)
            .ToListAsync();

        Console.WriteLine($"Rafta {rackDetails.Count} farklı ürün bulundu.");
        foreach (var item in rackDetails)
        {
            Console.WriteLine($"  Ürün: {item.ProductName}, Miktar: {item.Quantity}");
        }
        
        return rackDetails;
    }

    // RAPOR METOTLARI
    public async Task<WarehouseReportDto> GetWarehouseReportAsync(string companyId)
    {
        Console.WriteLine($"=== Rapor oluşturuluyor. CompanyId: {companyId} ===");
        
        var products = await _repository.Query(companyId)
            .Include(m => m.Product)
            .Where(m => m.Product != null)
            .GroupBy(m => m.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                ProductName = g.First().Product != null ? g.First().Product.Name : "Bilinmiyor",
                Barcode = g.First().Product != null ? g.First().Product.Barcode : "",
                TotalStock = g.Sum(m => m.MovementType == "IN" ? m.Quantity : 0) - 
                            g.Sum(m => m.MovementType == "OUT" ? m.Quantity : 0)
            })
            .Where(x => x.TotalStock > 0)
            .ToListAsync();

        var productStocks = new List<ProductStockDto>();
        
        foreach (var product in products)
        {
            var locations = await _repository.Query(companyId)
                .Include(m => m.WarehouseZone)
                .Where(m => m.ProductId == product.ProductId)
                .GroupBy(m => m.WarehouseZoneId)
                .Select(g => new RackLocationDto
                {
                    ZoneName = g.First().WarehouseZone != null ? g.First().WarehouseZone.Name : "Bilinmiyor",
                    Quantity = g.Sum(m => m.MovementType == "IN" ? m.Quantity : 0) - 
                              g.Sum(m => m.MovementType == "OUT" ? m.Quantity : 0)
                })
                .Where(x => x.Quantity > 0)
                .ToListAsync();

            productStocks.Add(new ProductStockDto
            {
                ProductId = product.ProductId,
                ProductName = product.ProductName,
                Barcode = product.Barcode,
                TotalStock = product.TotalStock,
                Locations = locations
            });
        }

        var zoneReports = new List<ZoneReportDto>();
        var mainZones = new[] { "A", "B", "C", "D", "E", "F" };
        
        foreach (var zone in mainZones)
        {
            var zonesInMain = await _zoneRepository.Query(companyId)
                .Where(z => z.Name.StartsWith(zone))
                .ToListAsync();

            var totalStock = 0;
            var totalCapacity = 0;

            foreach (var z in zonesInMain)
            {
                var stock = await _repository.Query(companyId)
                    .Where(m => m.WarehouseZoneId == z.Id)
                    .GroupBy(m => m.WarehouseZoneId)
                    .Select(g => g.Sum(m => m.MovementType == "IN" ? m.Quantity : 0) - g.Sum(m => m.MovementType == "OUT" ? m.Quantity : 0))
                    .FirstOrDefaultAsync();
                
                totalStock += stock;
                totalCapacity += z.Capacity;
            }

            zoneReports.Add(new ZoneReportDto
            {
                Zone = zone,
                Stock = totalStock,
                Capacity = totalCapacity > 0 ? totalCapacity : 1400,
                OccupancyPercentage = totalCapacity > 0 ? (int)((double)totalStock / totalCapacity * 100) : 0
            });
        }

        var criticalProducts = productStocks
            .Where(p => p.TotalStock < 50)
            .Select(p => new CriticalProductDto
            {
                ProductId = p.ProductId,
                ProductName = p.ProductName,
                TotalStock = p.TotalStock,
                CriticalThreshold = 50
            })
            .ToList();

        var totalProducts = productStocks.Count;
        var totalStockAll = productStocks.Sum(p => p.TotalStock);

        var report = new WarehouseReportDto
        {
            CompanyId = companyId,
            ReportDate = DateTime.UtcNow,
            TotalProducts = totalProducts,
            TotalStock = totalStockAll,
            Zones = zoneReports,
            CriticalProducts = criticalProducts,
            ProductStocks = productStocks
        };

        return report;
    }

    // QUESTPDF İLE OLUŞTURULMUŞ METOT
    public async Task<byte[]> GeneratePdfReportAsync(string companyId)
    {
        // Lisans ayarı (deneme sürümü için)
        QuestPDF.Settings.License = LicenseType.Community;
        
        var report = await GetWarehouseReportAsync(companyId);
        
        // QuestPDF ile PDF oluştur
        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(20);
                page.DefaultTextStyle(x => x.FontSize(10));
                
                // Başlık
                page.Header().Element(ComposeHeader);
                
                // İçerik
                page.Content().Element(container => ComposeContent(container, report));
                
                // Altbilgi
                page.Footer().AlignCenter().Text(text =>
                {
                    text.CurrentPageNumber();
                    text.Span(" / ");
                    text.TotalPages();
                });
            });
        }).GeneratePdf();
        
        return pdf;
    }

    private void ComposeHeader(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(column =>
            {
                column.Item().Text("AKILLI DEPO YÖNETİM SİSTEMİ")
                    .FontSize(16).Bold().FontColor(Colors.Blue.Medium);
                
                column.Item().Text($"Rapor Tarihi: {DateTime.Now:dd.MM.yyyy HH:mm}")
                    .FontSize(10).FontColor(Colors.Grey.Darken2);
                
                column.Item().Text($"Şirket: COMP-101")
                    .FontSize(10).FontColor(Colors.Grey.Darken2);
            });
        });
    }

    private void ComposeContent(IContainer container, WarehouseReportDto report)
    {
        container.Column(column =>
        {
            // Özet bilgiler
            column.Item().PaddingVertical(10).Element(c => ComposeSummary(c, report));
            
            // Bölge Doluluk Tablosu
            column.Item().PaddingVertical(10).Element(c => ComposeZoneTable(c, report));
            
            // Kritik Stok Tablosu
            column.Item().PaddingVertical(10).Element(c => ComposeCriticalTable(c, report));
            
            // Stok Listesi
            column.Item().PaddingVertical(10).Element(c => ComposeProductTable(c, report));
        });
    }

    private void ComposeSummary(IContainer container, WarehouseReportDto report)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.RelativeColumn();
                columns.RelativeColumn();
            });
            
            table.Cell().Element(CellStyle).Text($"Toplam Ürün Çeşidi: {report.TotalProducts}").FontSize(12).Bold();
            table.Cell().Element(CellStyle).Text($"Toplam Stok Miktarı: {report.TotalStock}").FontSize(12).Bold();
            
            static IContainer CellStyle(IContainer container)
            {
                return container.Border(1).BorderColor(Colors.Grey.Lighten2).Padding(5);
            }
        });
    }

    private void ComposeZoneTable(IContainer container, WarehouseReportDto report)
    {
        container.Column(column =>
        {
            column.Item().Text("Bölge Doluluk Raporu").FontSize(14).Bold();
            
            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });
                
                // Başlıklar
                table.Header(header =>
                {
                    header.Cell().Element(CellStyle).Text("Bölge").Bold();
                    header.Cell().Element(CellStyle).Text("Stok").Bold();
                    header.Cell().Element(CellStyle).Text("Kapasite").Bold();
                    header.Cell().Element(CellStyle).Text("Doluluk").Bold();
                });
                
                // Veriler
                foreach (var zone in report.Zones)
                {
                    var color = zone.OccupancyPercentage > 90 ? Colors.Red.Medium : 
                               zone.OccupancyPercentage > 70 ? Colors.Orange.Medium : 
                               Colors.Green.Medium;
                    
                    table.Cell().Element(CellStyle).Text($"Bölge {zone.Zone}");
                    table.Cell().Element(CellStyle).Text(zone.Stock.ToString());
                    table.Cell().Element(CellStyle).Text(zone.Capacity.ToString());
                    table.Cell().Element(CellStyle).Text($"{zone.OccupancyPercentage}%").FontColor(color);
                }
                
                static IContainer CellStyle(IContainer container)
                {
                    return container.Border(1).BorderColor(Colors.Grey.Lighten2).Padding(5);
                }
            });
        });
    }

    private void ComposeCriticalTable(IContainer container, WarehouseReportDto report)
    {
        if (!report.CriticalProducts.Any()) return;
        
        container.Column(column =>
        {
            column.Item().Text("Kritik Stok Seviyesi (50 altı)").FontSize(14).Bold();
            
            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });
                
                table.Header(header =>
                {
                    header.Cell().Element(CellStyle).Text("Ürün").Bold();
                    header.Cell().Element(CellStyle).Text("Stok").Bold();
                });
                
                foreach (var product in report.CriticalProducts)
                {
                    table.Cell().Element(CellStyle).Text(product.ProductName);
                    table.Cell().Element(CellStyle).Text(product.TotalStock.ToString()).FontColor(Colors.Red.Medium);
                }
                
                static IContainer CellStyle(IContainer container)
                {
                    return container.Border(1).BorderColor(Colors.Grey.Lighten2).Padding(5);
                }
            });
        });
    }

    private void ComposeProductTable(IContainer container, WarehouseReportDto report)
    {
        container.Column(column =>
        {
            column.Item().Text("Stok Listesi (İlk 20 Ürün)").FontSize(14).Bold();
            
            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn(2);
                });
                
                table.Header(header =>
                {
                    header.Cell().Element(CellStyle).Text("Ürün").Bold();
                    header.Cell().Element(CellStyle).Text("Barkod").Bold();
                    header.Cell().Element(CellStyle).Text("Stok").Bold();
                    header.Cell().Element(CellStyle).Text("Raf Lokasyonları").Bold();
                });
                
                foreach (var product in report.ProductStocks.Take(20))
                {
                    var locations = string.Join(", ", product.Locations.Select(l => $"{l.ZoneName}: {l.Quantity}"));
                    
                    table.Cell().Element(CellStyle).Text(product.ProductName);
                    table.Cell().Element(CellStyle).Text(product.Barcode);
                    table.Cell().Element(CellStyle).Text(product.TotalStock.ToString());
                    table.Cell().Element(CellStyle).Text(locations);
                }
                
                static IContainer CellStyle(IContainer container)
                {
                    return container.Border(1).BorderColor(Colors.Grey.Lighten2).Padding(5);
                }
            });
        });
    }
}