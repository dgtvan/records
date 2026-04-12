import type { ComponentType } from "react";
import type {
  DriveFile,
  ParsedRecord,
  PreviewDescriptor,
  ProfileRecord,
  ProfileRecordCollection,
  TemplateId,
  TimelineGroup,
  UploadDraft,
} from "../types";
import type { PreviewService, RecordService } from "../services/contracts";

export interface TemplateUploadPlan {
  storedFileName: string;
}

export interface TemplateUploadDefinition {
  accept: string;
  submitLabel: string;
  dateLabel: string;
  fileLabel: string;
  helperText: string;
  validateDraft(draft: UploadDraft): string[];
  buildUploadPlan(draft: UploadDraft): TemplateUploadPlan;
}

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  folderName: string;
  description: string;
  emptyMessage: string;
  parseFiles(files: DriveFile[]): ParsedRecord[];
  buildGroups(records: ParsedRecord[]): TimelineGroup[];
  menuLabel: string;
  intro: string;
  upload: TemplateUploadDefinition;
  describeProfile(profile: ProfileRecord): string;
  SummaryCard: ComponentType<TemplateSummaryCardProps>;
  WorkspaceRenderer: ComponentType<TemplateWorkspaceRendererProps>;
}

export interface TemplateHeaderRendererProps {
  profile: ProfileRecord;
  activeRecordCollection: ProfileRecordCollection;
  activeTemplate: TemplateDefinition;
  groups: TimelineGroup[];
}

export interface TemplateRendererProps {
  profile: ProfileRecord;
  template: TemplateDefinition;
  records: ParsedRecord[];
  groups: TimelineGroup[];
  preview: PreviewDescriptor | null;
  previewBusy: boolean;
  onClosePreview(): void;
  onOpenPreview(record: ParsedRecord): void;
}

export interface TemplateWorkspaceRendererProps {
  profile: ProfileRecord;
  activeRecordCollection: ProfileRecordCollection;
  activeTemplate: TemplateDefinition;
  recordService: RecordService;
  previewService: PreviewService;
}

export interface TemplateSummaryCardProps {
  intro: string;
  label: string;
}
