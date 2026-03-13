using SmartWarehouse.API.DTOs.ProductDTOs;

namespace SmartWarehouse.API.Managers;

public interface IProductManager
{
    Task<(IEnumerable<ProductDto> Data, int TotalCount)> GetPaginatedAsync(string companyId, int page, int pageSize, string? searchTerm);
    
    Task<ProductDto?> GetByIdAsync(int id, string companyId);
    
    Task<ProductDto> CreateAsync(CreateProductDto dto);
    
    Task<bool> UpdateAsync(UpdateProductDto dto);
    
    Task<bool> DeleteAsync(int id, string companyId);
}