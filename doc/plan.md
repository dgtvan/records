# Records Timeline – Final Plan

## 1. Product Goal

Build a **static web app** that helps users organize records stored in **Google Drive**.

The app helps by:

- Listing files from the user’s Drive.
- Grouping them into a **timeline by date** based on filename prefixes.
- Showing an **inline preview panel** when the user clicks a file.
- Organizing records under multiple **profiles**.
- Letting each profile use a **template** that can slightly change rendering and record-management behavior.

The app:

- Runs purely on the client.
- Is hosted on **GitHub Pages**.
- Requires **no backend**.
- Keeps all documents in **the user’s own Google Drive**.
- Never opens previews in a new tab.

---

## 2. Core Behavior

Users:

1. Sign in with **Google**.
2. Authorize the app to read and manage the app’s Drive files.
3. The app checks for a dedicated app folder named `.simple-records-app-data` in the root of the user’s Drive.
4. If the folder does not exist, the app creates it automatically, along with a `profiles` subfolder.
5. If duplicate app folders exist, the app stops and shows an error that the user must resolve in Drive before continuing.
6. The app lets the user create a profile using plain text, limited to 20 characters.
7. When a profile is created, the app:
   - creates a profile folder,
   - creates a `records` subfolder,
  - creates a fixed `profile.json` file containing profile metadata, including the selected template.
8. If profile creation fails at any step, the app shows an error and does not add the profile.
9. At any given time, the app works inside one active profile.
10. The app lists records from the active profile’s `records` folder.
11. The app shows records grouped by **day** in a timeline.
12. Invalid filenames appear in an **Unsorted / Warning** group and are never silently ignored.
13. Upload is only available after the user opens a profile.
14. The user uploads a file by selecting a date and a local file.
15. The app stores the uploaded file in the correct filename format.
16. Clicking a file opens a **preview panel** in the same page.
17. Preview content loads only for the selected file.
18. Closing the preview returns the user to the timeline.

---

## 3. Scope

### Must-have (MVP)

- Static UI hosted on GitHub Pages.
- Frontend implemented with Vite, TypeScript, and React.
- Do not implement the app as a large vanilla JavaScript codebase.
- Google sign-in and OAuth2 in the browser.
- Fixed app folder in Drive root: `.simple-records-app-data`.
- Automatic creation of `.simple-records-app-data` and its `profiles` subfolder if missing.
- Duplicate app-folder detection with a blocking error.
- Multiple profiles.
- Profile names are plain text, trimmed, non-empty, limited to 20 characters, and must not contain slash characters.
- Profile creation creates all required Drive folders and a fixed `profile.json` configuration file for that profile.
- One active profile at a time.
- Per-profile record storage under that profile’s `records` folder.
- Built-in profile template support.
- Each profile stores a selected template.
- MVP templates may adjust labels, layout, and small workflow differences, while keeping the same base file storage model.
- MVP ships with only the built-in `health` template.
- Read filename and Drive metadata.
- Parse filename prefix `YYYY-MM-DD_...` for grouping.
- Show invalid filenames in an **Unsorted / Warning** group with a visible reason.
- Show a **timeline by date**.
- Upload a user-selected file into the active profile’s `records` folder.
- Let the user choose the document date during upload.
- Save uploaded files using the required filename format.
- Open previews inline in the same tab.
- Load preview content only on user selection.
- No prefetching of preview bytes.
- Preview supported types:
  - images downloaded with Drive API and rendered inline,
  - PDFs downloaded with Drive API and rendered in an embedded viewer,
  - other files with a “preview not available” fallback.
- No new tabs for previews.
- No backend server.

### Nice-to-have (post-MVP)

- Search by:
  - date range,
  - profile,
  - template,
  - record type.
- Filters such as “Today”, “This week”, and “All”.
- Thumbnail icons for image and PDF files in the timeline.
- Richer template-specific rendering.
- Template-specific upload fields and record metadata.
- Template-specific file organization beyond the base `records` folder.

---

## 4. Architecture

### Layers

