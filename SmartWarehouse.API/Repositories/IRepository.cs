using SmartWarehouse.API.Entities;

namespace SmartWarehouse.API.Repositories;

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(int id, string companyId);
    IQueryable<T> Query(string companyId);
    Task AddAsync(T entity);
    void Update(T entity);
    Task SaveChangesAsync();
}