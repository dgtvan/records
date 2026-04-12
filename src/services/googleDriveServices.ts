import { getTemplateDefinition } from "../templates";
import type {
  AppFolderState,
  CreateProfileRequest,
  CreateRecordCollectionRequest,
  DriveFile,
  ProfileConfig,
  RecordCollectionConfig,
  ProfileIssue,
  ProfileListResult,
  ProfileRecord,
  ProfileRecordCollection,
  UploadRequest,
} from "../types";
import type {
  AuthService,
  AuthSession,
  DriveBootstrapService,
  PreviewService,
  ProfileService,
  RecordService,
  RecordsAppServices,
} from "./contracts";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
const DRIVE_API_ROOT = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_ROOT = "https://www.googleapis.com/upload/drive/v3/files";
const USER_INFO_API = "https://www.googleapis.com/oauth2/v2/userinfo";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const PROFILE_CONFIG_FILE_NAME = "_profile.json";
const RECORD_COLLECTION_CONFIG_FILE_NAME = "_collection.json";
const SESSION_STORAGE_KEY = "records-timeline-auth-session";
const AUTH_GRANTED_STORAGE_KEY = "records-timeline-auth-granted";
const APP_FOLDER_NAME = import.meta.env.VITE_GOOGLE_APP_FOLDER_NAME || ".simple-records-app-data";

interface StoredAuthSession extends AuthSession {
  expiresAt?: number;
}

interface DriveListResponse<T> {
  files: T[];
}

let currentSession: StoredAuthSession | null = loadStoredSession();
let cachedFolders: AppFolderState | null = null;
let ensureAppFoldersPromise: Promise<AppFolderState> | null = null;

function hasValidSession(session: StoredAuthSession | null): session is StoredAuthSession {
  return Boolean(session && (!session.expiresAt || session.expiresAt > Date.now()));
}

function hasGrantedAccess(): boolean {
  return window.localStorage.getItem(AUTH_GRANTED_STORAGE_KEY) === "true";
}

function persistGrantedAccess() {
  window.localStorage.setItem(AUTH_GRANTED_STORAGE_KEY, "true");
}

function clearGrantedAccess() {
  window.localStorage.removeItem(AUTH_GRANTED_STORAGE_KEY);
}

function loadStoredSession(): StoredAuthSession | null {
  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (!hasValidSession(parsed)) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function persistSession(session: StoredAuthSession | null) {
  if (!session) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  persistGrantedAccess();
}

async function waitForGoogle(): Promise<GoogleNamespace> {
  if (window.google) {
    return window.google;
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      if (window.google) {
        window.clearInterval(interval);
        resolve(window.google);
        return;
      }

      if (Date.now() - startedAt > 10000) {
        window.clearInterval(interval);
        reject(new Error("Google Identity Services did not load."));
      }
    }, 100);
  });
}

function requireClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing VITE_GOOGLE_CLIENT_ID. Configure the Google OAuth client ID before signing in.");
  }

  return clientId;
}

async function fetchUserEmail(accessToken: string): Promise<string | undefined> {
  const response = await fetch(USER_INFO_API, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json()) as { email?: string };
  return payload.email;
}

async function requestAccessToken(prompt: string): Promise<StoredAuthSession> {
  const google = await waitForGoogle();

  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: requireClientId(),
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || "Google sign-in failed."));
          return;
        }

        void (async () => {
          try {
            const expiresAt = response.expires_in ? Date.now() + response.expires_in * 1000 : undefined;
            const userEmail = await fetchUserEmail(response.access_token);
            const session: StoredAuthSession = {
              accessToken: response.access_token,
              expiresAt,
              userEmail,
            };

            currentSession = session;
            persistSession(session);
            resolve(session);
          } catch (error) {
            reject(error instanceof Error ? error : new Error("Google sign-in failed."));
          }
        })();
      },
    });

    tokenClient.requestAccessToken({ prompt });
  });
}

async function refreshSessionSilently(): Promise<StoredAuthSession | null> {
  if (!hasGrantedAccess()) {
    return null;
  }

  try {
    return await requestAccessToken("");
  } catch {
    return null;
  }
}

async function signInWithFallback(): Promise<StoredAuthSession> {
  if (!hasGrantedAccess()) {
    return requestAccessToken("consent");
  }

  try {
    return await requestAccessToken("");
  } catch {
    return requestAccessToken("consent");
  }
}

function getValidSession(): StoredAuthSession {
  if (!currentSession) {
    throw new Error("Sign in with Google to continue.");
  }

  if (!hasValidSession(currentSession)) {
    currentSession = null;
    persistSession(null);
    throw new Error("Your Google session expired. Sign in again.");
  }

  return currentSession;
}

