export type TemplateId = "health";

export type RecordTypeId = string;

export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  capabilities?: {
    canDownload?: boolean;
  };
}

export interface DriveFolderRef {
  id: string;
  name: string;
}

export interface AppFolderState {
  appFolder: DriveFolderRef;
  profilesFolder: DriveFolderRef;
}

export interface ProfileConfig {
  name: string;
  templateId: TemplateId;
  createdAt: string;
}

export interface RecordCollectionConfig {
  name: string;
  recordTypeId: RecordTypeId;
  createdAt: string;
}

export interface ProfileRecordCollection {
  folderId: string;
  folderName: string;
  name: string;
  configFileId?: string;
  recordTypeId: RecordTypeId;
}

export interface ProfileRecord {
  profileFolderId: string;
  profileFolderName: string;
  configFileId: string;
  config: ProfileConfig;
  recordCollections: ProfileRecordCollection[];
}

export interface ProfileIssue {
  profileFolderId: string;
  profileFolderName: string;
  message: string;
}

export interface ProfileListResult {
  profiles: ProfileRecord[];
  issues: ProfileIssue[];
}

export interface ParsedRecord {
  file: DriveFile;
  valid: boolean;
  date?: string;
  warning?: string;
}

export interface TimelineGroup {
  key: string;
  label: string;
  items: ParsedRecord[];
  warning: boolean;
}

export interface PreviewDescriptor {
  kind: "image" | "pdf" | "unsupported" | "restricted";
  file: DriveFile;
  objectUrl?: string;
  message?: string;
}

export interface UploadDraft {
  date: string;
  fileName: string;
}

export interface UploadRequest {
  profile: ProfileRecord;
  recordCollection: ProfileRecordCollection;
  storedFileName: string;
  date: string;
  file: File;
}

export interface CreateProfileRequest {
  name: string;
  templateId: TemplateId;
}

export interface CreateRecordCollectionRequest {
  name: string;
  recordTypeId: RecordTypeId;
}

export interface AppShellState {
  signedIn: boolean;
  activeProfileId?: string;
  activeRecordCollectionId?: string;
  profileCount: number;
  issueCount: number;
  recordCollectionCount: number;
}
