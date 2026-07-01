"""
Dosya ve Duyuru Yönetim Paneli — RESTful API
=============================================
Flask + PostgreSQL (SQLAlchemy) + JWT Auth + APScheduler

Endpoint Listesi:
  POST   /api/login                  → Şifre kontrolü & JWT üretimi
  GET    /api/announcements          → Duyuruları listele
  POST   /api/announcements          → Yeni duyuru oluştur
  DELETE /api/announcements/<id>     → Duyuru sil
  GET    /api/files                  → Dosya metadata listesi
  POST   /api/files                  → Çoklu dosya yükleme
  GET    /api/files/download/<id>    → Dosya indir
  DELETE /api/files/<id>             → Dosya ve kaydını sil
"""

import os
import uuid
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from flask_cors import CORS
from flask_apscheduler import APScheduler
from werkzeug.utils import secure_filename

# ─── Ortam Değişkenlerini Yükle ───────────────────────────────────────────────
load_dotenv()

# ─── Flask Uygulaması ─────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="../dist", static_url_path="/")

# ── Yapılandırma ──────────────────────────────────────────────────────────────
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:aA123456@localhost:5432/postgres?connect_timeout=10&sslmode=prefer",
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_size": 10,
    "max_overflow": 20,
    "pool_pre_ping": True,
}

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.getenv("UPLOAD_FOLDER", "uploads"))
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", 104857600))  # 100 MB

CLEANUP_THRESHOLD_HOURS = int(os.getenv("CLEANUP_THRESHOLD_HOURS", 48))
APP_PASSWORD = os.getenv("APP_PASSWORD", "qwe123")

# Upload dizinini oluştur
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── Eklentiler ───────────────────────────────────────────────────────────────
db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ─── Modeller ─────────────────────────────────────────────────────────────────

class Announcement(db.Model):
    """Duyuru modeli — Rich Text / HTML içerik barındırır."""
    __tablename__ = "announcements"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False, default="Yeni Duyuru")
    content = db.Column(db.Text, nullable=False)
    preview = db.Column(db.String(500), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,  # 48-saat temizliği için performanslı indeks
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "preview": self.preview,
            "created_at": self.created_at.isoformat(),
        }


class FileRecord(db.Model):
    """Dosya metadata modeli — dosya içeriği sunucudaki uploads/ dizininde tutulur."""
    __tablename__ = "files"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    original_name = db.Column(db.String(512), nullable=False)
    stored_name = db.Column(db.String(512), nullable=False, unique=True)
    file_size = db.Column(db.BigInteger, nullable=False, default=0)
    mime_type = db.Column(db.String(255), nullable=False, default="application/octet-stream")
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,  # 48-saat temizliği için performanslı indeks
    )

    def to_dict(self):
        return {
            "id": self.id,
            "original_name": self.original_name,
            "stored_name": self.stored_name,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "created_at": self.created_at.isoformat(),
        }


# ─── Veritabanı Tablolarını Oluştur ──────────────────────────────────────────
with app.app_context():
    db.create_all()


# ═══════════════════════════════════════════════════════════════════════════════
#  ENDPOINT'LER
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Hata İşleyiciler ─────────────────────────────────────────────────────────

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Geçersiz istek.", "detail": str(e)}), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Kaynak bulunamadı.", "detail": str(e)}), 404


@app.errorhandler(413)
def payload_too_large(e):
    return jsonify({"error": "Dosya boyutu çok büyük.", "detail": "Maksimum 100 MB yüklenebilir."}), 413


@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Sunucu hatası.", "detail": str(e)}), 500


# ─── 1. Kimlik Doğrulama ─────────────────────────────────────────────────────

@app.route("/api/login", methods=["POST"])
def login():
    """
    Şifre kontrolü ve JWT üretimi.
    Body: { "password": "..." }
    Başarılı: { "access_token": "..." }
    """
    data = request.get_json(silent=True)
    if not data or "password" not in data:
        return jsonify({"error": "Parola alanı gereklidir."}), 400

    if data["password"] != APP_PASSWORD:
        return jsonify({"error": "Hatalı parola."}), 401

    access_token = create_access_token(identity="admin")
    return jsonify({"access_token": access_token}), 200


# ─── 2. Duyuru Yönetimi ──────────────────────────────────────────────────────

@app.route("/api/announcements", methods=["GET"])
@jwt_required()
def get_announcements():
    """Tüm duyuruları oluşturulma tarihine göre (en yeni ilk) listeler."""
    announcements = (
        Announcement.query
        .order_by(Announcement.created_at.desc())
        .all()
    )
    return jsonify([a.to_dict() for a in announcements]), 200


