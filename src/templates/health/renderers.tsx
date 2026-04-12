import { useEffect, useMemo, useState } from "react";
import { UploadPanel } from "../../components/UploadPanel";
import type {
  TemplateHeaderRendererProps,
  TemplateRecordTypeRendererProps,
  TemplateSummaryCardProps,
  TemplateWorkspaceRendererProps,
} from "../types";
import { getHealthTemplateFacts } from "./logic";

export function HealthTemplateSummaryCard({ intro, label }: TemplateSummaryCardProps) {
  return (
    <article className="template-card">
      <h3>{label}</h3>
      <p>{intro}</p>
      <ul className="template-facts-list">
        {getHealthTemplateFacts().map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </article>
  );
}

export function HealthActiveProfileRenderer({ profile, activeRecordType, groups }: TemplateHeaderRendererProps) {
  const datedRecords = groups
    .filter((group) => !group.warning)
    .reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="active-profile-banner">
      <div>
        <strong>{profile.config.name}</strong>
        <span>{activeRecordType.description}</span>
      </div>
      <div className="template-metrics">
        <span>{datedRecords} dated file(s)</span>
        <span>{groups.length} group(s)</span>
      </div>
    </div>
  );
}

export function HealthRecordTypeView({
  groups,
  onOpenPreview,
  onClosePreview,
  preview,
  previewBusy,
  recordType,
}: TemplateRecordTypeRendererProps) {
  return (
    <div className="timeline-groups">
      {groups.length === 0 ? <p className="empty-state">{recordType.emptyMessage}</p> : null}
      {groups.map((group) => (
        <section className={group.warning ? "timeline-group warning" : "timeline-group"} key={group.key}>
          <div className="group-heading">
            <h3>{group.label}</h3>
            <span>{group.items.length} file(s)</span>
          </div>
          <ul className="record-list">
            {group.items.map((record) => (
              <li className="record-row" key={record.file.id}>
                <div>
                  <strong>{record.file.name}</strong>
                  <p>{record.warning ?? record.file.mimeType}</p>
                </div>
                <button onClick={() => onOpenPreview(record)} type="button">
                  {previewBusy && preview?.file.id === record.file.id ? "Loading..." : "Preview"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {preview ? <HealthPreviewSurface onClose={onClosePreview} preview={preview} /> : null}
    </div>
  );
}

function HealthPreviewSurface({
  preview,
  onClose,
}: {
  preview: import("../../types").PreviewDescriptor;
  onClose(): void;
}) {
  return (
    <section className="panel stack preview-panel">
      <div className="panel-header">
        <h2>Preview</h2>
        <button className="ghost-button" onClick={onClose} type="button">
          Close
        </button>
      </div>
      {preview.kind === "image" && preview.objectUrl ? (
        <div className="preview-card">
          <strong>{preview.file.name}</strong>
          <p>{preview.message}</p>
          <img alt={preview.file.name} className="preview-image" src={preview.objectUrl} />
        </div>
      ) : null}
      {preview.kind === "pdf" && preview.objectUrl ? (
        <div className="preview-card">
          <strong>{preview.file.name}</strong>
          <p>{preview.message}</p>
          <iframe className="preview-frame" src={preview.objectUrl} title={preview.file.name} />
        </div>
      ) : null}
      {preview.kind !== "image" && preview.kind !== "pdf" ? (
        <div className="preview-card warning-card">
          <strong>{preview.file.name}</strong>
          <p>{preview.message}</p>
        </div>
      ) : null}
    </section>
  );
}

export function HealthTemplateWorkspace({
  profile,
  activeRecordType,
  activeRecordTypeFolder,
  recordService,
  previewService,
}: TemplateWorkspaceRendererProps) {
  const [records, setRecords] = useState<import("../../types").ParsedRecord[]>([]);
  const [preview, setPreview] = useState<import("../../types").PreviewDescriptor | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const groups = useMemo(() => activeRecordType.buildGroups(records), [activeRecordType, records]);

  useEffect(() => {
    async function loadFolder() {
      setLoading(true);
      setError(null);

      try {
        const files = await recordService.listFolderFiles(profile, activeRecordTypeFolder);
        setRecords(activeRecordType.parseFiles(files));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load this record type.");
      } finally {
        setLoading(false);
      }
    }

    void loadFolder();
  }, [activeRecordType, activeRecordTypeFolder, profile, recordService]);

  useEffect(() => {
    return () => {
      if (preview) {
        previewService.releasePreview(preview);
      }
    };
  }, [preview, previewService]);

  async function handleOpenPreview(record: import("../../types").ParsedRecord) {
    setPreviewBusy(true);
    setError(null);

    try {
      if (preview) {
        previewService.releasePreview(preview);
      }

      const nextPreview = await previewService.loadPreview(record);
      setPreview(nextPreview);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load preview.");
    } finally {
      setPreviewBusy(false);
    }
  }

  function handleClosePreview() {
    if (preview) {
      previewService.releasePreview(preview);
    }

    setPreview(null);
  }

  async function handleUpload(payload: { date: string; file: File; storedFileName: string }) {
    setUploadBusy(true);

    try {
      await recordService.uploadRecord({
        profile,
        recordTypeFolder: activeRecordTypeFolder,
        storedFileName: payload.storedFileName,
        date: payload.date,
        file: payload.file,
      });

      const files = await recordService.listFolderFiles(profile, activeRecordTypeFolder);
      setRecords(activeRecordType.parseFiles(files));
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <section className="panel stack timeline-panel">
      <div className="panel-header">
        <div>
          <h2>{activeRecordType.label}</h2>
          <p>{activeRecordType.description}</p>
        </div>
        <button className="ghost-button" type="button">
          {activeRecordType.upload.submitLabel}
        </button>
      </div>

      <HealthActiveProfileRenderer activeRecordType={activeRecordType} groups={groups} profile={profile} />
      <UploadPanel busy={uploadBusy} onSubmit={handleUpload} recordType={activeRecordType} />
      {loading ? <p className="empty-state">Loading records for {activeRecordType.label.toLowerCase()}...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !error ? (
        <HealthRecordTypeView
          groups={groups}
          onClosePreview={handleClosePreview}
          onOpenPreview={handleOpenPreview}
          profile={profile}
          preview={preview}
          previewBusy={previewBusy}
          records={records}
          recordType={activeRecordType}
        />
      ) : null}
    </section>
  );
}