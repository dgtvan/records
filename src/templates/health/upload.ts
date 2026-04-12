import type { UploadDraft } from "../../types";
import type { TemplateUploadDefinition, TemplateUploadPlan } from "../types";

function normalizeBaseName(fileName: string): string {
  const trimmed = fileName.trim();
  const extensionIndex = trimmed.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return trimmed.replace(/\s+/g, "-");
  }

  const baseName = trimmed.slice(0, extensionIndex).replace(/\s+/g, "-");
  const extension = trimmed.slice(extensionIndex);
  return `${baseName}${extension}`;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateHealthUploadDraft(draft: UploadDraft): string[] {
  const issues: string[] = [];

  if (!draft.date || !isIsoDate(draft.date)) {
    issues.push("Choose a valid document date.");
  }

  if (!draft.fileName.trim()) {
    issues.push("Choose a file to upload.");
  }

  if (draft.fileName.includes("/")) {
    issues.push("File names must not contain slash characters.");
  }

  return issues;
}

export function buildHealthUploadPlan(draft: UploadDraft): TemplateUploadPlan {
  return {
    storedFileName: `${draft.date}_${normalizeBaseName(draft.fileName)}`,
  };
}

export const healthUploadDefinition: TemplateUploadDefinition = {
  accept: ".pdf,.png,.jpg,.jpeg",
  submitLabel: "Upload health record",
  dateLabel: "Document date",
  fileLabel: "Local file",
  helperText: "Files are stored as YYYY-MM-DD_OriginalName.ext in the selected record collection.",
  validateDraft: validateHealthUploadDraft,
  buildUploadPlan: buildHealthUploadPlan,
};