using SmartWarehouse.API.Constants;

namespace SmartWarehouse.API.DTOs;

public class RegisterDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = UserRoles.WarehouseStaff;
    public string CompanyId { get; set; } = string.Empty;
}