using Microsoft.AspNetCore.Authorization;  
using Microsoft.AspNetCore.Mvc;
using SmartWarehouse.API.DTOs.ProductDTOs;
using SmartWarehouse.API.Managers;
using SmartWarehouse.API.Entities;
using SmartWarehouse.API.Constants; 

namespace SmartWarehouse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]  
public class ProductsController : ControllerBase
{
    private readonly IProductManager _manager;
    
    
    private string CurrentCompanyId => User.FindFirst("CompanyId")?.Value ?? string.Empty;

    public ProductsController(IProductManager manager)
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
            return BadRequest("CompanyId not found in token.");

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
        var product = await _manager.GetByIdAsync(id, CurrentCompanyId);
        if (product == null) return Forbid();

        return Ok(product);
    }

    [HttpPost("create")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager}")] 
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
    {
        if (string.IsNullOrEmpty(CurrentCompanyId)) 
            return BadRequest("CompanyId not found in token.");

        dto.CompanyId = CurrentCompanyId;  
        var result = await _manager.CreateAsync(dto);
        return Ok(result);
    }

    [HttpPost("update")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager}")] 
    public async Task<IActionResult> Update([FromBody] UpdateProductDto dto)
    {
        dto.CompanyId = CurrentCompanyId;  
        var result = await _manager.UpdateAsync(dto);
        if (!result) return Forbid();

        return Ok(new { Success = true, Message = "Product updated successfully." });
    }

    [HttpPost("delete")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager}")] 
    public async Task<IActionResult> Delete([FromBody] int id)
    {
        var result = await _manager.DeleteAsync(id, CurrentCompanyId);
        if (!result) return Forbid();

        return Ok(new { Success = true, Message = "Product deleted successfully." });
    }
}