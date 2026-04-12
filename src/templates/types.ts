import type { ComponentType } from "react";
import type {
  DriveFile,
  ParsedRecord,
  PreviewDescriptor,
  ProfileRecord,
  ProfileRecordCollection,
  RecordTypeId,
  TemplateId,
  TimelineGroup,
  UploadDraft,
} from "../types";
import type { PreviewService, RecordService } from "../services/contracts";

export interface TemplateHeaderRendererProps {
  profile: ProfileRecord;
  activeRecordCollection: ProfileRecordCollection;
  activeRecordType: TemplateRecordTypeDefinition;
  groups: TimelineGroup[];
}

export interface TemplateRecordTypeRendererProps {
  profile: ProfileRecord;
  recordType: TemplateRecordTypeDefinition;
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
  activeRecordType: TemplateRecordTypeDefinition;
  recordService: RecordService;
  previewService: PreviewService;
}

export interface TemplateUploadPlan {
  storedFileName: string;
}

export interface TemplateRecordTypeUploadDefinition {
  accept: string;
  submitLabel: string;
  dateLabel: string;
  fileLabel: string;
  helperText: string;
  validateDraft(draft: UploadDraft): string[];
  buildUploadPlan(draft: UploadDraft): TemplateUploadPlan;
}

export interface TemplateRecordTypeDefinition {
  id: RecordTypeId;
  label: string;
  folderName: string;
  description: string;
  emptyMessage: string;
  parseFiles(files: DriveFile[]): ParsedRecord[];
  buildGroups(records: ParsedRecord[]): TimelineGroup[];
  upload: TemplateRecordTypeUploadDefinition;
  RecordTypeView: ComponentType<TemplateRecordTypeRendererProps>;
}

export interface TemplateSummaryCardProps {
  intro: string;
  label: string;
}

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  menuLabel: string;
  intro: string;
  recordTypes: TemplateRecordTypeDefinition[];
  describeProfile(profile: ProfileRecord): string;
  SummaryCard: ComponentType<TemplateSummaryCardProps>;
  WorkspaceRenderer: ComponentType<TemplateWorkspaceRendererProps>;
}