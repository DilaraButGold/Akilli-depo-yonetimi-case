using SmartWarehouse.API.Entities;

namespace SmartWarehouse.API.Services;

public interface ITokenService
{
    /// <summary>
    /// Kullanıcı bilgileri ve rollerine göre JWT token üretir.
    /// </summary>
    /// <param name="user">Identity kullanıcısı (AppUser)</param>
    /// <param name="roles">Kullanıcıya atanmış rollerin listesi</param>
    /// <returns>İmzalanmış JWT token string'i</returns>
    string GenerateToken(AppUser user, IList<string> roles);
}