| Layer | Choice |
|-------|--------|
| Front end | Static SPA built with Vite + TypeScript + React |
| Hosting | GitHub Pages |
| Auth | Google OAuth 2.0 (client-side) |
| Storage | User’s Google Drive |
| Data source | Drive file metadata, `profile.json` configuration files, and file content for supported previews |
| Folder config | Fixed app folder `.simple-records-app-data` created in Drive root |
| App data layout | Files stored under `.simple-records-app-data/profiles/<profilename>` |
| Profile model | Plain-text profile names, max 20 characters, one active profile at a time |
| Template model | Built-in templates selected per profile |
| Timeline engine | Client-side filename parsing plus invalid-file classification |
| Upload engine | Client-side upload with generated filename |
| Preview engine | Client-side inline panels |

### Frontend stack

- Use Vite for project structure, development workflow, and static production builds.
- Use TypeScript for application code.
- Use React for component structure and stateful UI.
- Keep the MVP simple: no backend, no SSR, no unnecessary client state framework unless the app later proves it needs one.
- Prefer modular components and services over one large script file.

### Google Drive integration

- OAuth model:
  - Use Google Identity Services in the browser for sign-in and OAuth consent.
  - Use the authorization code-free browser token flow suitable for a static SPA.
  - Request tokens only from the client; do not introduce any backend token exchange in MVP.
  - Attempt silent token refresh where available, and otherwise require the user to re-consent in the browser.
- Use:
  - `files.list` to locate the app folder in Drive root and list contents.
  - `files.create` to create the app folder on first use.
  - `files.create` to create the `profiles` subfolder on first use.
  - `files.create` to create a profile folder and a `records` subfolder during profile creation.
  - `files.create` to create a fixed `profile.json` file inside each profile folder.
  - `files.list` to read profile folders and files inside the active profile.
  - `files.get` to read metadata for specific files.
  - `files.get?alt=media` to download blob file content for inline previews.
  - `files.create` with upload media to upload new files into the active profile’s `records` folder.
- Listing behavior:
  - Do not rely on the default order from `files.list`.
  - Use the `orderBy` parameter explicitly when order matters.
  - For profiles, `orderBy=name_natural` is a sensible default.
  - For records, API sort can use keys such as `name`, `name_natural`, `createdTime`, or `modifiedTime`, but the app should still parse filenames and group client-side.
- Preview implementation:
  - Use authenticated Drive API downloads for images and PDFs, then render them from in-memory Blob URLs.
  - Only request preview bytes after the user selects a file.
  - Do not prefetch file content during timeline loading.
  - Do not rely on `webViewLink` or `webContentLink` for same-tab inline preview.
  - If Google Workspace files are supported later, use `files.export` for a supported export format.
- OAuth scopes:
  - Use `https://www.googleapis.com/auth/drive.file` for MVP.
  - This scope is chosen because metadata-only scopes are insufficient for preview downloads, and full Drive scope is broader than needed for the intended app-owned workflow.
  - The app should operate only on files and folders it creates or that the user explicitly opens through the app's workflow.
  - If later requirements demand broad access to pre-existing arbitrary Drive files, that should be treated as a deliberate scope expansion and reviewed separately.
- MVP file support:
  - Support uploaded binary files such as PDF, JPG, JPEG, and PNG.
  - Do not support Google Workspace native files in the MVP.

### GitHub Pages deployment assumptions

- The app is deployed as a static Vite build on GitHub Pages.
- If the site is hosted under a repository subpath rather than a custom root domain, configure Vite `base` accordingly for production builds.
- Register both local development origins and the final GitHub Pages origin in Google Cloud OAuth settings.
- Treat the GitHub Pages origin as an environment-specific deployment detail, not as a hard-coded constant in application logic.

### App data structure

Use this fixed structure in the user’s Drive root:

```text
.simple-records-app-data/
  profiles/
    <profilename>/
      profile.json
      records/
        YYYY-MM-DD_OriginalName.ext
```

Example `profile.json`:

```json
{
  "name": "Alice",
  "templateId": "health",
  "createdAt": "2026-04-06T09:15:00Z"
}
```

Rules:

- The app creates `.simple-records-app-data` if it does not exist.
- The app creates `profiles` inside it if it does not exist.
- The app stores each profile inside `profiles/<profilename>`.
- The app stores each profile’s files inside `profiles/<profilename>/records`.
- The app stores profile configuration in a fixed `profile.json` file inside the profile folder.
- Profile names are plain text and limited to 20 characters.
- Profile names are trimmed, must not be empty, and must not contain slash characters.
- Profile names are matched case-insensitively for duplicate detection in the app.
- If a profile with the same normalized name already exists, the app blocks creation and shows a clear duplicate-name error.
- If more than one `.simple-records-app-data` folder exists in Drive root, the app stops and shows an error until the user resolves the duplicate manually.
- If a profile folder is missing `profile.json`, has an unreadable or invalid `profile.json`, or is missing its `records` folder, the app shows that profile as an issue instead of silently ignoring it.
- Invalid profile folders are not selectable as the active profile until they are repaired manually or by a future repair workflow.

