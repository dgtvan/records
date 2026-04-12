import type {
  AppFolderState,
  CreateProfileRequest,
  CreateRecordCollectionRequest,
  DriveFile,
  ParsedRecord,
  PreviewDescriptor,
  ProfileRecordCollection,
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
  listRecordCollections(profile: ProfileRecord): Promise<ProfileRecordCollection[]>;
  addRecordCollection(profile: ProfileRecord, request: CreateRecordCollectionRequest): Promise<ProfileRecordCollection>;
}

export interface RecordService {
  listFolderFiles(profile: ProfileRecord, collection: ProfileRecordCollection): Promise<DriveFile[]>;
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