@app.route("/api/announcements", methods=["POST"])
@jwt_required()
def create_announcement():
    """
    Yeni duyuru oluşturur.
    Body: { "title": "...", "content": "<p>HTML içerik</p>" }
    """
    data = request.get_json(silent=True)
    if not data or "content" not in data:
        return jsonify({"error": "Duyuru içeriği (content) gereklidir."}), 400

    content = data["content"].strip()
    if not content:
        return jsonify({"error": "Duyuru içeriği boş olamaz."}), 400

    # Başlık ve önizleme oluştur
    title = data.get("title", "").strip()
    if not title:
        # HTML taglarını kaldırarak düz metin al
        import re
        plain = re.sub(r"<[^>]+>", "", content).strip()
        title = plain[:60] if plain else "Yeni Duyuru"

    # Önizleme metni oluştur (HTML'den arındırılmış ilk 180 karakter)
    import re
    preview_text = re.sub(r"<[^>]+>", "", content).strip()[:180]

    announcement = Announcement(
        title=title,
        content=content,
        preview=preview_text,
    )
    db.session.add(announcement)
    db.session.commit()

    return jsonify(announcement.to_dict()), 201


@app.route("/api/announcements/<int:announcement_id>", methods=["DELETE"])
@jwt_required()
def delete_announcement(announcement_id):
    """Belirtilen ID'ye sahip duyuruyu siler."""
    announcement = db.session.get(Announcement, announcement_id)
    if not announcement:
        return jsonify({"error": "Duyuru bulunamadı."}), 404

    db.session.delete(announcement)
    db.session.commit()
    return jsonify({"message": "Duyuru başarıyla silindi.", "id": announcement_id}), 200


# ─── 3. Dosya Yönetimi ───────────────────────────────────────────────────────

@app.route("/api/files", methods=["GET"])
@jwt_required()
def get_files():
    """Tüm dosyaların metadata bilgilerini listeler."""
    files = (
        FileRecord.query
        .order_by(FileRecord.created_at.desc())
        .all()
    )
    return jsonify([f.to_dict() for f in files]), 200


@app.route("/api/files", methods=["POST"])
@jwt_required()
def upload_files():
    """
    Çoklu dosya yükleme desteği.
    Form-data: files[] = [file1, file2, ...]
    """
    if "files" not in request.files and "files[]" not in request.files:
        return jsonify({"error": "Dosya bulunamadı. 'files' veya 'files[]' alanı gereklidir."}), 400

    # Her iki alan adını da destekle
    uploaded_files = request.files.getlist("files") or request.files.getlist("files[]")

    if not uploaded_files or all(f.filename == "" for f in uploaded_files):
        return jsonify({"error": "En az bir dosya seçilmelidir."}), 400

    saved_records = []
    errors = []

    for file_obj in uploaded_files:
        if not file_obj or file_obj.filename == "":
            continue

        try:
            original_name = secure_filename(file_obj.filename) or file_obj.filename
            # Benzersiz dosya adı oluştur (çakışmaları önlemek için UUID ekle)
            ext = os.path.splitext(original_name)[1]
            stored_name = f"{uuid.uuid4().hex}{ext}"

            file_path = os.path.join(UPLOAD_FOLDER, stored_name)
            file_obj.save(file_path)

            file_size = os.path.getsize(file_path)
            mime_type = file_obj.content_type or "application/octet-stream"

            record = FileRecord(
                original_name=file_obj.filename,  # Orijinal adı (Türkçe karakterler dahil)
                stored_name=stored_name,
                file_size=file_size,
                mime_type=mime_type,
            )
            db.session.add(record)
            saved_records.append(record)

        except Exception as e:
            errors.append({"file": file_obj.filename, "error": str(e)})

    if saved_records:
        db.session.commit()

    response = {
        "uploaded": [r.to_dict() for r in saved_records],
        "count": len(saved_records),
    }
    if errors:
        response["errors"] = errors

    status_code = 201 if saved_records else 400
    return jsonify(response), status_code


@app.route("/api/files/download/<int:file_id>", methods=["GET"])
@jwt_required()
def download_file(file_id):
    """Dosyayı orijinal adıyla indirir."""
    record = db.session.get(FileRecord, file_id)
    if not record:
        return jsonify({"error": "Dosya bulunamadı."}), 404

    file_path = os.path.join(UPLOAD_FOLDER, record.stored_name)
    if not os.path.exists(file_path):
        # Veritabanında var ama dosya fiziksel olarak bulunamadı
        return jsonify({"error": "Dosya sunucuda bulunamadı."}), 404

    return send_from_directory(
        UPLOAD_FOLDER,
        record.stored_name,
        as_attachment=True,
        download_name=record.original_name,
    )


