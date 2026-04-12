import { useMemo, useState } from "react";
import type { TemplateDefinition } from "../templates";
import type { UploadDraft } from "../types";

interface UploadPanelProps {
  template: TemplateDefinition;
  busy?: boolean;
  onSubmit(payload: { date: string; file: File; storedFileName: string }): Promise<void>;
}

export function UploadPanel({ template, busy = false, onSubmit }: UploadPanelProps) {
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const draft: UploadDraft = {
    date,
    fileName: file?.name ?? "",
  };

  const validationIssues = useMemo(() => template.upload.validateDraft(draft), [draft, template]);
  const uploadPlan = useMemo(() => template.upload.buildUploadPlan(draft), [draft, template]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(null);

    if (!file || validationIssues.length > 0) {
      return;
    }

    try {
      await onSubmit({
        date,
        file,
        storedFileName: uploadPlan.storedFileName,
      });
      setDate("");
      setFile(null);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <section className="panel stack upload-panel">
      <div className="panel-header">
        <div>
          <h2>{template.upload.submitLabel}</h2>
          <p>{template.upload.helperText}</p>
        </div>
      </div>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field-stack">
          <span>{template.upload.dateLabel}</span>
          <input onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </label>
        <label className="field-stack">
          <span>{template.upload.fileLabel}</span>
          <input
            accept={template.upload.accept}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
        <div className="upload-plan-box">
          <strong>Stored filename</strong>
          <p>{uploadPlan.storedFileName || "Choose a date and file to preview the stored name."}</p>
        </div>
        {validationIssues.length > 0 ? (
          <ul className="validation-list">
            {validationIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        {submissionError ? <p className="error-text">{submissionError}</p> : null}
        <button className="ghost-button" disabled={busy || validationIssues.length > 0 || !file} type="submit">
          {busy ? "Uploading..." : template.upload.submitLabel}
        </button>
      </form>
    </section>
  );
}