# Dosya ve Duyuru Yönetim Paneli (Yunus Tez)

Bu proje, kurum veya ekip içi iletişimi kolaylaştırmak, hızlı dosya paylaşımı yapmak ve güncel duyuruları tek bir platform üzerinden yönetmek amacıyla geliştirilmiş modern bir web uygulamasıdır. 

Şifre korumalı güvenli bir giriş ekranına sahip olan panel üzerinden kullanıcılar;
- Zengin metin editörü (Rich Text) ile duyurular oluşturabilir,
- PDF, Excel, Word, Görsel, Video ve Arşiv (ZIP/RAR) gibi her türlü formatta çoklu dosya yükleyebilir,
- Yüklenen içerikleri indirebilir, hızlıca kopyalayabilir veya silebilir.

Platform ayrıca, arka planda çalışan zamanlanmış görevler (Scheduler) sayesinde belirli bir süreyi aşan eski içerikleri otomatik olarak temizleyerek sunucu depolama alanını optimize etme yeteneğine sahiptir.

## 🚀 Kullanılan Teknolojiler

Bu uygulama, yüksek performans ve modern tasarım prensipleri gözetilerek **Full-Stack** olarak geliştirilmiştir:

### Ön Yüz (Frontend)
- **React (Vite):** Hızlı ve modüler kullanıcı arayüzü mimarisi.
- **TypeScript:** Tip güvenliği ve daha sürdürülebilir kod yapısı.
- **Tailwind CSS:** Modern, esnek ve tamamen duyarlı (responsive) tasarım.
- **Framer Motion:** Akıcı, zengin ve dinamik animasyon/geçiş efektleri.
- **Lucide React:** Minimal ve modern SVG ikon seti.

### Arka Plan (Backend)
- **Python & Flask:** Hafif, hızlı ve güçlü RESTful API altyapısı.
- **Flask-SQLAlchemy:** Güvenli veritabanı yönetimi ve ORM mimarisi.
- **Flask-JWT-Extended:** Token (JWT) tabanlı, güvenli ve oturum yönetimi (24 saat aktif kalabilme).
- **Flask-APScheduler:** Arka planda periyodik olarak çalışan temizlik ve bakım görevleri.
- **Waitress:** Windows ortamı ile tam uyumlu, stabil ve performanslı WSGI production sunucusu.

## ⚙️ Kurulum ve Çalıştırma

### 1. Gereksinimleri Yükleme
**Ön Yüz:**
```bash
npm install
```

**Arka Plan:**
```bash
cd backend
pip install -r requirements.txt
```

### 2. Ortam Değişkenleri (.env)
`backend/` dizini içerisinde bir `.env` dosyası oluşturarak aşağıdaki ayarları kendi ortamınıza göre yapılandırabilirsiniz:
```ini
APP_PASSWORD=sizin-belirlediginiz-sifre
JWT_SECRET_KEY=gizli-ve-guvenli-bir-anahtar-belirleyin
CLEANUP_THRESHOLD_HOURS=48
FLASK_ENV=production
```

### 3. Projeyi Başlatma
1. Öncelikle ön yüzü yayına hazırlayın (build):
```bash
npm run build
```
2. Daha sonra arka plan (backend) sunucusunu başlatın:
```bash
cd backend
python app.py
```
Uygulama `http://localhost:5000` adresinde kullanıma hazır olacaktır.