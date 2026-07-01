# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import requests, os, tempfile

BASE = "http://127.0.0.1:5000/api"
passed = 0
failed = 0

def test(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name} -- {detail}")

print("=" * 60)
print("  Flask API - Full Test Suite")
print("=" * 60)

# ── 1. Health Check ──
print("\n--- Health Check ---")
r = requests.get(f"{BASE}/health")
test("GET /api/health => 200", r.status_code == 200, f"got {r.status_code}")
test("status == ok", r.json().get("status") == "ok")

# ── 2. Login ──
print("\n--- Authentication ---")
r = requests.post(f"{BASE}/login", json={"password": "qwe123"})
test("POST /api/login (correct) => 200", r.status_code == 200, f"got {r.status_code}")
token = r.json().get("access_token", "")
test("JWT token received", len(token) > 0)
headers = {"Authorization": f"Bearer {token}"}

r = requests.post(f"{BASE}/login", json={"password": "wrong"})
test("POST /api/login (wrong) => 401", r.status_code == 401, f"got {r.status_code}")

r = requests.post(f"{BASE}/login", json={})
test("POST /api/login (no password) => 400", r.status_code == 400, f"got {r.status_code}")

# ── 3. JWT Protection ──
print("\n--- JWT Protection ---")
r = requests.get(f"{BASE}/announcements")
test("GET /announcements without JWT => 401", r.status_code == 401, f"got {r.status_code}")
r = requests.get(f"{BASE}/files")
test("GET /files without JWT => 401", r.status_code == 401, f"got {r.status_code}")

# ── 4. Announcements CRUD ──
print("\n--- Announcements CRUD ---")
r = requests.post(f"{BASE}/announcements", json={
    "title": "Test Duyurusu",
    "content": "<p>Bu bir <b>test</b> duyurusudur.</p>"
}, headers=headers)
test("POST /announcements => 201", r.status_code == 201, f"got {r.status_code}")
ann = r.json()
test("Announcement has id", "id" in ann)
test("Announcement has title", ann.get("title") == "Test Duyurusu")
test("Announcement has preview", len(ann.get("preview", "")) > 0)
test("Announcement has created_at", "created_at" in ann)
ann_id = ann["id"]

r = requests.post(f"{BASE}/announcements", json={
    "content": "<h1>Auto Title</h1><p>Paragraph</p>"
}, headers=headers)
test("POST /announcements (auto title) => 201", r.status_code == 201, f"got {r.status_code}")
test("Auto-generated title", len(r.json().get("title", "")) > 0)

r = requests.post(f"{BASE}/announcements", json={"content": ""}, headers=headers)
test("POST /announcements (empty) => 400", r.status_code == 400, f"got {r.status_code}")

r = requests.get(f"{BASE}/announcements", headers=headers)
test("GET /announcements => 200", r.status_code == 200, f"got {r.status_code}")
test("Announcements list count >= 2", len(r.json()) >= 2, f"got {len(r.json())}")

r = requests.delete(f"{BASE}/announcements/{ann_id}", headers=headers)
test(f"DELETE /announcements/{ann_id} => 200", r.status_code == 200, f"got {r.status_code}")

r = requests.delete(f"{BASE}/announcements/99999", headers=headers)
test("DELETE /announcements/99999 => 404", r.status_code == 404, f"got {r.status_code}")

# ── 5. Files CRUD ──
print("\n--- Files CRUD ---")

# Create temp files
tmp_files = []
for name in ["rapor.pdf", "tablo.xlsx", "notlar.txt"]:
    path = os.path.join(tempfile.gettempdir(), name)
    with open(path, "w") as f:
        f.write(f"Content of {name}")
    tmp_files.append(path)

files_payload = [("files", (os.path.basename(p), open(p, "rb"), "application/octet-stream")) for p in tmp_files]
r = requests.post(f"{BASE}/files", files=files_payload, headers=headers)
for _, (_, fobj, _) in files_payload:
    fobj.close()
test("POST /files (3 files) => 201", r.status_code == 201, f"got {r.status_code}")
result = r.json()
test("Upload count == 3", result.get("count") == 3, f"got {result.get('count')}")

r = requests.get(f"{BASE}/files", headers=headers)
test("GET /files => 200", r.status_code == 200, f"got {r.status_code}")
files_list = r.json()
test("Files list has items", len(files_list) >= 3, f"got {len(files_list)}")

# Download
dl_id = result["uploaded"][0]["id"]
r = requests.get(f"{BASE}/files/download/{dl_id}", headers=headers)
test(f"GET /files/download/{dl_id} => 200", r.status_code == 200, f"got {r.status_code}")
test("Download has Content-Disposition", "attachment" in r.headers.get("Content-Disposition", ""))

r = requests.get(f"{BASE}/files/download/99999", headers=headers)
test("GET /files/download/99999 => 404", r.status_code == 404, f"got {r.status_code}")

# Delete
r = requests.delete(f"{BASE}/files/{dl_id}", headers=headers)
test(f"DELETE /files/{dl_id} => 200", r.status_code == 200, f"got {r.status_code}")

r = requests.delete(f"{BASE}/files/99999", headers=headers)
test("DELETE /files/99999 => 404", r.status_code == 404, f"got {r.status_code}")

# Upload without file
r = requests.post(f"{BASE}/files", headers=headers)
test("POST /files (no file) => 400", r.status_code == 400, f"got {r.status_code}")

# ── 6. Root Route ──
print("\n--- Root URL ---")
r = requests.get("http://127.0.0.1:5000/")
test("GET / => 200 (serves frontend index.html)", r.status_code == 200)

# ── Summary ──
print("\n" + "=" * 60)
total = passed + failed
print(f"  Results: {passed}/{total} passed, {failed} failed")
if failed == 0:
    print("  ALL TESTS PASSED!")
else:
    print(f"  WARNING: {failed} test(s) failed!")
print("=" * 60)
