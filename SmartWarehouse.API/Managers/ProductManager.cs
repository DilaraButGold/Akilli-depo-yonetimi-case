using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.DTOs.ProductDTOs;
using SmartWarehouse.API.Entities;
using SmartWarehouse.API.Repositories;

namespace SmartWarehouse.API.Managers;

public class ProductManager : IProductManager
{
    private readonly IRepository<Product> _repository;

    public ProductManager(IRepository<Product> repository)
    {
        _repository = repository;
    }

    public async Task<(IEnumerable<ProductDto> Data, int TotalCount)> GetPaginatedAsync(string companyId, int page, int pageSize, string? searchTerm)
    {
        var query = _repository.Query(companyId);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            query = query.Where(p => p.Name.Contains(searchTerm) || p.Barcode.Contains(searchTerm));
        }

        var totalCount = await query.CountAsync();

        var products = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtoList = products.Select(p => new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Barcode = p.Barcode,
            Description = p.Description,
            CompanyId = p.CompanyId
        }).ToList();

        return (dtoList, totalCount);
    }

    public async Task<ProductDto?> GetByIdAsync(int id, string companyId)
    {
        var product = await _repository.GetByIdAsync(id, companyId);
        if (product == null) return null;

        return new ProductDto
        {
            Id = product.Id,
            Name = product.Name,
            Barcode = product.Barcode,
            Description = product.Description,
            CompanyId = product.CompanyId
        };
    }

    public async Task<ProductDto> CreateAsync(CreateProductDto dto)
    {
        var entity = new Product
        {
            Name = dto.Name,
            Barcode = dto.Barcode,
            Description = dto.Description,
            CompanyId = dto.CompanyId
        };

        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();

        return new ProductDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Barcode = entity.Barcode,
            Description = entity.Description,
            CompanyId = entity.CompanyId
        };
    }

    public async Task<bool> UpdateAsync(UpdateProductDto dto)
    {
        var entity = await _repository.GetByIdAsync(dto.Id, dto.CompanyId);
        
        if (entity == null) return false;

        entity.Name = dto.Name;
        entity.Barcode = dto.Barcode;
        entity.Description = dto.Description;

        _repository.Update(entity);
        await _repository.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id, string companyId)
    {
        var entity = await _repository.GetByIdAsync(id, companyId);
        if (entity == null) return false;

        // Soft Delete kuralı
        entity.IsDeleted = true;
        
        _repository.Update(entity);
        await _repository.SaveChangesAsync();

        return true;
    }
}