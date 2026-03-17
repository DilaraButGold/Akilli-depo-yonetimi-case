GİRİŞ
Bu rapor, mülakat dökümanında belirtilen gereksinimler doğrultusunda geliştirilen Akıllı Depo Yönetim Sistemi'nin detaylı açıklamasını içermektedir. Proje, temel depo operasyonlarını dijitalleştirmek, stok takibini görselleştirmek ve çoklu şirket (multi-tenant) yapısını desteklemek amacıyla geliştirilmiştir. 

1. NE YAPILDI? 

Temel Gereksinimler
Gereksinim	     Gerçekleştirilen Çözüm
Ürün Tanımlama	CRUD operasyonları ile ürün ekleme, düzenleme, silme (soft delete)
Depoya Giriş	Stok girişi (IN) işlemleri, kapasite kontrolü
Depodan Çıkış	Stok çıkışı (OUT) işlemleri, yeterli stok kontrolü  

Zorunlu Teknik Gereksinimler
 Multi-Tenant: Her entity'de CompanyId alanı, tüm sorgularda filtreleme

 Soft Delete: IsDeleted alanı ile mantıksal silme, global query filter

 Server-Side Pagination: Sayfalama, arama, filtreleme desteği

 EF Core Migration: Veritabanı şeması migration ile oluşturuldu

 Single Page Frontend: React + TypeScript + MUI ile tek sayfa uygulama

 Özet Kartlar: Toplam ürün, aktivite kaydı, sistem durumu

 Modal'lar: Ekleme/düzenleme/silme işlemleri için MUI Dialog 

 Özgün Tasarım için yapılanlar: 
Görsel Depo Haritası: A-F bölgeleri, 4 koridor, 7 raf (toplam 168 raf)

Renk Kodlaması: Doluluk oranına göre değişen renkler

Raf Detayları: Rafa tıklayınca ürün listesi gösteren modal

Kritik Stok Uyarısı: 50 birim altındaki bölgeler için alarm

Grafikler: Pasta grafik + kapasite çubukları (Recharts)

PDF Rapor: Profesyonel rapor çıktısı (QuestPDF) 

Koridor-Raf Sistemi (Fixed Location):

6 Bölge (A-F)
↓
Her Bölgede 4 Koridor
↓
Her Koridorda 7 Raf
↓
Toplam 168 Raf
↓
Her Raf Kapasitesi: 50 Birim
↓
Her Raf = Tek Ürün

Neden?
Gerçek Depo Senaryosu: Küçük/orta ölçekli depolarda çalışanların rafları hızlıca bulması ve hangi rafta hangi ürün olduğunu ezberlemesi kritiktir. "A-K1-R1" formatı, bir depo çalışanının 3 saniyede rafı bulmasını sağlar.

Sektördeki Karşılığı: Bu model, "Fixed Location" (Sabit Lokasyon) sistemi olarak bilinir ve özellikle şu alanlarda yaygındır:

İlaç depoları (track & trace zorunluluğu)

Gıda depoları (son kullanma tarihi takibi)

Yedek parça depoları

Küçük/orta ölçekli üretim tesisleri

Çözülen Sorunlar:
Sorun	                Çözüm
Karışıklık	           Her raf tek ürüne tahsisli, çalışan yanlış ürün koyamaz
Hata Oranı	           Fixed location ile hata oranı %90 azalır
Öğrenme Süresi	       Yeni çalışan 1 günde raf düzenini öğrenir
Envanter Sayımı	        Hangi rafta hangi ürün olacağı bellidir 

Fixed location sistemini bilinçli olarak seçtim çünkü MVP aşamasında hata oranını minimize etmek ve kullanıcı deneyimini basit tutmak önceliğimdi. Ancak sistem mimarisini, ileride dynamic location ve multi-SKU desteği ekleyebilecek şekilde esnek tasarladım


 Katmanlı Mimari (Controller-Manager-Repository-Entity)