---

## 5. Profile Templates

Each profile has a selected **template**.

Template responsibilities:

- Adjust section labels or wording in the UI.
- Adjust small rendering differences for the timeline or detail view.
- Define optional template-specific metadata or future upload fields.
- Influence future file-management behavior.

To keep the MVP manageable:

- All templates still store files in the same `records` folder structure.
- All templates still use the same base filename format.
- Template-specific behavior is intentionally lightweight in MVP.

Recommended MVP assumption:

- Ship with a required built-in `health` template.
- Do not ship additional templates in the first release.
- A profile’s template is chosen at creation time and cannot be changed in MVP.
- Structure the code so additional templates can be added later.

---

## 6. File Naming Convention

Use a strict format for filenames in Drive:

```text
YYYY-MM-DD_OriginalName.ext
```

Examples:

```text
Alice/2026-04-06_HealthCertificate.pdf
Bob/2026-04-06_LabResult.jpg
Alice/2026-04-07_DoctorNote.pdf
```

The app will:

- Parse `YYYY-MM-DD` to group by day.
- Use the active profile as the label or record owner.
- Place files that do not match the pattern into an **Unsorted / Warning** group.

Upload behavior for MVP:

- The user opens a profile, then selects a date and a local file.
- The app generates the stored filename in the required format.
- The app preserves the original filename after the date prefix.
- If the generated filename already exists in the active profile's `records` folder, the app blocks the upload and shows a filename-collision error in MVP.
- Automatic renaming or suffix-based conflict resolution is out of scope for MVP.

---

## 7. Preview Behavior

- The timeline is a list of files grouped by date.
- Each file row has a **Preview** button.
- Clicking it:
  1. Loads the file metadata.
  2. Checks whether the file can be downloaded.
  3. Downloads supported file content with an authenticated Drive API request.
  4. Renders a preview panel inside the same page.
- For:
  - Images: render an `<img>` from a Blob URL.
  - PDFs: embed a Blob URL in an `<iframe>`.
  - Unsupported files: show a fallback message inside the panel.
  - Non-downloadable files: show a fallback explaining that Drive permissions or restrictions prevent preview.

If certain file types cannot be embedded safely, the app gracefully shows a message in the same panel instead of opening a new tab.

---

## 8. Profile Workflow

- The app shows a way to create a new profile.
- A profile name is plain text and limited to 20 characters.
- The app validates the name before calling Drive: trim whitespace, require a non-empty value, and reject slash characters.
- The app stores a selected template for the profile.
- In MVP, that template is fixed after profile creation.
- When the user creates a profile, the app calls the Google Drive API to create:
  - the profile folder,
  - its `records` subfolder,
  - its fixed `profile.json` metadata file.
- Before creating a profile, the app checks the existing profile list for a case-insensitive name collision.
- If Drive creation succeeds, the profile becomes available in the app.
- If Drive creation fails, the app shows an error and the profile is not added.
- If a partially created profile folder structure is left behind after a failure, the app should report it as an invalid profile on the next refresh rather than treating it as healthy.
- The user opens one profile at a time, and all timeline, upload, and preview actions are scoped to that active profile.

---

## 9. Upload Behavior

- The upload UI lets the user pick:
  - a document date,
  - a local file.
- Upload is only available when a profile is open.
- The app uploads the file into the active profile’s `records` folder.
- The app renames the stored file to match the required naming convention.
- The app preserves the uploaded file extension.
- The app checks for an existing file with the same generated name before upload.
- If a collision is found, the app cancels the upload and asks the user to rename the local file or choose a different document date.
- The uploaded file appears in the timeline after a successful refresh.

---

## 10. Data Model Terminology

- `fileId`: Google Drive file ID.
- `appFolderId`: the ID of `.simple-records-app-data`.
- `profilesFolderId`: the ID of the `profiles` subfolder.
- `profileFolderId`: the ID of a specific profile folder.
- `recordsFolderId`: the ID of that profile’s `records` subfolder.
- `profileName`: the profile folder name.
- `templateId`: the built-in template assigned to the profile and stored in `profile.json`.
- `activeProfile`: the currently opened profile in the app.
- `parsedDate`: the date extracted from the filename prefix.
- `isValidFilename`: whether a file matches the required naming convention.

