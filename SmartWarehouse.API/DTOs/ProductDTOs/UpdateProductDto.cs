namespace SmartWarehouse.API.DTOs.ProductDTOs;

public class UpdateProductDto
{
    public int Id { get; set; } 
    
    public string Name { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    public string CompanyId { get; set; } = string.Empty; 
}