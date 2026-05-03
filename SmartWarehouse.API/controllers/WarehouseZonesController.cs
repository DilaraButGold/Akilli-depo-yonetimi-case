using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartWarehouse.API.DTOs.WarehouseZoneDTOs;
using SmartWarehouse.API.Managers;
using SmartWarehouse.API.Entities;
using SmartWarehouse.API.Constants; 

namespace SmartWarehouse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WarehouseZonesController : ControllerBase
{
    private readonly IWarehouseZoneManager _manager;
    private string CurrentCompanyId => User.FindFirst("CompanyId")?.Value ?? string.Empty;

    public WarehouseZonesController(IWarehouseZoneManager manager)
    {
        _manager = manager;
    }

    [HttpGet("get-all")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager},{UserRoles.WarehouseStaff}")] 
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 25, 
        [FromQuery] string? searchTerm = null)
    {
        if (string.IsNullOrEmpty(CurrentCompanyId)) 
            return BadRequest("CompanyId required.");

        var (data, totalCount) = await _manager.GetPaginatedAsync(CurrentCompanyId, page, pageSize, searchTerm);

        return Ok(new
        {
            Success = true,
            Data = data,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
        });
    }

    [HttpGet("get-by-id/{id}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager},{UserRoles.WarehouseStaff}")] 
    public async Task<IActionResult> GetById(int id)
    {
        var zone = await _manager.GetByIdAsync(id, CurrentCompanyId);
        if (zone == null) return Forbid();

        return Ok(zone);
    }

    [HttpPost("create")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager}")] 
    public async Task<IActionResult> Create([FromBody] CreateWarehouseZoneDto dto)
    {
        dto.CompanyId = CurrentCompanyId;
        var result = await _manager.CreateAsync(dto);
        return Ok(result);
    }

    [HttpPost("update")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager}")] 
    public async Task<IActionResult> Update([FromBody] UpdateWarehouseZoneDto dto)
    {
        dto.CompanyId = CurrentCompanyId;
        var result = await _manager.UpdateAsync(dto);
        if (!result) return Forbid();

        return Ok(new { Success = true, Message = "Zone updated successfully." });
    }

    [HttpPost("delete")]
    [Authorize(Roles = UserRoles.Admin)] 
    public async Task<IActionResult> Delete([FromBody] int id)
    {
        var result = await _manager.DeleteAsync(id, CurrentCompanyId);
        if (!result) return Forbid();

        return Ok(new { Success = true, Message = "Zone deleted successfully." });
    }
}