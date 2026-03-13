using Microsoft.AspNetCore.Mvc;
using SmartWarehouse.API.DTOs.ProductDTOs;
using SmartWarehouse.API.Managers;

namespace SmartWarehouse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductManager _manager;

    public ProductsController(IProductManager manager)
    {
        _manager = manager;
    }

    [HttpGet("get-all")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string companyId, 
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 25, 
        [FromQuery] string? searchTerm = null)
    {
        if (string.IsNullOrEmpty(companyId)) return BadRequest("CompanyId is required.");

        var (data, totalCount) = await _manager.GetPaginatedAsync(companyId, page, pageSize, searchTerm);

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
    public async Task<IActionResult> GetById(int id, [FromQuery] string companyId)
    {
        var product = await _manager.GetByIdAsync(id, companyId);
        if (product == null) return Forbid(); // Ürün yoksa veya o şirkete ait değilse 403

        return Ok(product);
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
    {
        if (string.IsNullOrEmpty(dto.CompanyId)) return BadRequest("CompanyId is required.");

        var result = await _manager.CreateAsync(dto);
        return Ok(result);
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateProductDto dto)
    {
        var result = await _manager.UpdateAsync(dto);
        if (!result) return Forbid(); // Yetki hatası veya bulunamadı

        return Ok(new { Success = true, Message = "Product updated successfully." });
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] int id, [FromQuery] string companyId)
    {
        var result = await _manager.DeleteAsync(id, companyId);
        if (!result) return Forbid();

        return Ok(new { Success = true, Message = "Product deleted (soft-delete) successfully." });
    }
}