---

## 11. Phased Build Plan

### Phase 1: MVP

1. Build the static UI for GitHub Pages.
2. Initialize the frontend with Vite, TypeScript, and React.
3. Add Google sign-in with OAuth.
4. Look up `.simple-records-app-data` in Drive root.
5. Create that folder automatically if it does not exist.
6. Detect duplicate app folders and block with an error if duplicates exist.
7. Create or locate the `profiles` subfolder.
8. Implement profile creation with plain-text names up to 20 characters.
9. Validate profile names before any Drive write.
10. Create the profile folder, its `records` subfolder, and its fixed `profile.json` metadata file.
11. Let the user open one active profile at a time.
12. Implement a built-in `health` template.
13. Keep the profile template fixed after creation in MVP.
14. Load the active profile’s files from its `records` folder.
15. Implement filename parsing for `YYYY-MM-DD_...`.
16. Render a timeline grouped by day.
17. Render invalid filenames in an **Unsorted / Warning** group.
18. Implement MVP upload for a selected date and local file inside the active profile.
19. Generate the stored filename in the required format.
20. Implement same-tab preview for images, PDFs, and fallback cases.
21. Ensure previews are loaded on demand only.
22. Ensure no new tabs are opened for previews.

### Phase 2: Template Expansion and UX

1. Add search and filters.
2. Add thumbnails and icons.
3. Add more built-in templates.
4. Add richer template-specific upload fields and metadata.
5. Add richer template-specific rendering differences.
6. Add repair helpers for invalid filenames and missing metadata.

---

## 12. Risks and Constraints

- **OAuth setup** remains the main integration complexity.
- **OAuth scope boundaries**: `drive.file` is sufficient for the intended app-owned workflow, but it will not behave like unrestricted Drive browsing.
- **Preview authorization**: metadata-only scopes are insufficient for inline preview.
- **App folder naming**: the app uses `.simple-records-app-data` and must stop with a clear error if duplicates already exist in Drive root.
- **Profile integrity**: malformed profile folders must be surfaced as issues instead of being treated as usable profiles.
- **Filename discipline**: if uploaded files stop following the date-prefix format, the timeline becomes incomplete and warnings increase.
- **Filename collisions**: the MVP intentionally blocks duplicate generated filenames rather than inventing suffix rules.
- **Profile creation** depends on Drive folder creation and `profile.json` creation succeeding before a profile becomes usable.
- **Pages deployment path**: the Vite base path and OAuth allowed origins must match the actual GitHub Pages hosting path.
- **Template design** can expand quickly in scope if template-specific behavior is made too deep too early.
- **Template mutability** is intentionally out of scope for MVP; changing a profile template later should be treated as future work.
- **Drive restrictions**: some file types cannot be embedded and must fall back gracefully inside the page.
- **Maintainability**: avoid growing the app as an unstructured vanilla JavaScript script; keep it componentized and typed from the start.

---

## 13. Success Criteria for MVP

The first release is successful if:

- A user can:
  1. Sign in with Google.
  2. Let the app create or find `.simple-records-app-data` in Drive root.
  3. Let the app create or find the `profiles` folder.
  4. Create a profile using a plain-text name up to 20 characters.
  5. Have the app create the corresponding profile folder structure and `profile.json` file or show an error if it fails.
  6. Open one active profile and work within it.
  7. Upload a file by choosing a date and a local file.
  8. Have the app store the file under the active profile with the correct filename format.
  9. See valid records grouped by day in a timeline.
  10. See invalid filenames in an **Unsorted / Warning** group.
  11. Click a file and see a same-tab preview panel.
  12. Have preview content load only for the selected file.
  13. Close the panel and keep browsing the timeline.
- The app:
  - Has no backend.
  - Never opens a new tab for previews.
  - Stores all files in the user’s Drive.
  - Supports only the built-in `health` template in MVP.
  - Treats a profile’s template as fixed after creation in MVP.

---

## 14. Next Steps

If you want, the next step can be:

- a Vite-based project structure for the app,
- a simple wireframe for profiles, timeline, upload, and preview,
- a concrete template model for the built-in `health` template and future extensions.