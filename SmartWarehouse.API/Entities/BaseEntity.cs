namespace SmartWarehouse.API.Entities;


public abstract class BaseEntity
{
    
    public int Id { get; set; } 
    
    
    public string CompanyId { get; set; } = string.Empty; 
    
    public bool IsDeleted { get; set; } = false; 

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; } 
}