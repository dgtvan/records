/// <reference types="vite/client" />

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface GoogleAccountsOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }) => TokenClient;
  revoke: (token: string, callback: () => void) => void;
}

interface GoogleAccounts {
  oauth2: GoogleAccountsOauth2;
}

interface GoogleNamespace {
  accounts: GoogleAccounts;
}

interface Window {
  google?: GoogleNamespace;
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_APP_FOLDER_NAME?: string;
  readonly VITE_DEV_AUTH_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