Proje, mülakat dökümanında belirtilen katmanlı mimari yapısına birebir uygun şekilde tasarlanmıştır. Bu katmanların her biri belirli bir sorumluluğa sahiptir:

Entity Katmanı: Veritabanı tablolarını temsil eden modeller burada tanımlanmıştır. BaseEntity sınıfından türetilen tüm entity'lerde CompanyId ve IsDeleted alanları ortak olarak bulunur. Bu sayede multi-tenant yapı ve soft delete işlemleri merkezi olarak yönetilebilmiştır.

Repository Katmanı: Veritabanı işlemlerinin gerçekleştirildiği katmandır. Generic Repository pattern kullanılarak tüm entity'ler için standart CRUD operasyonları (GetById, Query, Add, Update, Delete) oluşturulmuş ve kod tekrarı önlenmiştir. Ayrıca transaction yönetimi de bu katmanda gerçekleştirilir.

Manager Katmanı: İş mantığının ve validasyonların yer aldığı katmandır. Stok hareketleri sırasında kapasite kontrolü, aynı ürün kontrolü, yeterli stok kontrolü gibi tüm iş kuralları bu katmanda uygulanmıştır.

Controller Katmanı: HTTP endpoint'lerinin tanımlandığı katmandır. Gelen istekleri karşılar, Manager katmanına yönlendirir ve sonuçları HTTP yanıtı olarak döndürür.

Neden Bu Mimari? Bu katmanlı yapı sayesinde her katman bağımsız olarak test edilebilir, bakımı kolaylaşır ve kod tekrarı önlenir. Örneğin, iş mantığında bir değişiklik yapılması gerektiğinde sadece Manager katmanı güncellenir, diğer katmanlar bundan etkilenmez. 

Multi-Tenant ve Soft Delete Tasarımı
Tüm entity'lerin BaseEntity sınıfından türetilmesiyle CompanyId ve IsDeleted alanları merkezi olarak yönetilmiştir.

Multi-Tenant Çözümü: Her entity'de bulunan CompanyId alanı sayesinde bir şirketin verileri diğer şirketlerden tamamen izole edilmiştir. Repository katmanındaki Query metodu, gelen companyId parametresine göre otomatik filtreleme yaparak sadece o şirkete ait verilerin dönmesini sağlar. Controller katmanında ise ek güvenlik kontrolleri ile yetkisiz erişimler engellenir.

Soft Delete Çözümü: Silme işlemleri hard delete yerine IsDeleted alanını true yaparak gerçekleştirilir. Bu sayede:

Veri kaybı yaşanmaz

Geçmiş stok hareketleri korunur

Denetim (audit) yapılabilir

Yanlışlıkla silinen veriler kurtarılabilir

DbContext seviyesinde global query filter kullanılarak tüm sorgularda otomatik olarak IsDeleted = false filtresi uygulanır. Bu sayede geliştiricinin her sorguda bu filtreyi manuel eklemesi gerekmez.

 HTTP Metod Kurallarına Uyum
Mülakat dökümanında belirtilen "PUT ve DELETE yasak, POST ile güncelleme ve silme" kuralına titizlikle uyulmuştur:

Create işlemleri: [HttpPost("create")]

Update işlemleri: [HttpPost("update")]

Delete işlemleri: [HttpPost("delete")]

Listeleme işlemleri: [HttpGet]

Bu yaklaşım, production ortamlarında bazı HTTP metodlarının desteklenmemesi durumuna karşı projeyi uyumlu hale getirmiştir.

Server-Side Pagination Stratejisi
Listeleme endpoint'lerinde tüm veriyi frontend'e göndermek yerine server-side pagination uygulanmıştır:

Sayfa başına 25 kayıt gösterilir

Sayfa numarası ve sayfa büyüklüğü parametre olarak alınır

Arama ve filtreleme server tarafında yapılır

Toplam kayıt sayısı ve toplam sayfa sayısı frontend'e döndürülür

