using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using SmartWarehouse.API.Entities;

namespace SmartWarehouse.API.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// AppUser ve rollerine göre JWT token üretir.
    /// </summary>
    /// <param name="user">Identity kullanıcısı (AppUser)</param>
    /// <param name="roles">Kullanıcının roller listesi</param>
    /// <returns>JWT token string</returns>
    public string GenerateToken(AppUser user, IList<string> roles)
    {
        // 1. Claim'leri oluştur
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim(ClaimTypes.GivenName, $"{user.FirstName} {user.LastName}".Trim()),
            new Claim("CompanyId", user.CompanyId.ToString()), // Multi-tenant için
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()) // Token ID
        };

        // 2. Rolleri claim olarak ekle
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        // 3. JWT ayarlarını configuration'dan al
        var jwtKey = _configuration["Jwt:Key"] 
            ?? throw new InvalidOperationException("JWT Key bulunamadı.");
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // 4. Token descriptor oluştur
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(8), // Token süresi
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        // 5. Token'ı oluştur ve yaz
        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}