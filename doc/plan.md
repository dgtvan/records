# Family Health Document Timeline – Final Plan

## 1. Product Goal

Build a **static web app** that helps a family organize health documents stored in **Google Drive** by:

- Listing files from the user’s Drive.
- Grouping them into a **timeline by date** (based on filename prefixes).
- Showing an **inline preview panel** when the user clicks a file.

The app:
- Runs purely on the client.
- Is hosted on **GitHub Pages**.
- Requires **no backend**.
- Keeps all documents in **the user’s own Google Drive**.
- Never opens previews in a new tab (same‑tab only).

---

## 2. Core Behavior

Users:
1. Sign in with **Google**.
2. Authorize the app to read Drive files and metadata.
3. The app checks for a dedicated app folder named `.simple-health-records-app-data` in the root of the user’s Drive.
4. If the folder does not exist, the app creates it automatically, along with its `docs` subfolder.
5. If duplicate app folders exist, the app stops and shows an error that the user must resolve in Drive before continuing.
6. The app lets the user create a person profile using plain text, limited to 20 characters.
7. When a person profile is created, the app creates the corresponding folder in `docs` through the Google Drive API.
8. If person folder creation fails, the app shows an error and does not create the profile locally.
9. At any given time, the app works inside one active person profile.
10. The app lists documents from the active person’s folder.
11. See documents grouped by **day** in a timeline.
12. Invalid filenames appear in an **Unsorted / Warning** group and are never silently ignored.
13. Upload a file by opening a person profile, then selecting a date and a local file.
14. The app stores the uploaded file in the correct filename format.
15. Click a file to open a **preview panel** in the same page.
16. The app loads preview content only for the selected file.
17. Close the panel to return to the timeline.

---

## 3. Scope

### Must-have (MVP)

- Static UI hosted on GitHub Pages.
- Google sign‑in and OAuth2 in the browser.
- Use a fixed app folder name in the root of the user’s Drive: `.simple-health-records-app-data`.
- On startup, find that folder or create it automatically if it does not exist.
- Create and use a `docs` subfolder inside the app folder.
- Store documents under per-person folders inside `docs`.
- Let users create person profiles with plain-text names up to 20 characters.
- Validate person profile names by trimming whitespace, requiring a non-empty value, and rejecting slash characters.
- Create the corresponding person folder through the Drive API as part of profile creation.
- If person folder creation fails, show an error and do not create the profile.
- Allow working with one active person profile at a time.
- If duplicate app folders are found, block the app and show a resolution error.
- List files from the active person folder inside `docs`.
- Read filename and Drive metadata (id, type, name, etc.).
- Parse filename prefix `YYYY-MM-DD_...` for grouping.
- Show invalid filenames in an **Unsorted / Warning** group with a visible reason.
- Show a **timeline by date** (day → list of files).
- Upload a user-selected file into the active person folder under `docs`.
- Let the user choose the document date during upload.
- Save uploaded files using the required filename format.
- Click a file → open **inline preview panel in the same tab**.
- Load preview content only on user selection; do not prefetch preview bytes.
- Preview supported types:
  - images downloaded with Drive API and rendered inline,
  - PDFs downloaded with Drive API and rendered in an embedded viewer,
  - other files with a “preview not available” fallback.
- No new tabs for previews.
- No backend server.

### Nice‑to‑have (post‑MVP)

- Search by:
  - date range,
  - person (e.g., `Alice`, `Bob`),
  - type (exam, lab, X-ray, etc.).
- Filters:
  - “Today”, “This week”, “All”.
- Thumbnail icons for image/PDF files in the timeline.

---

## 4. Architecture

### Layers

| Layer            | Choice |
|------------------|--------|
| Front end        | Static SPA (HTML, CSS, JS) |
| Hosting          | GitHub Pages |
| Auth             | Google OAuth 2.0 (client‑side) |
| Storage          | User’s Google Drive |
| Data source      | Drive file metadata + file content for supported previews |
| Folder config    | Fixed app folder `.simple-health-records-app-data` created in Drive root |
| App data layout  | Files stored under `.simple-health-records-app-data/docs/<personname>` |
| Profile model    | Plain-text person profiles, max 20 characters, one active at a time |
| Timeline engine  | Client‑side filename parsing + invalid-file classification |
| Upload engine    | Client-side upload with generated filename |
| Preview engine   | Client‑side inline panels (no new tabs) |

