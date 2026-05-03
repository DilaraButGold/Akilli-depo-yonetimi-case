# 🏭 Akıllı Depo Yönetim Sistemi (Smart Warehouse Management System)

> **.NET 9.0 Web API + React 18 + React Native**  
> Çok kiracılı (multi‑tenant), rol tabanlı yetkilendirme, üretim emri takibi ve yapay zeka destekli stok tahmini içeren **tam kapsamlı** depo yönetim platformu.

---

## 📖 Proje Hakkında

Bu proje, mülakat dokümanında belirtilen gereksinimler doğrultusunda geliştirilmiş, küçük ve orta ölçekli üretim tesislerinin depo operasyonlarını dijitalleştirmeyi hedefleyen bir sistemdir.  

- **Web Paneli:** Depo yöneticileri ve personel için kapsamlı bir yönetim arayüzü.  
- **Mobil Uygulama:** Barkod/QR kod okuma ile anlık stok giriş/çıkış işlemleri.  
- **Yapay Zeka:** .NET içerisinde **Moving Average** algoritması ile stok tükenme tahmini.  

---

## Proje Mimarisi (N‑Tier Architecture) 

┌─────────────────────────────────────────────────────┐
│ FRONTEND │
│ React 18 · TypeScript · MUI · Recharts · SignalR │
│ React Native (Expo) · Expo Barcode Scanner │
├─────────────────────────────────────────────────────┤
│ BACKEND │
│ ASP.NET Core 9.0 · EF Core · JWT · Identity │
│ N‑Tier: Entity → Repository → Manager → Controller │
├─────────────────────────────────────────────────────┤
│ VERİTABANI │
│ SQL Server · EF Core Migrations │
└─────────────────────────────────────────────────────┘ 


**Katmanlar:**
- **Entity Katmanı:** `BaseEntity` ile ortak alanlar (`CompanyId`, `IsDeleted`).  
- **Repository Katmanı:** `Generic Repository Pattern` ve `Transaction` yönetimi.  
- **Manager (Business) Katmanı:** İş kuralları, validasyon ve kapasite kontrolleri.  
- **Controller Katmanı:** RESTful API endpoint'leri (JWT + Rol bazlı yetkilendirme).

---

## Özellikler

### Temel Depo Yönetimi
- ✅ Ürün CRUD (soft‑delete ile veri güvenliği)  
- ✅ Stok Giriş (IN) / Çıkış (OUT) işlemleri, kapasite kontrolü  
- ✅ **Fixed Location (Sabit Lokasyon)** depo modeli: 6 Bölge → 4 Koridor → 7 Raf → Toplam 168 Raf  
- ✅ Server‑side pagination, arama ve filtreleme  
- ✅ **Multi‑Tenant:** Her entity'de `CompanyId` ile tam veri izolasyonu  
- ✅ **İnteraktif Depo Haritası:** Bölge dolulukları renk kodlu, raf detayları modal ile görüntüleme  
- ✅ **Kritik Stok Uyarıları:** 50 birim altına düşen raflar için anlık bildirim  

### Kimlik Doğrulama & Yetkilendirme
- ✅ ASP.NET Core **Identity** + **JWT** (JSON Web Token)  
- ✅ Rol tabanlı erişim kontrolü: `Admin`, `WarehouseManager`, `WarehouseStaff`, `Accountant`  
- ✅ **AppDbContext** üzerinde global `HasQueryFilter` ile şirket bazlı izolasyon  

### Üretim Emri (Work Order) Modülü
- ✅ Mamul ürün seçimi, otomatik reçete (Bill of Materials) okuma  
- ✅ Malzeme yeterlilik kontrolü  
- ✅ Üretim başlatma → hammadde stoklarından düşme  
- ✅ Üretim tamamlama → mamul stoğa ekleme, fire kaydı  
- ✅ Üretim emri durum takibi: Taslak → Onaylandı → Üretimde → Tamamlandı → İptal  

### Veri Bilimi (AI/ML) Entegrasyonu
- ✅ **Tamamen .NET içerisinde** çalışan stok tahmin mekanizması  
- ✅ **Hareketli Ortalama (Moving Average)** yöntemiyle günlük çıkış tahmini  
- ✅ "Mevcut stok kaç gün yeter?" sorusuna cevap  
- ✅ **Kritik Stok Uyarı Kartı:** Dashboard'da tahmini tükenme süresi 3 günden az olan ürünler listelenir  

### Mobil Uygulama (React Native / Expo)
- ✅ **Expo** ile oluşturulmuş cross‑platform mobil uygulama  
- ✅ **Expo Barcode Scanner** ile kamera üzerinden barkod/QR kod okuma  
- ✅ Okunan barkod ile ürün sorgulama ve stok hareketi oluşturma  
- ✅ JWT tabanlı güvenli giriş, AsyncStorage ile token saklama  

### Gerçek Zamanlı Bildirimler & Raporlama
- ✅ **SignalR** ile canlı stok güncellemeleri (WebSocket bağlantısı)  
- ✅ **QuestPDF** ile profesyonel depo durum raporu (PDF)  
- ✅ Dashboard'da bölge doluluk grafikleri (Pie Chart & Bar Chart – Recharts)  



---

## 🛠️ Kullanılan Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | .NET 9.0, ASP.NET Core Web API, Entity Framework Core, JWT, ASP.NET Core Identity |
| **Frontend** | React 18, TypeScript, MUI 5, Recharts, SignalR, React Router |
| **Mobil** | React Native (Expo), Expo Barcode Scanner, AsyncStorage, React Navigation |
| **Veritabanı** | SQL Server, EF Core Migrations |
| **Gerçek Zamanlı** | SignalR (WebSocket) |
| **PDF Raporlama** | QuestPDF |
| **Kimlik Doğrulama** | JWT + ASP.NET Core Identity + Rol Bazlı Yetkilendirme |
| **Mimari** | N‑Tier (Entity → Repository → Manager → Controller), Generic Repository Pattern |

---

## ⚙️ Kurulum ve Çalıştırma

### Ön Gereksinimler
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 18+](https://nodejs.org/)
- [SQL Server](https://www.microsoft.com/tr-tr/sql-server/sql-server-downloads)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (mobil uygulama için)

### 1. Backend (SmartWarehouse.API)
```bash
cd SmartWarehouse.API
dotnet restore
dotnet ef database update
dotnet run 

API varsayılan olarak http://localhost:5041 adresinde çalışır.



Frontend (SmartWarehouse.UI)
cd SmartWarehouse.UI
npm install
npm run dev 

Panel varsayılan olarak http://localhost:5173 adresinde çalışır.


Mobil Uygulama (WarehouseMobile)
cd WarehouseMobile
npm install
npx expo start -c  

Rol	Yetkiler
Admin	Tüm işlemler (ürün, stok, rapor, kullanıcı yönetimi, sistem sıfırlama)
WarehouseManager	Ürün/stok yönetimi, üretim emri oluşturma/başlatma/tamamlama, rapor görüntüleme
WarehouseStaff	Stok giriş/çıkış işlemleri, ürün listesini görüntüleme
Accountant	Stok özeti, rapor ve PDF indirme
Demo Kullanıcı: admin@depo.com / Admin123! / 11111111-1111-1111-1111-111111111111

