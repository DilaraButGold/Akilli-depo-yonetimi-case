using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using SmartWarehouse.API.Data;
using SmartWarehouse.API.Entities;

namespace SmartWarehouse.API.Repositories;

public class Repository<T> : IRepository<T> where T : BaseEntity
{
    private readonly AppDbContext _context;
    private readonly DbSet<T> _dbSet;

    public Repository(AppDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(int id, string companyId) =>
        await _dbSet.FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId && !e.IsDeleted);

    public IQueryable<T> Query(string companyId) =>
        _dbSet.Where(e => e.CompanyId == companyId && !e.IsDeleted).AsQueryable();

    public async Task AddAsync(T entity) => await _dbSet.AddAsync(entity);

    public void Update(T entity)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        _context.Entry(entity).State = EntityState.Modified;
    }

    public void Delete(T entity) => _dbSet.Remove(entity);

    public async Task SaveChangesAsync() => await _context.SaveChangesAsync();

    public async Task<IDbContextTransaction> BeginTransactionAsync() => 
        await _context.Database.BeginTransactionAsync();
}