### Google Drive integration

- Use:
  - `files.list` to locate the app folder in Drive root and list its contents [web:25].
  - `files.create` to create the app folder on first use.
  - `files.create` to create the `docs` subfolder on first use.
  - `files.list` to read person folders under `docs` and files within them [web:25].
  - `files.create` to create a person folder under `docs` during profile creation.
  - `files.get` to read metadata for specific files.
  - `files.get?alt=media` to download blob file content for inline previews.
  - `files.create` with upload media to upload new documents into the active person folder.
- Preview implementation:
  - Use authenticated Drive API downloads for images and PDFs, then render them from in-memory Blob URLs.
  - Only request preview bytes after the user selects a file.
  - Do not prefetch file content during timeline loading.
  - Do **not** rely on `webViewLink` or `webContentLink` for same-tab inline preview; those are browser links, not a reliable embedded preview mechanism.
  - If Google Workspace files need preview later, use `files.export` for a supported export format.
- Keep scopes minimal, but note that metadata-only scopes are not enough for previews because preview requires file-content download access [web:54].
- MVP file support:
  - Support uploaded binary files such as PDF, JPG, JPEG, and PNG.
  - Do not support Google Workspace native files in the MVP.

### App data structure

Use this fixed structure in the user’s Drive root:

```text
.simple-health-records-app-data/
  docs/
    <personname>/
      YYYY-MM-DD_OriginalName.ext
```

Rules:
- The app creates `.simple-health-records-app-data` if it does not exist.
- The app creates `docs` inside it if it does not exist.
- The app stores documents inside `docs/<personname>`.
- The app creates a person folder when the user creates a new person profile.
- Person names are plain text and limited to 20 characters.
- Person names are trimmed, must not be empty, and must not contain slash characters.
- If more than one `.simple-health-records-app-data` folder exists in Drive root, the app stops and shows an error until the user resolves the duplicate manually.

---

## 5. File naming convention

Use a strict format for filenames in Drive:

```text
YYYY-MM-DD_OriginalName.ext
```

Examples:
```text
Alice/2026-04-06_BloodTest.pdf
Bob/2026-04-06_ChestXRay.jpg
Alice/2026-04-07_VisitSummary.pdf
```

The app will:
- Parse `YYYY-MM-DD` to group by day.
- Use the parent person folder for the family member label.
- Place files that do not match the pattern into an **Unsorted / Warning** group.

Upload behavior for MVP:
- The user opens a person profile, then selects a date and a local file.
- The app generates the stored filename in the required format.
- The app preserves the original filename after the date prefix.

---

## 6. Preview behavior (same‑tab only)

- The timeline is a **list** of files grouped by date.
- Each file row has a **“Preview”** button.
- Clicking it:
  1. Loads the file metadata,
  2. Checks whether the file can be downloaded,
  3. Downloads supported file content with an authenticated Drive API request,
  4. Renders a **preview panel inside the same page** (no new tab).
- For:
  - **Images**: render an `<img>` from a Blob URL.
  - **PDFs**: embed a Blob URL in an `<iframe>`.
  - **Unsupported files**: show a fallback (“Preview not available; download in Drive”) entirely in the panel.
  - **Non-downloadable files**: show a fallback explaining that Drive permissions or restrictions prevent preview.

If certain file types cannot be embedded safely, the app gracefully shows a message in the same panel instead of opening a new tab [web:40][web:71].

---

## 7. Person profile workflow

- The app shows a way to create a new person profile.
- A person name is plain text and limited to 20 characters.
- The app validates the name before calling Drive: trim whitespace, require a non-empty value, and reject slash characters.
- When the user creates a profile, the app calls the Google Drive API to create the corresponding folder under `.simple-health-records-app-data/docs`.
- If Drive folder creation succeeds, the profile is available in the app.
- If Drive folder creation fails, the app shows an error and the profile is not added.
- The user opens one person profile at a time, and all timeline and upload actions are scoped to that active profile.

