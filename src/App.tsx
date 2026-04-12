import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppSidebar } from "./components/AppSidebar";
import { googleDriveServices } from "./services/googleDriveServices";
import { getTemplateDefinition, getTemplateRecordType, listTemplateDefinitions } from "./templates";
import type {
  ProfileListResult,
  ProfileIssue,
  ProfileRecord,
  ProfileRecordTypeFolder,
  TemplateId,
} from "./types";

function App() {
  const services = googleDriveServices;
  const templates = listTemplateDefinitions();
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [issues, setIssues] = useState<ProfileIssue[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>();
  const [recordTypeFolders, setRecordTypeFolders] = useState<ProfileRecordTypeFolder[]>([]);
  const [activeRecordTypeId, setActiveRecordTypeId] = useState<string>();
  const [authSession, setAuthSession] = useState<Awaited<ReturnType<typeof services.auth.getSession>>>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [profilesBusy, setProfilesBusy] = useState(true);
  const [createProfileBusy, setCreateProfileBusy] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileTemplateId, setNewProfileTemplateId] = useState<TemplateId | "">("");
  const [profileSwitcherOpen, setProfileSwitcherOpen] = useState(false);
  const [addRecordTypePickerOpen, setAddRecordTypePickerOpen] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.profileFolderId === activeProfileId),
    [activeProfileId, profiles],
  );

  const activeTemplate = activeProfile ? getTemplateDefinition(activeProfile.config.templateId) : null;
  const availableRecordTypes = useMemo(() => {
    if (!activeTemplate) {
      return [];
    }

    return activeTemplate.recordTypes.filter((recordType) =>
      recordTypeFolders.some((folder) => folder.recordTypeId === recordType.id),
    );
  }, [activeTemplate, recordTypeFolders]);
  const remainingRecordTypes = useMemo(() => {
    if (!activeTemplate) {
      return [];
    }

    return activeTemplate.recordTypes.filter(
      (recordType) => !recordTypeFolders.some((folder) => folder.recordTypeId === recordType.id),
    );
  }, [activeTemplate, recordTypeFolders]);

  const activeRecordType = activeProfile && activeRecordTypeId
    ? getTemplateRecordType(activeProfile.config.templateId, activeRecordTypeId)
    : null;
  const activeRecordTypeFolder = useMemo(
    () => recordTypeFolders.find((folder) => folder.recordTypeId === activeRecordTypeId),
    [activeRecordTypeId, recordTypeFolders],
  );

  useEffect(() => {
    async function initialize() {
      setProfilesBusy(true);

      try {
        const session = await services.auth.getSession();
        setAuthSession(session);

        if (session) {
          await loadProfiles();
        } else {
          setProfiles([]);
          setIssues([]);
          setProfilesBusy(false);
        }
      } catch (error) {
        setAppError(error instanceof Error ? error.message : "Could not initialize the app.");
        setProfilesBusy(false);
      }
    }

    void initialize();
  }, []);

  async function loadProfiles() {
    setProfilesBusy(true);
    setAppError(null);

    try {
      await services.driveBootstrap.ensureAppFolders();
      const profileList: ProfileListResult = await services.profiles.listProfiles();
      setProfiles(profileList.profiles);
      setIssues(profileList.issues);

      if (profileList.profiles.length === 1) {
        await selectProfile(profileList.profiles[0]);
      } else {
        setActiveProfileId(undefined);
        setRecordTypeFolders([]);
        setActiveRecordTypeId(undefined);
      }
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not load profiles from Drive.");
    } finally {
      setProfilesBusy(false);
    }
  }

  async function selectProfile(profile: ProfileRecord) {
    setActiveProfileId(profile.profileFolderId);
    setRecordTypeFolders([]);
    setActiveRecordTypeId(undefined);
    setProfileSwitcherOpen(false);
    setAddRecordTypePickerOpen(false);

    try {
      const nextRecordTypeFolders = await services.profiles.listRecordTypeFolders(profile);
      setRecordTypeFolders(nextRecordTypeFolders);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not load record type folders.");
    }
  }

  async function handleSelectRecordType(recordTypeId: string) {
    setActiveRecordTypeId(recordTypeId);
  }

  async function handleCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextName = newProfileName.trim();
    if (!nextName || !newProfileTemplateId) {
      return;
    }

    setCreateProfileBusy(true);
    setAppError(null);

    try {
      const createdProfile = await services.profiles.createProfile({
        name: nextName,
        templateId: newProfileTemplateId,
      });

      setProfiles((currentProfiles) => [...currentProfiles, createdProfile]);
      setNewProfileName("");
      setNewProfileTemplateId("");
      await selectProfile(createdProfile);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not create profile.");
    } finally {
      setCreateProfileBusy(false);
    }
  }

  async function handleSignIn() {
    setAuthBusy(true);
    setAppError(null);

    try {
      const session = await services.auth.signIn();
      setAuthSession(session);
      await loadProfiles();
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);

    try {
      await services.auth.signOut();
      setAuthSession(null);
      setProfiles([]);
      setIssues([]);
      setActiveProfileId(undefined);
      setRecordTypeFolders([]);
      setActiveRecordTypeId(undefined);
      setAppError(null);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setAuthBusy(false);
    }
  }

  if (!authSession) {
    return (
      <div className="app-shell login-shell">
        <section className="login-card">
          <p className="content-kicker">Google Drive Records</p>
          <h1 className="login-title">Login Required</h1>
          <p className="login-copy">Sign in with Google to access your profiles and records.</p>
          {appError ? <p className="error-text">{appError}</p> : null}
          <button className="primary-button" disabled={authBusy} onClick={() => void handleSignIn()} type="button">
            {authBusy ? "Signing in..." : "Sign in with Google"}
          </button>
        </section>
      </div>
    );
  }

  if (profilesBusy) {
    return (
      <div className="app-shell login-shell">
        <section className="login-card blocking-card">
          <p className="content-kicker">Preparing your workspace</p>
          <h1 className="login-title">Loading profiles</h1>
          <p className="login-copy">Checking your Drive app folder and reading available profiles before the dashboard opens.</p>
        </section>
      </div>
    );
  }

  if (!activeProfile) {
    const hasProfiles = profiles.length > 0;

    return (
      <div className="app-shell login-shell">
        <section className="login-card blocking-card onboarding-card">
          <p className="content-kicker">Profile setup</p>
          <h1 className="login-title">{hasProfiles ? "Choose a profile" : "Create your first profile"}</h1>
          <p className="login-copy">
            {hasProfiles
              ? "Select the profile you want to work with before opening the main dashboard."
              : "You are signed in, but there are no profiles in your Drive app folder yet. Create one to start organizing records."}
          </p>

          {appError ? <p className="error-text">{appError}</p> : null}

          {hasProfiles ? (
            <div className="blocking-list">
              {profiles.map((profile) => (
                <button
                  className="blocking-item"
                  key={profile.profileFolderId}
                  onClick={() => void selectProfile(profile)}
                  type="button"
                >
                  <strong>{profile.config.name}</strong>
                  <span>{getTemplateDefinition(profile.config.templateId).label}</span>
                </button>
              ))}
            </div>
          ) : (
            <form className="blocking-form" onSubmit={(event) => void handleCreateProfile(event)}>
              <label className="field-stack">
                <span>Profile name</span>
                <input
                  onChange={(event) => setNewProfileName(event.target.value)}
                  placeholder="For example: Van Health"
                  type="text"
                  value={newProfileName}
                />
              </label>

              <label className="field-stack">
                <span>Template</span>
                <select
                  onChange={(event) => setNewProfileTemplateId(event.target.value as TemplateId | "")}
                  value={newProfileTemplateId}
                >
                  <option value="">Choose a template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="primary-button"
                disabled={createProfileBusy || !newProfileName.trim() || !newProfileTemplateId}
                type="submit"
              >
                {createProfileBusy ? "Creating profile..." : "Add profile"}
              </button>
            </form>
          )}

          {issues.length > 0 ? (
            <div className="blocking-note">
              <strong>Drive warnings</strong>
              <p>Some profile folders need attention before they can be used.</p>
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-layout">
        <AppSidebar
          activeProfileName={activeProfile.config.name}
          activeRecordTypeId={activeRecordTypeId}
          availableRecordTypes={availableRecordTypes}
          canAddRecordType={remainingRecordTypes.length > 0}
          issues={issues}
          onOpenProfileSwitcher={() => {
            setAddRecordTypePickerOpen(false);
            setProfileSwitcherOpen(true);
          }}
          onOpenAddRecordTypePicker={() => setAddRecordTypePickerOpen(true)}
          onSelectRecordType={(recordTypeId) => void handleSelectRecordType(recordTypeId)}
          onSignOut={() => void handleSignOut()}
        />

        <main className="content-shell">
          <section className="content-header-card">
            <div>
              <p className="content-kicker">Drive-backed workspace</p>
              <h2>{activeProfile.config.name}</h2>
              <p>
                {activeRecordType
                  ? `Rendering ${activeRecordType.label.toLowerCase()} from the selected profile folder.`
                  : "Select a record type from the left sidebar."}
              </p>
            </div>
          </section>

          {appError ? (
            <section className="content-card message-card error-card">
              <h3>Action needed</h3>
              <p>{appError}</p>
            </section>
          ) : null}

          {activeTemplate && activeRecordType && activeRecordTypeFolder ? (
            <>
              <activeTemplate.WorkspaceRenderer
                activeRecordType={activeRecordType}
                activeRecordTypeFolder={activeRecordTypeFolder}
                profile={activeProfile}
                previewService={services.preview}
                recordService={services.records}
              />
            </>
          ) : (
            <section className="content-card message-card">
              <h3>Waiting for selection</h3>
              <p>
                Choose a record type from the left sidebar to let the active template read and render that folder.
              </p>
            </section>
          )}
        </main>
      </div>

      {activeProfile && activeTemplate && addRecordTypePickerOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-label="Add new record type" className="popup-card" role="dialog">
            <div className="popup-header">
              <div>
                <p className="content-kicker">Add new record type</p>
                <h2>Select a template</h2>
              </div>
              <button className="icon-button" onClick={() => setAddRecordTypePickerOpen(false)} title="Close" type="button">
                <svg aria-hidden="true" className="sidebar-icon" viewBox="0 0 24 24">
                  <path d="M7.4 6 6 7.4 10.6 12 6 16.6 7.4 18l4.6-4.6 4.6 4.6 1.4-1.4-4.6-4.6L18 7.4 16.6 6 12 10.6z" fill="currentColor" />
                </svg>
              </button>
            </div>

            {remainingRecordTypes.length === 0 ? (
              <div className="empty-picker-state compact-picker-state">
                <strong>No more record types available</strong>
                <p>All record type templates for this profile are already in the sidebar.</p>
              </div>
            ) : (
              <div className="popup-options">
                {remainingRecordTypes.map((recordType) => (
                  <button className="popup-option" key={recordType.id} type="button">
                    <strong>{recordType.label}</strong>
                    <span>{recordType.description}</span>
                  </button>
                ))}
              </div>
            )}

            <p className="popup-note">UI preview only for now. Selecting a template is not wired to Drive yet.</p>
          </section>
        </div>
      ) : null}

      {activeProfile && profileSwitcherOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-label="Switch profile" className="popup-card" role="dialog">
            <div className="popup-header">
              <div>
                <p className="content-kicker">Profiles</p>
                <h2>Switch profile</h2>
              </div>
              <button className="icon-button" onClick={() => setProfileSwitcherOpen(false)} title="Close" type="button">
                <svg aria-hidden="true" className="sidebar-icon" viewBox="0 0 24 24">
                  <path d="M7.4 6 6 7.4 10.6 12 6 16.6 7.4 18l4.6-4.6 4.6 4.6 1.4-1.4-4.6-4.6L18 7.4 16.6 6 12 10.6z" fill="currentColor" />
                </svg>
              </button>
            </div>

            <div className="popup-options">
              {profiles.map((profile) => (
                <button className="popup-option" key={profile.profileFolderId} onClick={() => void selectProfile(profile)} type="button">
                  <strong>{profile.config.name}</strong>
                  <span>{profile.profileFolderId === activeProfile.profileFolderId ? "Current profile" : "Switch to this profile"}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default App;