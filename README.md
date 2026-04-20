# Records Timeline

Static Vite + React + TypeScript app for organizing records in the user's own Google Drive with template-based profiles.

## What the MVP does

- Signs in with Google in the browser.
- Creates and uses a fixed Drive app folder named `.simple-records-app-data`.
- Creates profiles with a `profile.json` file and a `records` folder.
- Uploads files into the active profile using the format `YYYY-MM-DD_OriginalName.ext`.
- Groups valid files into a timeline and shows invalid filenames in a warning section.
- Loads image and PDF previews on demand in the same page.
- Flags malformed profile folders instead of silently hiding them.
- Ships with the built-in `health` template for MVP, while keeping the profile model template-based.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the repo root:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GOOGLE_APP_FOLDER_NAME=.simple-records-app-data
VITE_DEV_AUTH_MODE=
```

3. Start the dev server:

```bash
npm run dev
```

4. Build the static site:

```bash
npm run build
```

## Google setup

See [doc/google-app-registration.md](doc/google-app-registration.md) for the full Google Cloud setup guide.

- Create an OAuth 2.0 client for a web application in Google Cloud.
- Add your local dev origin and your GitHub Pages origin to the authorized JavaScript origins.
- Enable the Google Drive API.
- The app currently uses the Drive scope `https://www.googleapis.com/auth/drive.file`.
- The app uses Google Identity Services in the browser and calls the Drive REST API directly from the client.

## Local backend auth for development

If you want to avoid repeated browser sign-in during local development, you can run a small local auth server that stores a refresh token on your machine and exchanges it for short-lived Google access tokens.

This keeps production static, but gives local development a trusted place to hold secrets.

1. Create a local-only `.env.local` file:

```env
VITE_DEV_AUTH_MODE=backend
DEV_WEB_ORIGIN=http://localhost:5173
DEV_WEB_PORT=5173
DEV_AUTH_HOST=localhost
DEV_AUTH_PORT=5174
DEV_AUTH_PUBLIC_ORIGIN=http://localhost:5174
DEV_GOOGLE_CLIENT_ID=your_google_oauth_client_id
DEV_GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

2. Start local development with the auth backend and Vite together:

```bash
npm run dev:local
```

3. Open the Vite URL as usual. The app will fetch short-lived access tokens from the local auth server instead of showing the Google sign-in prompt.

4. The first time only, click Sign in. The local auth server will run a one-time Google OAuth flow and store the refresh token in `.dev-google-auth.json`.

5. After that, `npm run dev:local` will mint fresh access tokens automatically without asking you to log in every time.

Google OAuth client setup for this mode:

- Authorized JavaScript origins should include your Vite origin, typically `http://localhost:5173`.
- Authorized redirect URIs must include the exact local backend callback URI, typically `http://localhost:5174/api/dev-auth/callback`.
- If you prefer `127.0.0.1` instead of `localhost`, set both `DEV_AUTH_HOST` and `DEV_AUTH_PUBLIC_ORIGIN` to `127.0.0.1` values and register that exact callback in Google.
- The local frontend port is intentionally fixed to `5173` so OAuth origins stay stable during development.

Notes:

- This mode only runs in local development.
- Keep `.env.local` on your machine only.
- The refresh token is stored in `.dev-google-auth.json`, which is gitignored.
- The backend only handles token minting; the frontend still calls Drive directly with the returned access token.
- Use Sign out in dev mode if you want to clear the local refresh token and force the bootstrap flow again.
- `redirect_uri_mismatch` means the exact callback URL printed by the auth server is not registered in your Google OAuth client.

## GitHub Pages deployment

This repo includes [deploy.yml](.github/workflows/deploy.yml), which builds and deploys the static `dist` output with GitHub Actions.

Before enabling the workflow:

1. In GitHub, enable Pages and set the source to GitHub Actions.
2. Add a repository variable named `VITE_GOOGLE_CLIENT_ID` with your public OAuth client ID.
3. Push to `main` or `master`, or run the workflow manually.

## Data layout in Drive

```text
.simple-records-app-data/
  profiles/
    <profile-name>/
      profile.json
      records/
        YYYY-MM-DD_OriginalName.ext
```