---

## 8. Upload behavior

- The upload UI lets the user pick:
  - a document date,
  - a local file.
- Upload is only available when a person profile is open.
- The app uploads the file into the active profile folder at `.simple-health-records-app-data/docs/<personname>`.
- The app renames the stored file to match the required naming convention.
- The app should preserve the uploaded file extension.
- The uploaded file appears in the timeline after a successful refresh.

---

## 9. Data model terminology

- `fileId`: Google Drive file ID.
- `folderId`: the ID of the app folder created in the root of the user’s Drive.
- `docsFolderId`: the ID of the `docs` subfolder inside the app folder.
- `personFolderName`: the folder name under `docs` representing a family member.
- `activeProfile`: the currently opened person profile in the app.
- `parsedDate`: the date extracted from the filename prefix.
- `isValidFilename`: whether a file matches the required naming convention.

---

## 10. Phased build plan

### Phase 1: MVP (Google Drive + timeline + preview)

1. Build static UI on GitHub Pages.
2. Add Google sign‑in with OAuth.
3. Look up `.simple-health-records-app-data` in the root of the user’s Drive.
4. Create that folder automatically if it does not exist.
5. Detect duplicate app folders and block with an error if duplicates exist.
6. Create or locate the `docs` subfolder.
7. Implement person profile creation with plain-text names up to 20 characters.
8. Create the corresponding person folder through the Drive API and show an error if creation fails.
9. Let the user open one active profile at a time.
10. Connect to Drive `files.list` for the active person folder.
11. Implement filename parsing for `YYYY-MM-DD_...`.
12. Render timeline grouped by day.
13. Render invalid filenames in an **Unsorted / Warning** group.
14. Implement MVP upload for a selected date and local file inside the active profile.
15. Generate the stored filename in the required format.
16. Implement **same‑tab preview panel** for:
   - images,
   - PDFs,
   - basic fallback for others.
17. Ensure previews are loaded on demand only, with no prefetching.
18. Ensure no new tabs are opened for previews.

### Phase 2: UX polish and family workflow

1. Add search and filters (date, person, type).
2. Add thumbnails and icons.
3. Add richer upload fields for `Type` and document title metadata.
4. Add a repair helper for invalid filenames and missing metadata.

---

## 11. Risks and constraints

- **OAuth setup** will be the main complexity; you must configure Google Cloud project, OAuth consent, and scopes correctly [web:54][web:30].
- **Preview authorization**: metadata-only scopes are insufficient for inline preview; the app must request a scope that allows downloading file content.
- **App folder naming**: the app uses `.simple-health-records-app-data` and must stop with a clear error if duplicates already exist in Drive root.
- **Filename discipline**: if family members stop using the prefix format, the timeline becomes incomplete; invalid files must appear in an explicit warning group.
- **Person profile creation**: the app depends on Drive folder creation succeeding before a profile becomes usable.
- **Drive restrictions**: some file types cannot be embedded; the app must fall back gracefully in the same panel [web:40][web:71].

---

## 12. Success criteria for MVP

The first release is successful if:

- A family member can:
  1. Sign in with Google.
  2. Let the app create or find `.simple-health-records-app-data` in Drive root.
  3. Let the app create or find the `docs` folder.
  4. Create a person profile using a plain-text name up to 20 characters.
  5. Have the app create the corresponding Drive folder or show an error if it fails.
  6. Open one person profile and work within it.
  7. Upload a file by choosing a date and a local file.
  8. Have the app store the file under the active person folder with the correct filename format.
  9. See valid documents grouped by day in a timeline.
  10. See invalid filenames in an **Unsorted / Warning** group.
  11. Click a file and see a **same‑tab preview panel**.
  12. Have preview content load only for the selected file.
  13. Close the panel and keep browsing the timeline.
- The app:
  - Has no backend.
  - Never opens a new tab for previews.
  - Stores all documents in the user’s Drive.

---

## 13. Next steps (optional)

If you want, the next step can be:
- A **simple UI wireframe** (list + preview panel).
- A **GitHub repo structure** suggestion for your static app.