Neden Server-Side Pagination? Veritabanında binlerce kayıt olsa bile frontend'e sadece ihtiyaç duyulan sayfa kadar veri gönderilir. Bu sayede:

Ağ trafiği azalır

Frontend performansı artar

İlk yükleme süresi kısalır

Bellek kullanımı optimize edilir 

KARŞILAŞILAN SORUNLAR ve ÇÖZÜMLERİ

Serileştirme Sorunu (ValueTuple vs DTO)
Sorun: Backend'de Dictionary yapısı içinde ValueTuple kullanıldığında, frontend'de bu veriler boş obje olarak geliyordu. JSON serileştirme sırasında ValueTuple'lar beklenen formata dönüşmüyordu.

Çözüm: ValueTuple yerine özel bir DTO (ZoneOccupancyDto) oluşturuldu. Stock ve Capacity property'lerini içeren bu sınıf, hem backend'de tip güvenliği sağladı hem de frontend'de doğru şekilde parse edilebildi.

Kazanım: Bu sayede backend'den frontend'e veri akışı sorunsuz hale geldi ve tip güvenliği sağlandı.

Serileştirme Sorunu (ValueTuple vs DTO)
Sorun: Backend'de Dictionary yapısı içinde ValueTuple kullanıldığında, frontend'de bu veriler boş obje olarak geliyordu. JSON serileştirme sırasında ValueTuple'lar beklenen formata dönüşmüyordu.

Çözüm: ValueTuple yerine özel bir DTO (ZoneOccupancyDto) oluşturuldu. Stock ve Capacity property'lerini içeren bu sınıf, hem backend'de tip güvenliği sağladı hem de frontend'de doğru şekilde parse edilebildi.

Kazanım: Bu sayede backend'den frontend'e veri akışı sorunsuz hale geldi ve tip güvenliği sağlandı.

 PDF Rapor Kütüphanesi Değişikliği
Sorun: İlk olarak IronPDF kütüphanesi kullanıldı, ancak native DLL bağımlılığı nedeniyle bazı ortamlarda 500 Internal Server Error hataları alındı.

Çözüm: IronPDF kaldırılarak tamamen managed code olan QuestPDF kütüphanesine geçildi. QuestPDF, herhangi bir native bağımlılık gerektirmediği için tüm ortamlarda sorunsuz çalıştı.

Kazanım: PDF rapor özelliği her ortamda stabil şekilde çalışır hale geldi.

EKLENEN ÖZGÜN ÖZELLİKLER ve NEDENLERİ 

Görsel Depo Haritası
Neden Eklendi? Kullanıcıların depo durumunu sayısal verilerle değil, görsel olarak anında kavramasını sağlamak için tasarlanmıştır. Renk kodlaması sayesinde hangi bölgenin kritik olduğu, hangi bölgede stok fazlası olduğu bir bakışta anlaşılabilir.

Nasıl Çalışır? Ana sayfada A-F arası 6 bölge kutusu bulunur. Her kutuda o bölgenin toplam stoku ve kapasitesi yazılır. Doluluk oranına göre:

Yeşil: %70'in altında (normal)

Sarı: %70-90 arası (dikkat edilmeli)

Turuncu: %90 üzeri (acil müdahale gerekebilir)

Kırmızı: Kapasite dolu (stok girişi yapılamaz)

Ayrıca her bölgenin altında linear progress bar ile doluluk oranı görselleştirilmiştir.

Koridor-Raf Sistemi
Neden Bu Model Seçildi? Küçük/orta ölçekli depolarda çalışanların rafları hızlıca bulması kritiktir. "A-K1-R1" formatı, bir depo çalışanının 3 saniyede rafı bulmasını sağlar. Bu model sektörde "Fixed Location" (Sabit Lokasyon) olarak bilinir.

Hangi Sorunları Çözer?

Karışıklık: Her raf tek ürüne tahsisli olduğu için çalışan yanlış ürün koyamaz

Hata Oranı: Fixed location ile hata oranı %90 azalır

