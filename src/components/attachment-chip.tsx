// ─────────────────────────────────────────────────────────────────────────────
//  Attachment chip — the file filed with a follow-up update.
//
//  Openable files (PDF, image, text, HTML…) open in a new tab on click; the
//  small download button is always present so the CBO can grab a copy of
//  anything. Download-only files (Word, Excel, zip…) make Download the primary
//  action, since no browser tab can render them.
//
//  Pure links — no client hooks — so it renders in server and client components
//  alike. The route enforces auth and the correct disposition.
// ─────────────────────────────────────────────────────────────────────────────

import { FileText, FileSpreadsheet, FileImage, File as FileIcon, FileArchive, Presentation, Film, Download, ExternalLink } from "lucide-react";
import { canOpenInline, fileCategory, categoryLabel, formatBytes, type FileCategory } from "@/lib/attachments";
import { withBase } from "@/lib/base";

export type Attachment = { fileId: string; name: string; mime: string | null; size: number | null };

const ICON: Record<FileCategory, typeof FileIcon> = {
  pdf: FileText,
  image: FileImage,
  doc: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  text: FileText,
  archive: FileArchive,
  media: Film,
  file: FileIcon,
};

export function AttachmentChip({ file }: { file: Attachment }) {
  const cat = fileCategory(file.name, file.mime);
  const Icon = ICON[cat];
  const inline = canOpenInline(file.name, file.mime);
  const href = withBase(`/api/task-update-files/${file.fileId}`);
  const sizeText = formatBytes(file.size);

  return (
    <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted/40 py-0.5 pl-1.5 pr-1 align-middle">
      {/* Primary action: open in a new tab if the browser can render it, else download. */}
      <a
        href={inline ? href : `${href}?download=1`}
        target="_blank"
        rel="noopener noreferrer"
        title={inline ? `Open ${file.name} in a new tab` : `Download ${file.name}`}
        className="inline-flex min-w-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{file.name}</span>
        <span className="shrink-0 rounded bg-background px-1 text-[9px] font-bold uppercase text-muted-foreground">
          {categoryLabel(cat)}
        </span>
        {sizeText ? <span className="shrink-0 text-[10px] text-muted-foreground">{sizeText}</span> : null}
        {inline ? <ExternalLink className="h-3 w-3 shrink-0 opacity-70" /> : null}
      </a>

      {/* Download is always available, even for inline-openable files. */}
      <a
        href={`${href}?download=1`}
        title={`Download ${file.name}`}
        className="inline-flex shrink-0 items-center rounded p-0.5 text-muted-foreground hover:bg-background hover:text-primary"
        aria-label={`Download ${file.name}`}
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </span>
  );
}
