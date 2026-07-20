import { useState, useRef, useCallback, useEffect } from "react";
import {
  Eye,
  EyeOff,
  LogOut,
  Save,
  Upload,
  Trash2,
  FileText,
  FileSpreadsheet,
  Image,
  Video,
  Archive,
  File,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Heading1,
  Heading2,
  X,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  ArrowDown,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SharedItem = {
  id: string;
  type: "text" | "file";
  content?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  date: string;
};

type UploadingFile = {
  id: string;
  name: string;
  size: string;
  progress: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getFileIcon(fileType: string) {
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return <FileText size={20} className="text-red-500" />;
  if (t.includes("sheet") || t.includes("excel") || t.includes("csv") || t.includes("spreadsheetml"))
    return <FileSpreadsheet size={20} className="text-green-600" />;
  if (t.includes("word") || t.includes("msword") || t.includes("wordprocessingml"))
    return <FileText size={20} className="text-blue-600" />;
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg") || t.includes("gif") || t.includes("webp"))
    return <Image size={20} className="text-purple-500" />;
  if (t.includes("video") || t.includes("mp4") || t.includes("mov"))
    return <Video size={20} className="text-pink-500" />;
  if (t.includes("zip") || t.includes("rar") || t.includes("gz"))
    return <Archive size={20} className="text-yellow-600" />;
  return <File size={20} className="text-slate-500" />;
}

function getFileBadgeLabel(fileType: string): string {
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return "PDF";
  if (t.includes("sheet") || t.includes("excel") || t.includes("csv") || t.includes("spreadsheetml")) return "Excel";
  if (t.includes("word") || t.includes("msword") || t.includes("wordprocessingml")) return "Word";
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg") || t.includes("gif")) return "Görsel";
  if (t.includes("video")) return "Video";
  if (t.includes("zip") || t.includes("rar")) return "Arşiv";
  if (t.includes("audio") || t.includes("mp3")) return "Ses";
  return "Dosya";
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function DeleteModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: SharedItem;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={22} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              İçerik Silinecek
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              <span className="font-medium text-foreground">
                {item.type === "text" ? "Bu yazı" : `"${item.fileName}"`}
              </span>{" "}
              adlı içerik kalıcı olarak silinecektir. Bu işlem geri alınamaz.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-7 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-muted hover:bg-slate-200 transition-colors"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 active:bg-red-700 transition-colors"
          >
            Evet, Sil
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ClearAllModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-5">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-xl font-bold text-foreground tracking-tight mb-2">
            Tüm İçerikleri Sil
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Sistemdeki tüm duyurular ve dosyalar <span className="font-medium text-foreground">kalıcı olarak</span> silinecektir. Bu işlem geri alınamaz. Onaylıyor musunuz?
          </p>
          <div className="flex w-full gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Vazgeç
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm shadow-red-500/20"
            >
              Tümünü Sil
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium ${
        type === "success"
          ? "bg-emerald-500 text-white"
          : "bg-red-500 text-white"
      }`}
    >
      {type === "success" ? (
        <CheckCircle size={17} />
      ) : (
        <AlertCircle size={17} />
      )}
      {message}
    </motion.div>
  );
}

// ─── Rich Text Toolbar ─────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
    >
      {children}
    </button>
  );
}

function RichEditor({
  editorRef,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = window.prompt("Link URL giriniz:", "https://");
    if (url) exec("createLink", url);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/40 flex-wrap">
        <ToolbarBtn onClick={() => exec("bold")} title="Kalın">
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("italic")} title="İtalik">
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("underline")} title="Altı Çizili">
          <Underline size={14} />
        </ToolbarBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarBtn
          onClick={() =>
            exec("formatBlock", "<h1>")
          }
          title="Başlık 1"
        >
          <Heading1 size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() =>
            exec("formatBlock", "<h2>")
          }
          title="Başlık 2"
        >
          <Heading2 size={14} />
        </ToolbarBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Liste">
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={insertLink} title="Link Ekle">
          <Link size={14} />
        </ToolbarBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarBtn onClick={() => exec("justifyLeft")} title="Sola Hizala">
          <AlignLeft size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyCenter")} title="Ortala">
          <AlignCenter size={14} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyRight")} title="Sağa Hizala">
          <AlignRight size={14} />
        </ToolbarBtn>
      </div>
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Duyurunuzu buraya yazın..."
        className="min-h-[260px] p-5 text-foreground text-sm leading-relaxed focus:outline-none prose prose-sm max-w-none"
        style={{ fontFamily: "Inter, sans-serif" }}
      />
    </div>
  );
}

// ─── File Upload Zone ──────────────────────────────────────────────────────────

// Recursive helper: reads all files from a dropped directory entry
function readAllEntries(entry: FileSystemEntry): Promise<File[]> {
  return new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file((f) => {
        // Preserve the full relative path from the entry
        Object.defineProperty(f, "webkitRelativePath", {
          value: entry.fullPath.replace(/^\//, ""),
          writable: false,
        });
        resolve([f]);
      }, () => resolve([]));
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const allEntries: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries((entries) => {
          if (entries.length === 0) {
            // All entries read, recurse into each
            Promise.all(allEntries.map(readAllEntries)).then((results) =>
              resolve(results.flat())
            );
          } else {
            allEntries.push(...entries);
            readBatch(); // Keep reading (readEntries may batch results)
          }
        }, () => resolve([]));
      };
      readBatch();
    } else {
      resolve([]);
    }
  });
}

function UploadZone({
  onFilesSelected,
  uploadingFiles,
}: {
  onFilesSelected: (files: File[]) => void;
  uploadingFiles: UploadingFile[];
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);

      // Try to use DataTransferItem API for folder support
      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const entries: FileSystemEntry[] = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry?.();
          if (entry) entries.push(entry);
        }
        if (entries.length > 0) {
          const allFiles = (await Promise.all(entries.map(readAllEntries))).flat();
          if (allFiles.length) onFilesSelected(allFiles);
          return;
        }
      }

      // Fallback: plain file drop
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFilesSelected(files);
    },
    [onFilesSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFilesSelected(files);
    e.target.value = "";
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFilesSelected(files);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        animate={{
          borderColor: dragging ? "#2563eb" : "rgba(15,23,42,0.12)",
          backgroundColor: dragging ? "#eff6ff" : "#ffffff",
          scale: dragging ? 1.01 : 1,
        }}
        transition={{ duration: 0.15 }}
        className="border-2 border-dashed rounded-2xl px-8 py-12 flex flex-col items-center gap-4 cursor-pointer text-center"
        onClick={() => inputRef.current?.click()}
      >
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
            dragging ? "bg-blue-100" : "bg-slate-100"
          }`}
        >
          <Upload
            size={28}
            className={`transition-colors ${
              dragging ? "text-blue-600" : "text-slate-500"
            }`}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Dosya veya klasörleri buraya sürükleyip bırakın
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, Word, Excel, PowerPoint, görseller, video, ses, ZIP ve daha
            fazlası
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Upload size={15} />
              Dosya Seç
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              folderInputRef.current?.click();
            }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 transition-colors shadow-sm"
          >
            <span className="flex items-center gap-2">
              <FolderOpen size={15} />
              Klasör Seç
            </span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          veya dosya / klasörleri yukarıya sürükleyin · Çoklu seçim desteklenir
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleChange}
        />
        {/* @ts-ignore — webkitdirectory is not in React's type defs */}
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={handleFolderChange}
          {...({ webkitdirectory: "true", directory: "" } as any)}
        />
      </motion.div>

      {/* Upload progress */}
      <AnimatePresence>
        {uploadingFiles.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-card border border-border rounded-xl px-5 py-3.5 flex items-center gap-4"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Upload size={15} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground truncate">
                  {f.name}
                </span>
                <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">
                  {f.size}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${f.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            <span className="text-xs font-semibold text-primary flex-shrink-0">
              {f.progress}%
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Shared Item Card ──────────────────────────────────────────────────────────

function SharedCard({
  item,
  onDelete,
}: {
  item: SharedItem;
  onDelete: (item: SharedItem) => void;
}) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/files/download/${item.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("İndirme başarısız");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.fileName || "dosya";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Dosya indirilemedi. Lütfen tekrar deneyin.");
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(15,23,42,0.1)" }}
      transition={{ duration: 0.18 }}
      className="bg-card border border-border rounded-2xl p-5 relative group cursor-default"
    >
      {/* Delete button */}
      <button
        onClick={() => onDelete(item)}
        className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
        title="Sil"
      >
        <Trash2 size={15} />
      </button>

      {item.type === "text" ? (
        <div className="flex gap-3.5 pr-8">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText size={17} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Yazı
              </span>
              <button
                onClick={() => {
                  const el = document.createElement("div");
                  el.innerHTML = item.content || "";
                  navigator.clipboard.writeText(el.innerText || "");
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors ml-auto border border-border px-3 py-1.5 rounded-md shadow-sm"
                title="Tümünü Kopyala"
              >
                <Copy size={14} />
                Kopyala
              </button>
            </div>
            <div 
              className="text-sm text-foreground leading-relaxed mb-3 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: item.content || "" }}
            />
            <span className="text-[11px] text-muted-foreground">
              {formatDate(item.date)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex gap-3.5 pr-8">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
            {getFileIcon(item.fileType ?? "")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                {getFileBadgeLabel(item.fileType ?? "")}
              </span>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors ml-auto border border-border px-3 py-1.5 rounded-md shadow-sm"
                title="İndir"
              >
                <Download size={14} />
                İndir
              </button>
            </div>
            <p className="text-sm font-semibold text-foreground mb-2 truncate">
              {item.fileName}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {item.fileSize}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatDate(item.date)}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Login Page ────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const attempt = async () => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        onLogin();
      } else {
        setError("Hatalı parola. Lütfen tekrar deneyin.");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
    } catch (e) {
      setError("Bağlantı hatası.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") attempt();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-100/40 blur-3xl" />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.03]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#1e40af"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px]"
      >
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-blue-500/25">
            <FileText size={26} className="text-white" />
          </div>
        </div>

        <motion.div
          animate={shaking ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          className="bg-card border border-border rounded-3xl shadow-xl shadow-slate-200/80 p-10"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
              Dosya ve Duyuru
              <br />
              Yönetim Paneli
            </h1>
            <p className="text-sm text-muted-foreground">
              Sisteme erişmek için parolanızı giriniz.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                Parola
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleKey}
                  placeholder="Parolanızı giriniz"
                  className="w-full h-12 px-4 pr-12 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 text-xs font-medium text-red-500 flex items-center gap-1.5"
                  >
                    <AlertCircle size={13} />
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

            </div>

            <button
              onClick={attempt}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-500/20"
            >
              Giriş Yap
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SharedItem | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [annRes, filesRes] = await Promise.all([
        fetch("/api/announcements", { headers }),
        fetch("/api/files", { headers })
      ]);
      
      if (annRes.ok && filesRes.ok) {
        const anns = await annRes.json();
        const files = await filesRes.json();
        
        const mappedAnns: SharedItem[] = anns.map((a: any) => ({
          id: String(a.id),
          type: "text",
          content: a.content,
          date: a.created_at,
        }));
        
        const mappedFiles: SharedItem[] = files.map((f: any) => ({
          id: String(f.id),
          type: "file",
          fileName: f.original_name,
          fileSize: formatBytes(f.file_size),
          fileType: f.mime_type,
          date: f.created_at,
        }));
        
        const allItems = [...mappedAnns, ...mappedFiles].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setItems(allItems);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const handleSave = async () => {
    const html = editorRef.current?.innerHTML ?? "";
    const text = editorRef.current?.innerText?.trim() ?? "";
    if (!text) {
      showToast("Lütfen bir duyuru yazısı giriniz.", "error");
      return;
    }
    
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ content: html })
      });
      
      if (response.ok) {
        if (editorRef.current) editorRef.current.innerHTML = "";
        showToast("Duyuru başarıyla paylaşıldı.");
        fetchItems();
      } else {
        showToast("Duyuru paylaşılamadı.", "error");
      }
    } catch (e) {
      showToast("Bağlantı hatası.", "error");
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    
    // For folder uploads, use webkitRelativePath as filename to preserve folder structure
    files.forEach(f => {
      const relativePath = (f as any).webkitRelativePath;
      if (relativePath) {
        // Send with the relative path so the backend stores the full path as original_name
        formData.append("files", f, relativePath);
      } else {
        formData.append("files", f);
      }
    });
    
    const newUploads = files.map(f => {
      const relativePath = (f as any).webkitRelativePath;
      return {
        id: Math.random().toString(),
        name: relativePath || f.name,
        size: formatBytes(f.size),
        progress: 50,
      };
    });
    setUploadingFiles(prev => [...prev, ...newUploads]);
    
    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        showToast(`${files.length} dosya başarıyla yüklendi.`);
        fetchItems();
      } else {
        showToast("Dosya yükleme başarısız.", "error");
      }
    } catch (e) {
      showToast("Dosya yükleme hatası.", "error");
    } finally {
      setUploadingFiles(prev => prev.filter(u => !newUploads.find(n => n.id === u.id)));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    
    const token = localStorage.getItem("token");
    const endpoint = deleteTarget.type === "text" 
      ? `/api/announcements/${deleteTarget.id}` 
      : `/api/files/${deleteTarget.id}`;
      
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        showToast("İçerik silindi.");
        fetchItems();
      } else {
        showToast("Silme işlemi başarısız.", "error");
      }
    } catch (e) {
      showToast("Bağlantı hatası.", "error");
    }
    setDeleteTarget(null);
  };

  const handleClearAllConfirm = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("/api/clear-all", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        showToast("Tüm içerikler başarıyla silindi.");
        fetchItems();
      } else {
        showToast("Silme işlemi başarısız.", "error");
      }
    } catch (e) {
      showToast("Bağlantı hatası.", "error");
    }
    setClearAllConfirm(false);
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => document.getElementById("contents-section")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-sm font-bold mr-2"
              title="İçeriklere İn"
            >
              <ArrowDown size={16} />
              İçeriklere İn
            </button>
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <h1 className="text-base font-bold text-foreground tracking-tight">
              Dosya Yönetimi Yunus Tez
            </h1>
          </div>
          <div className="relative">
            <button
              onClick={() => setLogoutConfirm((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline font-medium">Çıkış</span>
            </button>
            <AnimatePresence>
              {logoutConfirm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-12 bg-card border border-border rounded-2xl shadow-xl p-4 w-56 z-40"
                >
                  <p className="text-sm text-foreground font-medium mb-3">
                    Çıkış yapmak istediğinize emin misiniz?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLogoutConfirm(false)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium text-muted-foreground bg-muted hover:bg-slate-200 transition-colors"
                    >
                      Vazgeç
                    </button>
                    <button
                      onClick={onLogout}
                      className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-primary hover:bg-blue-700 transition-colors"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Editor card */}
        <section>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Card header with save button */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Duyuru Editörü
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Yeni bir duyuru veya mesaj yazın
                </p>
              </div>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-500/20"
              >
                <Save size={15} />
                Kaydet & Paylaş
              </button>
            </div>
            <div className="p-6">
              <RichEditor editorRef={editorRef} />
            </div>
          </div>
        </section>

        {/* File upload card */}
        <section>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <h2 className="text-sm font-bold text-foreground">
                Dosya Yükleme
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Her türlü dosya formatı desteklenir · Çoklu yükleme · Klasör yükleme
              </p>
            </div>
            <div className="p-6">
              <UploadZone
                onFilesSelected={handleFilesSelected}
                uploadingFiles={uploadingFiles}
              />
            </div>
          </div>
        </section>

        {/* Shared items */}
        <section id="contents-section">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Son Paylaşılan Yazılar ve Dosyalar
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {items.length} içerik paylaşıldı
              </p>
            </div>
            {items.length > 0 && (
              <button
                onClick={() => setClearAllConfirm(true)}
                className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 size={14} />
                Tümünü Sil
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-16 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <FileText size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Henüz içerik paylaşılmamış
              </p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <AnimatePresence>
                {items.map((item) => (
                  <SharedCard
                    key={item.id}
                    item={item}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        <div className="pb-8" />
      </main>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            item={deleteTarget}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
        {clearAllConfirm && (
          <ClearAllModal
            onConfirm={handleClearAllConfirm}
            onCancel={() => setClearAllConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {toast && (
            <Toast
              key={toast.message}
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── App Root ──────────────────────────────────────────────────────────────────

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {!loggedIn ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <LoginPage onLogin={() => setLoggedIn(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Dashboard onLogout={() => setLoggedIn(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
