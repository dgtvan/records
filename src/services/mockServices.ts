import { getTemplateDefinition } from "../templates";
import type {
  CreateProfileRequest,
  CreateRecordCollectionRequest,
  DriveFile,
  ParsedRecord,
  PreviewDescriptor,
  ProfileRecord,
  ProfileListResult,
  ProfileRecordCollection,
  UploadRequest,
} from "../types";
import type {
  AuthService,
  DriveBootstrapService,
  PreviewService,
  ProfileService,
  RecordService,
  RecordsAppServices,
} from "./contracts";

const demoProfiles: ProfileRecord[] = [
  {
    profileFolderId: "profile-alice",
    profileFolderName: "Alice",
    configFileId: "config-alice",
    config: {
      name: "Alice",
      templateId: "health",
      createdAt: "2026-04-06T09:15:00Z",
    },
    recordCollections: [
      {
        name: "Medical timeline",
        recordTypeId: "records",
        folderId: "collection-alice-medical",
        folderName: "Medical timeline",
      },
    ],
  },
  {
    profileFolderId: "profile-bob",
    profileFolderName: "Bob",
    configFileId: "config-bob",
    config: {
      name: "Bob",
      templateId: "health",
      createdAt: "2026-04-08T10:30:00Z",
    },
    recordCollections: [
      {
        name: "Lab archive",
        recordTypeId: "records",
        folderId: "collection-bob-labs",
        folderName: "Lab archive",
      },
    ],
  },
];

const demoRecordsByCollectionId: Record<string, DriveFile[]> = {
  "collection-alice-medical": [
    {
      id: "record-1",
      name: "2026-04-06_HealthCertificate.pdf",
      mimeType: "application/pdf",
      modifiedTime: "2026-04-06T12:00:00Z",
      capabilities: { canDownload: true },
    },
    {
      id: "record-2",
      name: "2026-04-08_LabResult.png",
      mimeType: "image/png",
      modifiedTime: "2026-04-08T13:00:00Z",
      capabilities: { canDownload: true },
    },
    {
      id: "record-3",
      name: "misc_scan.png",
      mimeType: "image/png",
      capabilities: { canDownload: true },
    },
  ],
  "collection-bob-labs": [
    {
      id: "record-4",
      name: "2026-04-07_DoctorNote.pdf",
      mimeType: "application/pdf",
      capabilities: { canDownload: true },
    },
  ],
};

const auth: AuthService = {
  async getSession() {
    return {
      accessToken: "demo-token",
      userEmail: "demo@example.com",
    };
  },
  async signIn() {
    return {
      accessToken: "demo-token",
      userEmail: "demo@example.com",
    };
  },
  async signOut() {
    return;
  },
};

const driveBootstrap: DriveBootstrapService = {
  async ensureAppFolders() {
    return {
      appFolder: {
        id: "app-folder",
        name: ".simple-records-app-data",
      },
      profilesFolder: {
        id: "profiles-folder",
        name: "profiles",
      },
    };
  },
};

const profiles: ProfileService = {
  async listProfiles(): Promise<ProfileListResult> {
    return {
      profiles: demoProfiles,
      issues: [
        {
          profileFolderId: "broken-profile",
          profileFolderName: "LegacyImport",
          message: "Missing profile.json. This folder should be surfaced as an issue, not loaded as a profile.",
        },
      ],
    };
  },
  async createProfile(request: CreateProfileRequest) {
    return {
      profileFolderId: `profile-${request.name.toLowerCase()}`,
      profileFolderName: request.name,
      configFileId: `config-${request.name.toLowerCase()}`,
      config: {
        name: request.name,
        templateId: request.templateId,
        createdAt: new Date().toISOString(),
      },
      recordCollections: [],
    };
  },
  async listRecordCollections(profile: ProfileRecord): Promise<ProfileRecordCollection[]> {
    return profile.recordCollections;
  },
  async addRecordCollection(profile: ProfileRecord, request: CreateRecordCollectionRequest): Promise<ProfileRecordCollection> {
    const template = getTemplateDefinition(profile.config.templateId);
    const recordType = template.recordTypes.find((candidate) => candidate.id === request.recordTypeId);

    if (!recordType) {
      throw new Error("This collection template is not available for the selected profile.");
    }

    const nextName = request.name.trim();
    if (!nextName) {
      throw new Error("Collection name is required.");
    }

    const existingCollection = profile.recordCollections.find((collection) => collection.name.toLowerCase() === nextName.toLowerCase());
    if (existingCollection) {
      throw new Error("A record collection with this name already exists in the selected profile.");
    }

    return {
      name: nextName,
      recordTypeId: recordType.id,
      folderId: `collection-${profile.profileFolderId}-${Date.now()}`,
      folderName: nextName,
    };
  },
};

const records: RecordService = {
  async listFolderFiles(_profile: ProfileRecord, collection: ProfileRecordCollection) {
    return demoRecordsByCollectionId[collection.folderId] ?? [];
  },
  async uploadRecord(request: UploadRequest) {
    const collectionRecords = demoRecordsByCollectionId[request.recordCollection.folderId] ?? [];

    collectionRecords.unshift({
      id: `uploaded-${Date.now()}`,
      name: request.storedFileName,
      mimeType: request.file.type || "application/octet-stream",
      modifiedTime: new Date().toISOString(),
      capabilities: { canDownload: true },
    });

    demoRecordsByCollectionId[request.recordCollection.folderId] = collectionRecords;
    return;
  },
};

const preview: PreviewService = {
  async loadPreview(record: ParsedRecord): Promise<PreviewDescriptor> {
    if (!record.file.capabilities?.canDownload) {
      return {
        kind: "restricted",
        file: record.file,
        message: "Drive permissions do not allow this file to be downloaded for preview.",
      };
    }

    if (record.file.mimeType.startsWith("image/")) {
      return {
        kind: "image",
        file: record.file,
        message: "Image previews will render from a Drive blob URL.",
      };
    }

    if (record.file.mimeType === "application/pdf") {
      return {
        kind: "pdf",
        file: record.file,
        message: "PDF previews will render in an embedded frame from a Drive blob URL.",
      };
    }

    return {
      kind: "unsupported",
      file: record.file,
      message: "Preview not available for this file type in the MVP.",
    };
  },
  releasePreview(_preview: PreviewDescriptor) {
    return;
  },
};

export const mockServices: RecordsAppServices = {
  auth,
  driveBootstrap,
  profiles,
  records,
  preview,
};

export function describeTemplateForProfile(profile: ProfileRecord): string {
  return getTemplateDefinition(profile.config.templateId).describeProfile(profile);
}