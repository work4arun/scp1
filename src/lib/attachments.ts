// ─────────────────────────────────────────────────────────────────────────────
//  Follow-up attachments — how each uploaded file type is opened.
//
//  One SM uploads a file with a status update; the CBO opens it from the
//  follow-up. Whether a file opens in a browser tab or has to be downloaded is
//  decided in ONE place here, so the serving route (Content-Disposition) and the
//  UI (open vs download button) never disagree.
//
//  "Inline" = the browser can render it in a tab: PDFs, images, plain text, and
//  HTML (rendered like a static page, matching the existing StaticPage feature).
//  Everything else — Office docs, zips, unknown types — is download-only, because
//  no browser renders them and an authenticated blob URL can't be handed to an
//  external viewer.
// ─────────────────────────────────────────────────────────────────────────────

/** Extension → MIME, for when the browser didn't supply a usable type. */
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp", avif: "image/avif",
  html: "text/html", htm: "text/html",
  txt: "text/plain", csv: "text/csv", log: "text/plain", md: "text/plain",
  json: "application/json", xml: "text/xml",
  mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed",
};

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** Resolve the MIME to serve with — prefer a real stored type, fall back to the extension. */
export function resolveMime(fileName: string, storedMime?: string | null): string {
  if (storedMime && storedMime !== "application/octet-stream" && storedMime.includes("/")) return storedMime;
  return MIME_BY_EXT[ext(fileName)] || "application/octet-stream";
}

/**
 * Can the browser render this in a tab? Anything here is served `inline`;
 * everything else gets `attachment` (download).
 *
 * SVG and HTML render as same-origin documents and can run script — same trust
 * model as the existing StaticPage upload (authenticated SMs, not the public).
 */
export function canOpenInline(fileName: string, storedMime?: string | null): boolean {
  const mime = resolveMime(fileName, storedMime);
  return (
    mime === "application/pdf" ||
    mime.startsWith("image/") ||
    mime.startsWith("text/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/json" ||
    mime === "text/html"
  );
}

export type FileCategory = "pdf" | "image" | "doc" | "sheet" | "slides" | "text" | "archive" | "media" | "file";

/** Coarse category, used only to pick an icon and a short label. */
export function fileCategory(fileName: string, storedMime?: string | null): FileCategory {
  const mime = resolveMime(fileName, storedMime);
  const e = ext(fileName);
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "media";
  if (e === "doc" || e === "docx") return "doc";
  if (e === "xls" || e === "xlsx" || mime === "text/csv") return "sheet";
  if (e === "ppt" || e === "pptx") return "slides";
  if (e === "zip" || e === "rar" || e === "7z") return "archive";
  if (mime.startsWith("text/") || mime === "application/json") return "text";
  return "file";
}

export function categoryLabel(cat: FileCategory): string {
  switch (cat) {
    case "pdf": return "PDF";
    case "image": return "Image";
    case "doc": return "Word";
    case "sheet": return "Sheet";
    case "slides": return "Slides";
    case "text": return "Text";
    case "archive": return "Archive";
    case "media": return "Media";
    default: return "File";
  }
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) { n /= 1024; u++; }
  return `${n < 10 && u > 0 ? n.toFixed(1) : Math.round(n)} ${units[u]}`;
}
