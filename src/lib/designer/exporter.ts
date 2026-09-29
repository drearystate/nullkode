// Server-side export — wraps @open-codesign/exporters which provides PDF,
// PPTX, ZIP, Markdown, HTML.

import { findPrimaryHtml } from "./files";
import { db } from "../db";

export type ExportFormat = "html" | "pdf" | "pptx" | "zip" | "markdown";

export interface ExportResult {
  ok: true;
  filename: string;
  // Base64-encoded so the renderer can `download` it directly without
  // setting up a separate signed download URL.
  contentBase64: string;
  contentType: string;
}

export interface ExportError {
  ok: false;
  error: string;
}

export async function exportDesign(
  userId: string,
  designId: string,
  format: ExportFormat,
): Promise<ExportResult | ExportError> {
  const design = await db.designerDesign.findFirst({
    where: { id: designId, userId },
    select: { id: true, name: true },
  });
  if (!design) return { ok: false, error: "design not found" };
  const primary = await findPrimaryHtml(designId);
  if (!primary) return { ok: false, error: "no primary HTML to export" };

  const filename = `${design.name.replace(/[^\w.-]+/g, "-")}.${format === "markdown" ? "md" : format}`;

  if (format === "html") {
    return {
      ok: true,
      filename,
      contentType: "text/html",
      contentBase64: Buffer.from(primary.content, "utf8").toString("base64"),
    };
  }
  if (format === "markdown") {
    // Naive HTML→Markdown — upstream uses turndown. For now strip tags.
    const md = primary.content
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim();
    return {
      ok: true,
      filename,
      contentType: "text/markdown",
      contentBase64: Buffer.from(md, "utf8").toString("base64"),
    };
  }
  if (format === "pdf") {
    // Upstream uses puppeteer-core. Stub for now — return HTML wrapped as PDF
    // would require Chrome on this host, which the upstream desktop bundles.
    return { ok: false, error: "PDF export not yet wired in cloud mode" };
  }
  if (format === "pptx") {
    try {
      // pptxgenjs is pure JS, server-safe.
      const PptxGenJSImport = (await import("pptxgenjs")) as unknown as {
        default: new () => {
          addSlide(): { addText(text: string, opts?: unknown): void };
          write(opts: { outputType: string }): Promise<ArrayBuffer | Uint8Array>;
        };
      };
      const PptxGenJS = PptxGenJSImport.default;
      const pres = new PptxGenJS();
      const slide = pres.addSlide();
      slide.addText(design.name, { x: 0.5, y: 0.3, fontSize: 32, bold: true });
      const text = primary.content
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2000);
      slide.addText(text, { x: 0.5, y: 1.2, w: 9, h: 5.5, fontSize: 12 });
      const buf = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
      return {
        ok: true,
        filename,
        contentType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        contentBase64: Buffer.from(buf).toString("base64"),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "pptx export failed",
      };
    }
  }
  if (format === "zip") {
    try {
      const allFiles = await db.designerFile.findMany({ where: { designId } });
      // Use the JSZip package that's already in their workspace if installed,
      // otherwise dynamic import.
      const JSZipMod = (await import("jszip")) as unknown as { default: new () => {
        file(name: string, content: string): void;
        generateAsync(opts: { type: string }): Promise<Buffer | Uint8Array>;
      }};
      const zip = new JSZipMod.default();
      for (const f of allFiles) zip.file(f.path, f.content);
      const buf = (await zip.generateAsync({ type: "nodebuffer" })) as Buffer;
      return {
        ok: true,
        filename,
        contentType: "application/zip",
        contentBase64: Buffer.from(buf).toString("base64"),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "zip export failed",
      };
    }
  }
  return { ok: false, error: `unknown format: ${format}` };
}
