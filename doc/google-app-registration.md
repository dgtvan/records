# Google App Registration Guide

This app uses Google Identity Services in the browser and calls the Google Drive REST API directly from the client.

That means the Google Cloud setup is simple:

- You need an OAuth 2.0 client for a Web application.
- You need the Google Drive API enabled.
- You only need the public client ID in this repo.
- You do not need a client secret in the frontend.

If you are using the newer Google Cloud UI, most of this setup now appears under Google Auth Platform rather than the older OAuth consent screen flow.

## 1. Create or choose a Google Cloud project

1. Open the Google Cloud Console: https://console.cloud.google.com/
2. Create a new project, or select an existing project dedicated to this app.
3. Make sure billing and organization policies do not block API usage in that project.

Recommended: keep a dedicated project for this app so OAuth settings and test users stay isolated.

## 2. Enable the Google Drive API

1. In Google Cloud Console, confirm you are in the correct project.
2. Go to APIs & Services.
3. Click Library, or click Enable APIs and Services.
4. Search for Google Drive API.
5. Click Enable.

Without this step, sign-in may succeed but Drive requests will fail.

Important:

- If you are looking at Enabled APIs & Services, you are on the wrong page for discovery.
- The API Library is where you search for and enable Google Drive API.

## 3. Configure Google Auth Platform

1. In Google Cloud Console, go to Google Auth Platform.
2. Open Branding and fill the required app information:
   - App name
   - User support email
   - Developer contact email
3. Open Audience.
4. Choose External unless your users are entirely inside one Google Workspace and you explicitly want Internal.
5. Keep the app in Testing while you are developing.

About scopes:

- In the current Google Cloud UI, you may not see a scope setting while creating the OAuth client.
- That is normal.
- This app requests the Drive scope at runtime from the frontend code.
- The requested scope is `https://www.googleapis.com/auth/drive.file`.
- If you want to inspect scope-related settings in the current UI, check Google Auth Platform > Data Access.

For test users:

1. In Google Auth Platform, open Audience.
2. Under Test users, click Add users.
3. Enter the Google email addresses of everyone who should be allowed to test the app.
4. Save.

Important:

- While the app is unapproved and in Testing, only listed test users can complete sign-in.
- If someone is not added there, Google will block them at the consent screen.
- External apps in Testing typically allow up to 100 test users.

Notes:

- Testing mode is usually enough during development.
- If you plan to distribute this publicly, you may need Google verification depending on your final scope and audience.

## 4. Create the OAuth client

1. In Google Auth Platform, open Clients.
2. Click Create client.
3. Choose Application type: Web application.
4. Give it a clear name, for example `van-records-web`.

Yes, this step is required. This app needs a Web OAuth client because the frontend signs in directly from the browser and needs a client ID to request an access token.

### Authorized JavaScript origins

Add every origin that will host the frontend.

Typical local development origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

Typical GitHub Pages origin:

- `https://<your-github-username>.github.io`

Important:

- Use the origin only, not the full page URL.
- Do not include a trailing slash.
- If your local dev server runs on a different port, add that exact port.

### Authorized redirect URIs

This app uses the browser token client flow from Google Identity Services.

For the current implementation, redirect URIs are not used. You can leave Authorized redirect URIs empty unless you later change the auth flow.

You also do not need to enter scopes in the client form. The app requests the Drive scope at runtime.

## 5. Copy the client ID into the app

After creating the OAuth client, Google will show a client ID that looks like this:

```text
123456789012-abcdefg123456.apps.googleusercontent.com
```

Add it to a local `.env` file in the repo root:

```env
VITE_GOOGLE_CLIENT_ID=123456789012-abcdefg123456.apps.googleusercontent.com
VITE_GOOGLE_APP_FOLDER_NAME=.simple-records-app-data
```

Notes:

- `VITE_GOOGLE_CLIENT_ID` is required.
- `VITE_GOOGLE_APP_FOLDER_NAME` is optional. If omitted, the app defaults to `.simple-records-app-data`.

## 6. Configure GitHub Pages deployment

If you deploy through GitHub Pages, add the same client ID as a repository variable:

1. Open the GitHub repository.
2. Go to Settings > Secrets and variables > Actions.
3. Under Variables, add:
   - Name: `VITE_GOOGLE_CLIENT_ID`
   - Value: your OAuth client ID

If you want to override the default Drive app folder name in production, also add:

- `VITE_GOOGLE_APP_FOLDER_NAME`

Then make sure the GitHub Pages origin is included in the OAuth client's Authorized JavaScript origins.

## 7. Verify locally

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open the local URL shown by Vite.
4. Click Sign in with Google.
5. Approve the Drive access request.

Expected behavior after a successful login:

- The app can request a token.
- The app can create or reuse the root folder named `.simple-records-app-data`.
- The app can create or reuse the `profiles` folder inside it.

## 8. Common problems

### `origin_mismatch`

Cause: the current frontend origin is not listed in Authorized JavaScript origins.

Fix:

- Add the exact origin you are using.
- Check protocol, hostname, and port.

### I cannot find Google Drive API in the console

Cause: you are likely on Enabled APIs & Services instead of the API Library.

Fix:

- Go to APIs & Services.
- Click Library or Enable APIs and Services.
- Search for Google Drive API there.

### Sign-in works but Drive calls fail

Cause:

- Google Drive API is not enabled, or
- the OAuth consent screen/scopes are incomplete.

Fix:

- Enable Google Drive API.
- Confirm the app is requesting `https://www.googleapis.com/auth/drive.file`.

### I created the OAuth client but never saw a scope field

Cause: in the current Google Cloud UI, scope selection is not part of Web OAuth client creation.

Fix:

- This is expected.
- The frontend requests `https://www.googleapis.com/auth/drive.file` at runtime.
- Review Google Auth Platform > Data Access if you want to inspect scope-related app settings.

### `Missing VITE_GOOGLE_CLIENT_ID`

Cause: the frontend does not have the client ID in its environment.

Fix:

- Add `VITE_GOOGLE_CLIENT_ID` to `.env`.
- Restart the Vite dev server after changing `.env`.

### A tester gets blocked by the consent screen

Cause: the app is still in Testing mode and that Google account is not in Test users.

Fix:

- Add the account under Google Auth Platform > Audience > Test users.

## 9. Current app assumptions

This repository currently assumes:

- Browser-only auth using the Google Identity Services script loaded in `index.html`
- OAuth token flow driven by `src/services/googleDriveServices.ts`
- Drive scope limited to `https://www.googleapis.com/auth/drive.file`
- Public configuration via `VITE_GOOGLE_CLIENT_ID`

In practical terms, the minimum required Google setup is:

- Enable Google Drive API
- Configure Google Auth Platform branding and audience
- Add test users while the app is in Testing
- Create one Web OAuth client
- Add your JavaScript origins
- Copy the client ID into `VITE_GOOGLE_CLIENT_ID`

If you later switch to a backend-assisted auth flow, refresh tokens, or broader Drive access, this guide should be updated to match.