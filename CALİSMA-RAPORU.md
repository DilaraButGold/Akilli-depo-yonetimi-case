 Akıllı Depo Yönetim Sistemi - Çalışma Raporu

Bu rapor, geliştirilen Akıllı Depo Yönetimi modülünün teknik detaylarını, mülakat dökümanındaki kurallara uyumunu ve geliştirme sürecini özetlemektedir.

Ne Yapıldı? (Özet)

Proje kapsamında, bir şirketin envanterini (ürünlerini) tanımlayabildiği, bu ürünlerin depoya giriş (IN) ve çıkış (OUT) hareketlerini yönetebildiği uçtan uca bir sistem geliştirilmiştir.

Backend: Katmanlı mimari üzerine inşa edilmiş, güvenli ve performanslı bir API sağlandı.

Frontend: Kullanıcı dostu, modern bir "Premium Dark" temalı Dashboard arayüzü oluşturuldu.

Senaryo: Ürün tanımlama, gerçek zamanlı stok hesaplama (hareket tabanlı) ve depo bölgesi yönetimi özellikleri entegre edildi.

 Kullanılan Teknolojiler ve Versiyonlar

Backend: .NET 9.0 (ASP.NET Core Web API)

Frontend: React 18.3 + TypeScript + Material UI (MUI) v6

Veritabanı: MS SQL Server 2022

ORM: Entity Framework Core 9.0.0

API İletişimi: Axios (Interceptors desteğiyle)

Paket Yöneticisi: NPM / Vite

  Mimari Kararlar ve Nedenleri

Katmanlı Mimari (Controller-Manager-Repository-Entity): İş mantığının (Manager) ve veri erişiminin (Repository) birbirinden ayrılması sağlanarak kodun test edilebilirliği ve bakımı kolaylaştırıldı.

Generic Repository Pattern: Kod tekrarını önlemek ve tüm varlıklar için standart bir veritabanı erişim protokolü oluşturmak adına tercih edildi.

Dinamik Stok Hesaplama: Stok miktarı Product tablosunda statik bir sayı olarak tutulmak yerine, her işlemde StockMovements tablosundaki hareketlerden hesaplanır. Bu, dökümandaki "iş akışı mantığı" özgünlüğü kapsamında veri tutarlılığını sağlamak için alınmış bir karardır.

Multi-Tenant Security: Her entity'ye eklenen CompanyId ile şirket verilerinin birbirine karışması engellenmiş, dökümandaki zorunlu güvenlik kuralı uygulanmıştır.

   Karşılaşılan Sorunlar ve Çözüm Yolları

CORS Politikası: React uygulamasının API'ye erişimi tarayıcı tarafından engellendi. Program.cs üzerinde özel bir CORS politikası tanımlanarak güvenli erişim sağlandı.

JSON Casing Uyumsuzluğu: .NET'in varsayılan camelCase çıktısı ile dökümandaki "PascalCase Response" kuralı çakıştı. AddJsonOptions yapılandırmasıyla API yanıtları dökümana uygun hale getirildi.

MUI v6 Grid Hataları: Yeni sürümdeki TypeScript tanımlama sorunlarını aşmak ve daha esnek bir tasarım sunmak için mizanpajda CSS Grid destekli Box bileşeni kullanıldı.

Foreign Key Kısıtlamaları: Stok hareketi eklerken veritabanında bölge (Zone) bulunmaması nedeniyle alınan 500 hataları, veritabanına varsayılan bir "A-Blok" bölgesi tanımlanarak ve frontend'e stok yükleme aşaması için hata kontrolleri eklenerek çözüldü.

Yapay Zeka Kullanımı

Geliştirme sürecinde yapay zeka araçları şu aşamalarda kullanılmıştır:

Mimari Planlama: Katmanlar arası geçişlerin ve Interface yapılarının dökümana uygun kurgulanması.

Boilerplate Kod Üretimi: CRUD işlemlerinin ve DTO sınıflarının hızlıca oluşturulması.

UI/UX Tasarımı: Material UI v6 ile modern, karanlık mod odaklı ve "Premium" görünümlü bir arayüz stilinin geliştirilmesi.

Hata Ayıklama: Özellikle TypeScript tip uyuşmazlıkları ve SQL kısıtlamalarından kaynaklanan hataların hızlı tespiti.

Bu çalışma, belirtilen 8 saatlik süre sınırına sadık kalınarak, profesyonel yazılım geliştirme standartlarında tamamlanmıştır.