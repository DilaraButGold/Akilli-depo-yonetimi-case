using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.DTOs.WarehouseZoneDTOs;
using SmartWarehouse.API.Entities;
using SmartWarehouse.API.Repositories;

namespace SmartWarehouse.API.Managers;

public class WarehouseZoneManager : IWarehouseZoneManager
{
    private readonly IRepository<WarehouseZone> _repository;

    public WarehouseZoneManager(IRepository<WarehouseZone> repository)
    {
        _repository = repository;
    }

    public async Task<(IEnumerable<WarehouseZoneDto> Data, int TotalCount)> GetPaginatedAsync(string companyId, int page, int pageSize, string? searchTerm)
    {
        var query = _repository.Query(companyId);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            query = query.Where(z => z.Name.Contains(searchTerm));
        }

        var totalCount = await query.CountAsync();

        var zones = await query
            .OrderByDescending(z => z.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtoList = zones.Select(z => new WarehouseZoneDto
        {
            Id = z.Id,
            Name = z.Name,
            Description = z.Description,
            Capacity = z.Capacity,
            CompanyId = z.CompanyId
        }).ToList();

        return (dtoList, totalCount);
    }

    public async Task<WarehouseZoneDto?> GetByIdAsync(int id, string companyId)
    {
        var zone = await _repository.GetByIdAsync(id, companyId);
        if (zone == null) return null;

        return new WarehouseZoneDto
        {
            Id = zone.Id,
            Name = zone.Name,
            Description = zone.Description,
            Capacity = zone.Capacity,
            CompanyId = zone.CompanyId
        };
    }

    public async Task<WarehouseZoneDto> CreateAsync(CreateWarehouseZoneDto dto)
    {
        var entity = new WarehouseZone
        {
            Name = dto.Name,
            Description = dto.Description,
            CompanyId = dto.CompanyId,
            Capacity = dto.Capacity ?? 50
        };

        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();

        return new WarehouseZoneDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Description = entity.Description,
            Capacity = entity.Capacity,
            CompanyId = entity.CompanyId
        };
    }

    public async Task<bool> UpdateAsync(UpdateWarehouseZoneDto dto)
    {
        var entity = await _repository.GetByIdAsync(dto.Id, dto.CompanyId);
        if (entity == null) return false;

        entity.Name = dto.Name;
        entity.Description = dto.Description;
        if (dto.Capacity.HasValue)
            entity.Capacity = dto.Capacity.Value;

        _repository.Update(entity);
        await _repository.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id, string companyId)
    {
        var entity = await _repository.GetByIdAsync(id, companyId);
        if (entity == null) return false;

        entity.IsDeleted = true;
        
        _repository.Update(entity);
        await _repository.SaveChangesAsync();

        return true;
    }
}