@app.route("/api/files/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_file(file_id):
    """Dosyayı hem sunucudan hem veritabanından siler."""
    record = db.session.get(FileRecord, file_id)
    if not record:
        return jsonify({"error": "Dosya bulunamadı."}), 404

    # Fiziksel dosyayı sil
    file_path = os.path.join(UPLOAD_FOLDER, record.stored_name)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError as e:
        app.logger.warning(f"Dosya silinirken hata: {file_path} — {e}")

    # Veritabanı kaydını sil
    db.session.delete(record)
    db.session.commit()

    return jsonify({"message": "Dosya başarıyla silindi.", "id": file_id}), 200


# ═══════════════════════════════════════════════════════════════════════════════
#  48 SAAT KURALI — OTOMATİK TEMİZLİK (APScheduler)
# ═══════════════════════════════════════════════════════════════════════════════

def cleanup_expired_records():
    """
    48 saatten eski duyuruları ve dosyaları kalıcı olarak temizler.
    Bu fonksiyon her saat başı APScheduler tarafından çağrılır.
    created_at üzerindeki indeks sayesinde sorgular veritabanını yormaz.
    """
    with app.app_context():
        threshold = datetime.now(timezone.utc) - timedelta(hours=CLEANUP_THRESHOLD_HOURS)
        app.logger.info(f"[Temizlik] {threshold.isoformat()} öncesi kayıtlar temizleniyor...")

        # ── Eski dosyaları temizle ────────────────────────────────────────
        expired_files = FileRecord.query.filter(FileRecord.created_at < threshold).all()
        deleted_file_count = 0
        for record in expired_files:
            file_path = os.path.join(UPLOAD_FOLDER, record.stored_name)
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except OSError as e:
                app.logger.warning(f"[Temizlik] Dosya silinemedi: {file_path} — {e}")
            db.session.delete(record)
            deleted_file_count += 1

        # ── Eski duyuruları temizle ───────────────────────────────────────
        deleted_announcement_count = (
            Announcement.query
            .filter(Announcement.created_at < threshold)
            .delete(synchronize_session=False)
        )

        db.session.commit()

        app.logger.info(
            f"[Temizlik] Tamamlandı — "
            f"{deleted_file_count} dosya, "
            f"{deleted_announcement_count} duyuru silindi."
        )


@app.route("/api/clear-all", methods=["DELETE"])
@jwt_required()
def clear_all():
    """Tüm duyuruları ve dosyaları kalıcı olarak siler."""
    try:
        # Duyuruları sil
        db.session.query(Announcement).delete()
        
        # Dosyaları fiziksel diskten sil
        files = FileRecord.query.all()
        for f in files:
            file_path = os.path.join(UPLOAD_FOLDER, f.stored_name)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass
                    
        # Veritabanı kayıtlarını sil
        db.session.query(FileRecord).delete()
        db.session.commit()
        return jsonify({"message": "Tüm içerikler temizlendi."}), 200
    except Exception as e:
        db.session.rollback()
        return internal_error(e)


# ── APScheduler Yapılandırması ────────────────────────────────────────────────
scheduler = APScheduler()

app.config["SCHEDULER_API_ENABLED"] = False
app.config["JOBS"] = [
    {
        "id": "cleanup_expired_records",
        "func": cleanup_expired_records,
        "trigger": "interval",
        "hours": 1,
        "misfire_grace_time": 900,  # 15 dakika tolerans
    }
]

scheduler.init_app(app)


# ─── Sağlık Kontrolü ─────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health_check():
    """Basit sağlık kontrolü endpoint'i."""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cleanup_threshold_hours": CLEANUP_THRESHOLD_HOURS,
    }), 200


# ─── Frontend Servisi ────────────────────────────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        abort(404)
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        index_path = os.path.join(app.static_folder, "index.html")
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, "index.html")
        else:
            return "Frontend build not found. Lütfen önce 'npm run build' çalıştırın.", 404


# ═══════════════════════════════════════════════════════════════════════════════
#  UYGULAMA BAŞLATMA
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    scheduler.start()
    app.logger.info(f"[Zamanlayıcı] Her saat başı {CLEANUP_THRESHOLD_HOURS} saati aşan kayıtlar temizlenecek.")
    
    if os.getenv("FLASK_ENV") == "production":
        # Canlı ortam (Production) için Waitress WSGI sunucusu
        from waitress import serve
        app.logger.info("Uygulama PRODUCTION modunda (Waitress) başlatılıyor...")
        serve(app, host="0.0.0.0", port=5000)
    else:
        # Geliştirme (Development) ortamı
        app.logger.info("Uygulama DEVELOPMENT modunda başlatılıyor...")
        app.run(
            host="0.0.0.0",
            port=5000,
            debug=True,
            use_reloader=False,  # APScheduler ile reloader çakışmasını önle
        )
