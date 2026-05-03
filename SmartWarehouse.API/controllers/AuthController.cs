using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.Entities;
using SmartWarehouse.API.DTOs;
using SmartWarehouse.API.Services;
using SmartWarehouse.API.Data;

namespace SmartWarehouse.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly RoleManager<AppRole> _roleManager;
    private readonly ITokenService _tokenService;
    private readonly AppDbContext _dbContext;

    public AuthController(
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        RoleManager<AppRole> roleManager,
        ITokenService tokenService,
        AppDbContext dbContext)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _tokenService = tokenService;
        _dbContext = dbContext;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        // Gelen isteği logla
        Console.WriteLine($">>> LOGIN İSTEĞİ ALINDI - Email: {dto.Email}, CompanyId: '{dto.CompanyId}' (Uzunluk: {dto.CompanyId?.Length})");

        // 1. Email adresini normalize edip kullanıcıyı ara.
        var normalizedEmail = dto.Email.ToUpperInvariant();
        var user = await _dbContext.Users
            .IgnoreQueryFilters() // Global CompanyId filtresini yok say
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);

        // 2. Kullanıcı bulunamadıysa hata döndür.
        if (user == null)
        {
            Console.WriteLine($"[Login] BAŞARISIZ: Kullanıcı bulunamadı. Email: {dto.Email}");
            return Unauthorized(new { Success = false, Message = "Kullanıcı bulunamadı. Email adresini kontrol edin." });
        }

        // 3. Kullanıcı hesabı aktif değilse hata döndür.
        if (!user.IsActive)
        {
            Console.WriteLine($"[Login] BAŞARISIZ: Hesap pasif. Email: {dto.Email}");
            return Unauthorized(new { Success = false, Message = "Kullanıcı hesabı pasif durumda." });
        }

        // 4. CompanyId kontrolü (detaylı log ile)
        if (!Guid.TryParse(dto.CompanyId, out var requestCompanyId))
        {
            Console.WriteLine($"[Login] BAŞARISIZ: CompanyId parse edilemedi. Gelen değer: '{dto.CompanyId}'");
            return Unauthorized(new { Success = false, Message = "Geçersiz şirket ID formatı." });
        }

        if (user.CompanyId != requestCompanyId)
        {
            Console.WriteLine($"[Login] BAŞARISIZ: CompanyId uyuşmazlığı. Veritabanı: {user.CompanyId}, İstek: {requestCompanyId}");
            return Unauthorized(new { Success = false, Message = "Şirket bilgisi eşleşmiyor." });
        }

        // 5. Şifre kontrolü
        var passwordCheck = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, false);
        if (!passwordCheck.Succeeded)
        {
            Console.WriteLine($"[Login] BAŞARISIZ: Şifre yanlış. Email: {dto.Email}");
            return Unauthorized(new { Success = false, Message = "Şifre yanlış. Lütfen tekrar deneyin." });
        }

        // 6. Tüm kontroller başarılı. Kullanıcının rollerini al ve JWT token üret.
        var roles = await _userManager.GetRolesAsync(user);
        var token = _tokenService.GenerateToken(user, roles);

        Console.WriteLine($"[Login] BAŞARILI: {user.Email}, Rol: {string.Join(",", roles)}");

        // 7. Başarılı giriş yanıtını döndür.
        return Ok(new LoginResponseDto
        {
            Token = token,
            Email = user.Email!,
            FullName = $"{user.FirstName} {user.LastName}",
            Role = roles.FirstOrDefault() ?? "",
            CompanyId = user.CompanyId.ToString(),
            ExpiresAt = DateTime.UtcNow.AddHours(8)
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        // 1. CompanyId'yi geçerli bir Guid formatına çevir.
        if (!Guid.TryParse(dto.CompanyId, out var companyGuid))
            return BadRequest(new { Success = false, Message = "Geçersiz şirket ID formatı." });

        // 2. Atanmak istenen rolü kontrol et. Eğer rol henüz oluşturulmamışsa otomatik oluştur.
        var roleName = string.IsNullOrEmpty(dto.Role) ? "WarehouseStaff" : dto.Role;
        if (!await _roleManager.RoleExistsAsync(roleName))
        {
            var roleResult = await _roleManager.CreateAsync(new AppRole
            {
                Name = roleName,
                Description = $"{roleName} rolü otomatik oluşturuldu."
            });
            if (!roleResult.Succeeded)
                return BadRequest(roleResult.Errors);
        }

        // 3. Yeni kullanıcı nesnesini oluştur.
        var user = new AppUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            CompanyId = companyGuid,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        // 4. Kullanıcıyı veritabanına kaydet.
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        // 5. Kullanıcıya seçilen (veya varsayılan) rolü ata.
        await _userManager.AddToRoleAsync(user, roleName);

        return Ok(new { Success = true, Message = "Kullanıcı başarıyla oluşturuldu." });
    }
}