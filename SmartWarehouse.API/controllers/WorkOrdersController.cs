using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartWarehouse.API.Constants;
using SmartWarehouse.API.DTOs.WorkOrderDTOs;
using SmartWarehouse.API.Managers;

namespace SmartWarehouse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WorkOrdersController : ControllerBase
{
    private readonly IWorkOrderManager _manager;
    private string CurrentCompanyId => User.FindFirst("CompanyId")?.Value ?? string.Empty;

    public WorkOrdersController(IWorkOrderManager manager)
    {
        _manager = manager;
    }

    [HttpPost("create")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager}")]
    public async Task<IActionResult> Create([FromBody] CreateWorkOrderDto dto)
    {
        try
        {
            var result = await _manager.CreateWorkOrderAsync(dto, CurrentCompanyId);
            return Ok(new { Success = true, Data = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("start/{id}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager}")]
    public async Task<IActionResult> Start(int id)
    {
        try
        {
            var result = await _manager.StartWorkOrderAsync(id, CurrentCompanyId);
            return Ok(new { Success = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("complete/{id}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager}")]
    public async Task<IActionResult> Complete(int id, [FromBody] CompleteWorkOrderRequest request)
    {
        try
        {
            var result = await _manager.CompleteWorkOrderAsync(id, request.ActualQuantity, request.WastedQuantities, CurrentCompanyId);
            return Ok(new { Success = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("cancel/{id}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager}")]
    public async Task<IActionResult> Cancel(int id)
    {
        try
        {
            var result = await _manager.CancelWorkOrderAsync(id, CurrentCompanyId);
            return Ok(new { Success = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Success = false, Message = ex.Message });
        }
    }

    [HttpGet("get-all")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.WarehouseManager},{UserRoles.WarehouseStaff}")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 25, [FromQuery] string? status = null)
    {
        var (data, totalCount) = await _manager.GetWorkOrdersPaginatedAsync(CurrentCompanyId, page, pageSize, status);
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
        var result = await _manager.GetWorkOrderByIdAsync(id, CurrentCompanyId);
        if (result == null)
            return NotFound(new { Success = false, Message = "Üretim emri bulunamadı." });

        return Ok(new { Success = true, Data = result });
    }
}

// Yardımcı sınıf (CompleteWorkOrderRequest)
public class CompleteWorkOrderRequest
{
    public decimal ActualQuantity { get; set; }
    public Dictionary<int, decimal>? WastedQuantities { get; set; }
}