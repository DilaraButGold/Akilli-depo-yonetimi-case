 AKILLI DEPO YÖNETİM SİSTEMİ - PROJE ÇALIŞMA RAPORU

GİRİŞ

Bu rapor, mülakat dokümanında belirtilen gereksinimler doğrultusunda geliştirilen Akıllı Depo Yönetim Sistemi'nin detaylı açıklamasını içermektedir. Proje; temel depo operasyonlarını dijitalleştirmek, stok takibini görselleştirmek ve çoklu şirket (multi-tenant) yapısını desteklemek amacıyla geliştirilmiştir.

1. NE YAPILDI?

TEMEL VE TEKNİK ÇÖZÜMLER

Ürün Yönetimi: CRUD operasyonları (Ekleme, Düzenleme, Silme) başarıyla uygulandı. Silme işlemleri veri güvenliği için Soft Delete mantığıyla kurgulandı.

Depo Operasyonları: Stok giriş (IN) ve çıkış (OUT) işlemleri, kapasite ve yeterlilik kontrolleriyle entegre edildi.

Multi-Tenant: Her entity'de CompanyId alanı kullanılarak tam veri izolasyonu sağlandı.

Server-Side Pagination: Tüm listeleme sayfalarında 25 kayıtlık sayfalama, arama ve filtreleme desteği sunuldu.

Mimari Yapı: Veritabanı şeması EF Core Migration ile oluşturuldu; Frontend tarafında React, TypeScript ve MUI ile Single Page Application (SPA) deneyimi sağlandı.

2. KATMANLI MİMARİ VE TASARIM

MİMARİ KATMANLAR

Proje, sorumlulukların net ayrıldığı N-Tier Architecture prensibiyle geliştirilmiştir:

Entity Katmanı: BaseEntity üzerinden ortak alanların (CompanyId, IsDeleted) merkezi yönetimi.

Repository Katmanı: Generic Repository pattern ile merkezi veritabanı erişimi ve Transaction yönetimi.

Manager (Business) Katmanı: İş kuralları, validasyonlar ve kapasite kontrollerinin yapıldığı merkezdir.

Controller Katmanı: HTTP standartlarına (POST/GET) uygun API endpoint yönetimi.

MULTI-TENANT VE SOFT DELETE YAKLAŞIMI

Veri İzolasyonu: Repository katmanındaki global sorgu filtreleri sayesinde, bir şirket sadece kendi verilerini görebilir.

Veri Güvenliği: Silme işlemleri IsDeleted bayrağı ile yapılır. Bu sayede veri kaybı önlenir, geçmiş stok hareketleri korunur ve yanlışlıkla silinen kayıtlar kurtarılabilir.

3. ÖZGÜN DEPO MODELİ: FIXED LOCATION (SABİT LOKASYON)

Küçük ve orta ölçekli üretim tesisleri için ideal olan bu modelde şu hiyerarşi izlenmiştir:
6 Bölge (A-F) > 4 Koridor > 7 Raf > Toplam 168 Raf (Kapasite: 50 Birim/Raf)

NEDEN BU MODEL SEÇİLDİ?

Hata Oranı: Her raf tek bir ürüne tahsis edildiği için operasyonel hatalar %90 oranında azalır.

Hız: "A-K1-R1" gibi spesifik adresleme formatı sayesinde personel bir ürünü saniyeler içinde bulabilir.

Hızlı Adaptasyon: Yeni çalışanlar depo düzenini çok kısa sürede ezberleyebilir.

4. KARŞILAŞILAN SORUNLAR VE ÇÖZÜMLER

Serileştirme Sorunu (ValueTuple): Backend tarafında kullanılan ValueTuple yapısı JSON serileştirme sırasında frontend'e boş obje olarak dönüyordu. Bu sorun, özel bir DTO (ZoneOccupancyDto) oluşturularak ve tip güvenliği sağlanarak çözüldü.

PDF Kütüphanesi Değişikliği: IronPDF kütüphanesinin native DLL bağımlılığı bazı ortamlarda çalışma hatalarına yol açıyordu. Bu nedenle tamamen managed code olan QuestPDF kütüphanesine geçiş yapıldı ve sistem stabil hale getirildi.

5. ÖZGÜN ÖZELLİKLER

İnteraktif Depo Haritası: Bölgelerin doluluk oranları (Yeşil, Sarı, Turuncu, Kırmızı) görsel olarak takip edilebilir.

Raf Detayları (Drill-Down): Rafa tıklandığında içindeki ürünlerin miktarını ve durumunu gösteren modal yapısı geliştirildi.

Veri Görselleştirme: Recharts ile depo doluluk dağılımı pasta ve çubuk grafiklerle analiz edilebilir hale getirildi.

Kritik Stok Uyarıları: 50 birim altına düşen raflar için alarm sistemi kuruldu.

6. GELECEK GELİŞTİRMELER

JWT Authentication ile yetkilendirme modülü.

Dinamik lokasyon desteği (Aynı rafta birden fazla farklı SKU).

Barkod/QR kod okuma ve mobil terminal entegrasyonu.

🖼️ PROJE GÖRSELLERİ

📊 Dashboard ve Analiz

Depo doluluk oranlarını ve genel stok durumunu gösteren grafik ekranı.

🗺️ İnteraktif Depo Haritası

Bölgelerin doluluk oranına göre renk değiştirdiği interaktif harita yapısı.

📋 Ürün Yönetimi

Server-side pagination ve filtreleme özellikli ürün listesi.

📄 PDF Raporlama

QuestPDF ile oluşturulan profesyonel depo durum raporu.

SONUÇ

Geliştirilen sistem, mülakat dokümanındaki tüm gereksinimleri karşılamakla kalmayıp, görsel takip sistemleri ve sabit lokasyon modeliyle operasyonel verimliliği maksimize etmeyi hedeflemiştir.