async function driveFetch(path: string, init?: RequestInit, allowRefresh = true): Promise<Response> {
  const session = getValidSession();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);

  const response = await fetch(path, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    currentSession = null;
    persistSession(null);

    if (allowRefresh) {
      const refreshedSession = await refreshSessionSilently();
      if (refreshedSession) {
        return driveFetch(path, init, false);
      }
    }

    cachedFolders = null;
    ensureAppFoldersPromise = null;
    throw new Error("Google session expired. Sign in again.");
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Drive request failed with status ${response.status}.`);
  }

  return response;
}

async function listFiles<T>(params: Record<string, string>): Promise<T[]> {
  const search = new URLSearchParams({
    orderBy: "name_natural",
    ...params,
  });
  const response = await driveFetch(`${DRIVE_API_ROOT}/files?${search.toString()}`);
  const payload = (await response.json()) as DriveListResponse<T>;
  return payload.files;
}

async function listNamedFiles<T>(parentId: string, names: string[], fields: string): Promise<T[]> {
  const quotedNames = names.map((name) => `name='${name}'`).join(" or ");

  return listFiles<T>({
    q: `(${quotedNames}) and '${parentId}' in parents and trashed=false`,
    fields,
  });
}

async function createFolder(name: string, parentId?: string): Promise<{ id: string; name: string }> {
  const response = await driveFetch(`${DRIVE_API_ROOT}/files?fields=id,name`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME_TYPE,
      parents: parentId ? [parentId] : undefined,
    }),
  });

  return (await response.json()) as { id: string; name: string };
}

async function multipartUpload(metadata: Record<string, unknown>, file: Blob, fileName: string): Promise<void> {
  const formData = new FormData();
  formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  formData.append("file", file, fileName);

  await driveFetch(`${DRIVE_UPLOAD_ROOT}?uploadType=multipart&fields=id,name`, {
    method: "POST",
    body: formData,
  });
}

async function readFileText(fileId: string): Promise<string> {
  const response = await driveFetch(`${DRIVE_API_ROOT}/files/${fileId}?alt=media`);
  return response.text();
}

function mapDriveFile(file: DriveFile): DriveFile {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    size: file.size,
    capabilities: file.capabilities,
  };
}

async function listChildFolders(parentId: string): Promise<Array<{ id: string; name: string }>> {
  return listFiles<{ id: string; name: string }>({
    q: `'${parentId}' in parents and mimeType='${FOLDER_MIME_TYPE}' and trashed=false`,
    fields: "files(id,name)",
    orderBy: "name_natural",
  });
}

async function ensureProfilesFolder(appFolderId: string): Promise<{ id: string; name: string }> {
  const profileFolders = await listFiles<{ id: string; name: string }>({
    q: `name='profiles' and mimeType='${FOLDER_MIME_TYPE}' and '${appFolderId}' in parents and trashed=false`,
    fields: "files(id,name)",
  });

  if (profileFolders.length > 1) {
    throw new Error("Duplicate profiles folders found inside the app folder. Resolve them in Drive before continuing.");
  }

  if (profileFolders.length === 1) {
    return profileFolders[0];
  }

  return createFolder("profiles", appFolderId);
}

function validateProfileConfig(data: unknown): ProfileConfig {
  if (!data || typeof data !== "object") {
    throw new Error(`${PROFILE_CONFIG_FILE_NAME} is not a valid object.`);
  }

  const candidate = data as Partial<ProfileConfig>;
  if (typeof candidate.name !== "string" || !candidate.name.trim()) {
    throw new Error(`${PROFILE_CONFIG_FILE_NAME} is missing a valid name.`);
  }
  if (typeof candidate.createdAt !== "string" || !candidate.createdAt) {
    throw new Error(`${PROFILE_CONFIG_FILE_NAME} is missing createdAt.`);
  }

  return {
    name: candidate.name,
    createdAt: candidate.createdAt,
  };
}

function validateRecordCollectionConfig(data: unknown): RecordCollectionConfig {
  if (!data || typeof data !== "object") {
    throw new Error(`${RECORD_COLLECTION_CONFIG_FILE_NAME} is not a valid object.`);
  }

  const candidate = data as Partial<RecordCollectionConfig>;
  if (typeof candidate.name !== "string" || !candidate.name.trim()) {
    throw new Error(`${RECORD_COLLECTION_CONFIG_FILE_NAME} is missing a valid name.`);
  }
  if (candidate.templateId !== "health") {
    throw new Error(`${RECORD_COLLECTION_CONFIG_FILE_NAME} references an unsupported template.`);
  }
  if (typeof candidate.createdAt !== "string" || !candidate.createdAt) {
    throw new Error(`${RECORD_COLLECTION_CONFIG_FILE_NAME} is missing createdAt.`);
  }

  return {
    name: candidate.name,
    templateId: candidate.templateId,
    createdAt: candidate.createdAt,
  };
}

const auth: AuthService = {
  async getSession() {
    if (hasValidSession(currentSession)) {
      return currentSession;
    }

    currentSession = null;
    persistSession(null);
    return refreshSessionSilently();
  },
  async signIn() {
    return signInWithFallback();
  },
  async signOut() {
    if (currentSession?.accessToken) {
      const google = await waitForGoogle();
      google.accounts.oauth2.revoke(currentSession.accessToken, () => undefined);
    }

    currentSession = null;
    cachedFolders = null;
    ensureAppFoldersPromise = null;
    persistSession(null);
    clearGrantedAccess();
  },
};

const driveBootstrap: DriveBootstrapService = {
  async ensureAppFolders() {
    if (cachedFolders) {
      return cachedFolders;
    }

    if (ensureAppFoldersPromise) {
      return ensureAppFoldersPromise;
    }

    ensureAppFoldersPromise = (async () => {
      const appFolders = await listFiles<{ id: string; name: string }>({
        q: `name='${APP_FOLDER_NAME}' and mimeType='${FOLDER_MIME_TYPE}' and 'root' in parents and trashed=false`,
        fields: "files(id,name)",
      });

      if (appFolders.length > 1) {
        throw new Error(`Duplicate ${APP_FOLDER_NAME} folders found in Drive root. Resolve them before continuing.`);
      }

      const appFolder = appFolders[0] ?? (await createFolder(APP_FOLDER_NAME));
      const profilesFolder = await ensureProfilesFolder(appFolder.id);

      cachedFolders = {
        appFolder,
        profilesFolder,
      };

      return cachedFolders;
    })();

    try {
      return await ensureAppFoldersPromise;
    } finally {
      ensureAppFoldersPromise = null;
    }
  },
};

const profiles: ProfileService = {
  async listProfiles(): Promise<ProfileListResult> {
    const { profilesFolder } = await driveBootstrap.ensureAppFolders();
    const folders = await listFiles<{ id: string; name: string }>({
      q: `'${profilesFolder.id}' in parents and mimeType='${FOLDER_MIME_TYPE}' and trashed=false`,
      fields: "files(id,name)",
      orderBy: "name_natural",
    });

    const profileRecords: ProfileRecord[] = [];
    const issues: ProfileIssue[] = [];

    for (const folder of folders) {
      const recognizedConfigFiles = await listNamedFiles<{ id: string; name: string }>(
        folder.id,
        [PROFILE_CONFIG_FILE_NAME],
        "files(id,name)",
      );

      if (recognizedConfigFiles.length !== 1) {
        issues.push({
          profileFolderId: folder.id,
          profileFolderName: folder.name,
          message:
            recognizedConfigFiles.length === 0
              ? `Missing ${PROFILE_CONFIG_FILE_NAME}.`
              : `Duplicate ${PROFILE_CONFIG_FILE_NAME} files found.`,
        });
        continue;
      }

      try {
        const configText = await readFileText(recognizedConfigFiles[0].id);
        const config = validateProfileConfig(JSON.parse(configText));

        profileRecords.push({
          profileFolderId: folder.id,
          profileFolderName: folder.name,
          configFileId: recognizedConfigFiles[0].id,
          config,
          recordCollections: [],
        });
      } catch (error) {
        issues.push({
          profileFolderId: folder.id,
          profileFolderName: folder.name,
          message: error instanceof Error ? error.message : "Invalid profile configuration.",
        });
      }
    }

    return { profiles: profileRecords, issues };
  },
  async createProfile(request: CreateProfileRequest): Promise<ProfileRecord> {
    const { profilesFolder } = await driveBootstrap.ensureAppFolders();
    const profileFolder = await createFolder(request.name, profilesFolder.id);

    const config: ProfileConfig = {
      name: request.name,
      createdAt: new Date().toISOString(),
    };

    await multipartUpload(
      {
        name: PROFILE_CONFIG_FILE_NAME,
        parents: [profileFolder.id],
        mimeType: "application/json",
      },
      new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }),
      PROFILE_CONFIG_FILE_NAME,
    );

    const configFiles = await listNamedFiles<{ id: string; name: string }>(
      profileFolder.id,
      [PROFILE_CONFIG_FILE_NAME],
      "files(id,name)",
    );

    return {
      profileFolderId: profileFolder.id,
      profileFolderName: profileFolder.name,
      configFileId: configFiles[0]?.id ?? "",
      config,
      recordCollections: [],
    };
  },
  async listRecordCollections(profile: ProfileRecord): Promise<ProfileRecordCollection[]> {
    const childFolders = await listChildFolders(profile.profileFolderId);
    const collections: ProfileRecordCollection[] = [];

    for (const folder of childFolders) {
      const recognizedConfigFiles = await listNamedFiles<{ id: string; name: string }>(
        folder.id,
        [RECORD_COLLECTION_CONFIG_FILE_NAME],
        "files(id,name)",
      );

      if (recognizedConfigFiles.length === 1) {
        try {
          const configText = await readFileText(recognizedConfigFiles[0].id);
          const config = validateRecordCollectionConfig(JSON.parse(configText));
          collections.push({
            folderId: folder.id,
            folderName: folder.name,
            name: config.name,
            configFileId: recognizedConfigFiles[0].id,
            templateId: config.templateId,
          });
          continue;
        } catch {
          continue;
        }
      }
    }

    return collections;
  },
  async addRecordCollection(profile: ProfileRecord, request: CreateRecordCollectionRequest): Promise<ProfileRecordCollection> {
    const template = getTemplateDefinition(request.templateId);

    const nextName = request.name.trim();
    if (!nextName) {
      throw new Error("Collection name is required.");
    }

    const childFolders = await listChildFolders(profile.profileFolderId);
    const existingFolder = childFolders.find((candidate) => candidate.name.toLowerCase() === nextName.toLowerCase());
    if (existingFolder) {
      throw new Error("A record collection with this name already exists in the selected profile.");
    }

    const createdFolder = await createFolder(nextName, profile.profileFolderId);
    const config: RecordCollectionConfig = {
      name: nextName,
      templateId: template.id,
      createdAt: new Date().toISOString(),
    };

    await multipartUpload(
      {
        name: RECORD_COLLECTION_CONFIG_FILE_NAME,
        parents: [createdFolder.id],
        mimeType: "application/json",
      },
      new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }),
      RECORD_COLLECTION_CONFIG_FILE_NAME,
    );

    const configFiles = await listNamedFiles<{ id: string; name: string }>(
      createdFolder.id,
      [RECORD_COLLECTION_CONFIG_FILE_NAME],
      "files(id,name)",
    );

    return {
      folderId: createdFolder.id,
      folderName: createdFolder.name,
      name: nextName,
      configFileId: configFiles[0]?.id,
      templateId: template.id,
    };
  },
};

const records: RecordService = {
  async listFolderFiles(_profile: ProfileRecord, collection: ProfileRecordCollection): Promise<DriveFile[]> {
    const files = await listFiles<DriveFile>({
      q: `'${collection.folderId}' in parents and trashed=false and name!='${RECORD_COLLECTION_CONFIG_FILE_NAME}'`,
      fields: "files(id,name,mimeType,createdTime,modifiedTime,size,capabilities/canDownload)",
      orderBy: "name_natural",
    });

    return files.map(mapDriveFile);
  },
  async uploadRecord(request: UploadRequest): Promise<void> {
    await multipartUpload(
      {
        name: request.storedFileName,
        parents: [request.recordCollection.folderId],
      },
      request.file,
      request.storedFileName,
    );
  },
};

const preview: PreviewService = {
  async loadPreview(record) {
    if (!record.file.capabilities?.canDownload) {
      return {
        kind: "restricted",
        file: record.file,
        message: "Drive permissions do not allow this file to be downloaded for preview.",
      };
    }

    const isImage = record.file.mimeType.startsWith("image/");
    const isPdf = record.file.mimeType === "application/pdf";

    if (!isImage && !isPdf) {
      return {
        kind: "unsupported",
        file: record.file,
        message: "Preview not available for this file type in the MVP.",
      };
    }

    const response = await driveFetch(`${DRIVE_API_ROOT}/files/${record.file.id}?alt=media`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    return {
      kind: isPdf ? "pdf" : "image",
      file: record.file,
      objectUrl,
      message: isPdf ? "PDF preview loaded from Google Drive." : "Image preview loaded from Google Drive.",
    };
  },
  releasePreview(previewDescriptor) {
    if (previewDescriptor.objectUrl) {
      URL.revokeObjectURL(previewDescriptor.objectUrl);
    }
  },
};

export const googleDriveServices: RecordsAppServices = {
  auth,
  driveBootstrap,
  profiles,
  records,
  preview,
};