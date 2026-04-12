import type {
  AppFolderState,
  CreateProfileRequest,
  DriveFile,
  ParsedRecord,
  PreviewDescriptor,
  ProfileRecordTypeFolder,
  ProfileListResult,
  ProfileRecord,
  UploadRequest,
} from "../types";

export interface AuthSession {
  accessToken: string;
  expiresAt?: number;
  userEmail?: string;
}

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  signIn(): Promise<AuthSession>;
  signOut(): Promise<void>;
}

export interface DriveBootstrapService {
  ensureAppFolders(): Promise<AppFolderState>;
}

export interface ProfileService {
  listProfiles(): Promise<ProfileListResult>;
  createProfile(request: CreateProfileRequest): Promise<ProfileRecord>;
  listRecordTypeFolders(profile: ProfileRecord): Promise<ProfileRecordTypeFolder[]>;
}

export interface RecordService {
  listFolderFiles(profile: ProfileRecord, folder: ProfileRecordTypeFolder): Promise<DriveFile[]>;
  uploadRecord(request: UploadRequest): Promise<void>;
}

export interface PreviewService {
  loadPreview(record: ParsedRecord): Promise<PreviewDescriptor>;
  releasePreview(preview: PreviewDescriptor): void;
}

export interface RecordsAppServices {
  auth: AuthService;
  driveBootstrap: DriveBootstrapService;
  profiles: ProfileService;
  records: RecordService;
  preview: PreviewService;
}