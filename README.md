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