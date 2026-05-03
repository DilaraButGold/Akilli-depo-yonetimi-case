namespace SmartWarehouse.API.DTOs;

public class LoginDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string CompanyId { get; set; } = string.Empty;
}