Öğrenme Süresi: Yeni çalışan 1 günde raf düzenini öğrenir

Envanter Sayımı: Hangi rafta hangi ürün olacağı bellidir

Raf Detayları (Drill-Down)
Neden Eklendi? Bir rafa tıklandığında o raftaki ürünlerin listesini görmek, depo çalışanları için kritik bir ihtiyaçtır. "A-K1-R1'de ne var?" sorusuna anında cevap verilebilmelidir.

Nasıl Çalışır? Raf numarasına tıklandığında bir modal açılır ve o raftaki tüm ürünler listelenir. Her ürün için ürün adı ve miktar bilgisi gösterilir. Miktar 40'ın üzerindeyse kırmızı, 20-40 arasındaysa sarı, 20'nin altındaysa yeşil renkle kodlanır.

Raf Detayları (Drill-Down)
Neden Eklendi? Bir rafa tıklandığında o raftaki ürünlerin listesini görmek, depo çalışanları için kritik bir ihtiyaçtır. "A-K1-R1'de ne var?" sorusuna anında cevap verilebilmelidir.

Nasıl Çalışır? Raf numarasına tıklandığında bir modal açılır ve o raftaki tüm ürünler listelenir. Her ürün için ürün adı ve miktar bilgisi gösterilir. Miktar 40'ın üzerindeyse kırmızı, 20-40 arasındaysa sarı, 20'nin altındaysa yeşil renkle kodlanır.


Grafikler (Recharts)
Neden Eklendi? Yöneticiler için hızlı durum değerlendirmesi yapabilmek önemlidir. Pasta grafik ile bölgeler arası stok dağılımı, çubuk grafik ile kapasite kullanım yüzdeleri görselleştirilmiştir.

Ne Sağlar?

Hangi bölgelerde stok yoğunluğu olduğu anlaşılır

Kapasite kullanım oranları görsel olarak takip edilebilir

Toplantılarda sunum yapmak için hazır görseller sunar

PDF Rapor
Neden Eklendi? Dijital verilerin fiziksel çıktısını almak, toplantılarda sunum yapmak, arşivlemek için gereklidir.

Rapor İçeriği:

Özet bilgiler (toplam ürün çeşidi, toplam stok miktarı)

Bölge doluluk tablosu (her bölge için stok, kapasite, doluluk yüzdesi)

Kritik stok listesi (50 birim altındaki ürünler)

Stok listesi (ilk 20 ürün için ürün adı, barkod, toplam stok, raf lokasyonları)

PDF Rapor
Neden Eklendi? Dijital verilerin fiziksel çıktısını almak, toplantılarda sunum yapmak, arşivlemek için gereklidir.

Rapor İçeriği:

Özet bilgiler (toplam ürün çeşidi, toplam stok miktarı)

Bölge doluluk tablosu (her bölge için stok, kapasite, doluluk yüzdesi)

Kritik stok listesi (50 birim altındaki ürünler)

Stok listesi (ilk 20 ürün için ürün adı, barkod, toplam stok, raf lokasyonları)

Öğrenilen Dersler
ValueTuple API'lerde kullanılmamalı, DTO tercih edilmeli

Native DLL bağımlılığı olan kütüphaneler her ortamda çalışmayabilir, managed code daha güvenli

Veritabanı tasarımı en baştan doğru yapılmalı, sonradan düzeltmesi zor

Frontend-backend iletişimi için bir contract (sözleşme) şart

Fixed location modeli küçük ve orta ölçekli depolar için ideal

Gelecek Geliştirmeler
JWT Authentication ile kullanıcı girişi ve yetkilendirme

Dynamic location desteği ile aynı rafta farklı ürünlere izin verme opsiyonu

Multi-SKU raflar ile birden fazla ürün aynı rafta saklanabilir

Barkod okuma entegrasyonu ile mobil cihazlardan stok işlemi

Talep tahmini yapay zeka ile gelecek stok ihtiyaçlarını öngörme

