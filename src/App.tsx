import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppSidebar } from "./components/AppSidebar";
import { googleDriveServices } from "./services/googleDriveServices";
import { getTemplateDefinition, listTemplateDefinitions } from "./templates";
import type {
  CreateRecordCollectionRequest,
  ProfileListResult,
  ProfileIssue,
  ProfileRecord,
  ProfileRecordCollection,
  TemplateId,
} from "./types";

function App() {
  const services = googleDriveServices;
  const templates = listTemplateDefinitions();
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [issues, setIssues] = useState<ProfileIssue[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>();
  const [recordCollections, setRecordCollections] = useState<ProfileRecordCollection[]>([]);
  const [activeRecordCollectionId, setActiveRecordCollectionId] = useState<string>();
  const [authSession, setAuthSession] = useState<Awaited<ReturnType<typeof services.auth.getSession>>>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [profilesBusy, setProfilesBusy] = useState(true);
  const [createProfileBusy, setCreateProfileBusy] = useState(false);
  const [createRecordCollectionBusy, setCreateRecordCollectionBusy] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [profileSwitcherOpen, setProfileSwitcherOpen] = useState(false);
  const [addRecordCollectionPopupOpen, setAddRecordCollectionPopupOpen] = useState(false);
  const [newRecordCollectionName, setNewRecordCollectionName] = useState("");
  const [newRecordCollectionTypeValue, setNewRecordCollectionTypeValue] = useState("");
  const [appError, setAppError] = useState<string | null>(null);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.profileFolderId === activeProfileId),
    [activeProfileId, profiles],
  );

  const availableCollectionTemplates = useMemo(
    () => templates.map((template) => ({
      templateId: template.id,
      templateLabel: template.label,
      template,
      value: template.id,
    })),
    [templates],
  );
  const availableRecordCollections = useMemo(() => {
    if (!activeProfile) {
      return [];
    }

    return recordCollections
      .map((collection) => {
        const template = getTemplateDefinition(collection.templateId);

        return {
          id: collection.folderId,
          name: collection.name,
          template,
        };
      })
      .filter((collection) => collection !== null);
  }, [activeProfile, recordCollections]);

  const activeRecordCollection = useMemo(
    () => recordCollections.find((collection) => collection.folderId === activeRecordCollectionId),
    [activeRecordCollectionId, recordCollections],
  );

  const activeTemplate = activeRecordCollection ? getTemplateDefinition(activeRecordCollection.templateId) : null;

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
        setRecordCollections([]);
        setActiveRecordCollectionId(undefined);
      }
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not load profiles from Drive.");
    } finally {
      setProfilesBusy(false);
    }
  }

  async function selectProfile(profile: ProfileRecord) {
    setActiveProfileId(profile.profileFolderId);
    setRecordCollections([]);
    setActiveRecordCollectionId(undefined);
    setProfileSwitcherOpen(false);
    setAddRecordCollectionPopupOpen(false);

    try {
      const nextRecordCollections = await services.profiles.listRecordCollections(profile);
      setRecordCollections(nextRecordCollections);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not load record collections.");
    }
  }

  async function handleSelectRecordCollection(collectionId: string) {
    setActiveRecordCollectionId(collectionId);
  }

  async function handleCreateRecordCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeProfile) {
      return;
    }

    const nextName = newRecordCollectionName.trim();
    if (!nextName || !newRecordCollectionTypeValue) {
      return;
    }

    const templateId = newRecordCollectionTypeValue as TemplateId;

    setCreateRecordCollectionBusy(true);
    setAppError(null);

    try {
      const createdCollection = await services.profiles.addRecordCollection(activeProfile, {
        name: nextName,
        templateId,
      } satisfies CreateRecordCollectionRequest);

      setRecordCollections((currentCollections) => [...currentCollections, createdCollection]);
      setActiveRecordCollectionId(createdCollection.folderId);
      setNewRecordCollectionName("");
      setNewRecordCollectionTypeValue("");
      setAddRecordCollectionPopupOpen(false);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not create record collection.");
    } finally {
      setCreateRecordCollectionBusy(false);
    }
  }

  async function handleCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextName = newProfileName.trim();
    if (!nextName) {
      return;
    }

    setCreateProfileBusy(true);
    setAppError(null);

    try {
      const createdProfile = await services.profiles.createProfile({
        name: nextName,
      });

      setProfiles((currentProfiles) => [...currentProfiles, createdProfile]);
      setNewProfileName("");
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
      setRecordCollections([]);
      setActiveRecordCollectionId(undefined);
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
                  <span>Open profile</span>
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

              <button
                className="primary-button"
                disabled={createProfileBusy || !newProfileName.trim()}
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
          activeRecordCollectionId={activeRecordCollectionId}
          availableRecordCollections={availableRecordCollections}
          canAddRecordCollection={availableCollectionTemplates.length > 0}
          issues={issues}
          onOpenProfileSwitcher={() => {
            setAddRecordCollectionPopupOpen(false);
            setProfileSwitcherOpen(true);
          }}
          onOpenAddRecordCollectionPopup={() => {
            setProfileSwitcherOpen(false);
            setAddRecordCollectionPopupOpen(true);
          }}
          onSelectRecordCollection={(collectionId) => void handleSelectRecordCollection(collectionId)}
          onSignOut={() => void handleSignOut()}
        />

        <main className="content-shell">
          <section className="content-header-card">
            <div>
              <p className="content-kicker">Drive-backed workspace</p>
              <h2>{activeProfile.config.name}</h2>
              <p>
                {activeTemplate
                  ? `Rendering ${activeRecordCollection?.name ?? activeTemplate.label} from the selected record collection.`
                  : "Select a record collection from the left sidebar."}
              </p>
            </div>
          </section>

          {appError ? (
            <section className="content-card message-card error-card">
              <h3>Action needed</h3>
              <p>{appError}</p>
            </section>
          ) : null}

          {activeTemplate && activeRecordCollection ? (
            <>
              <activeTemplate.WorkspaceRenderer
                activeRecordCollection={activeRecordCollection}
                activeTemplate={activeTemplate}
                profile={activeProfile}
                previewService={services.preview}
                recordService={services.records}
              />
            </>
          ) : (
            <section className="content-card message-card">
              <h3>Waiting for selection</h3>
              <p>
                Choose a record collection from the left sidebar to let the active template read and render that folder.
              </p>
            </section>
          )}
        </main>
      </div>

      {activeProfile && addRecordCollectionPopupOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-label="Create record collection" className="popup-card" role="dialog">
            <div className="popup-header">
              <div>
                <p className="content-kicker">Record Collections</p>
                <h2>Create record collection</h2>
              </div>
              <button className="icon-button" onClick={() => setAddRecordCollectionPopupOpen(false)} title="Close" type="button">
                <svg aria-hidden="true" className="sidebar-icon" viewBox="0 0 24 24">
                  <path d="M7.4 6 6 7.4 10.6 12 6 16.6 7.4 18l4.6-4.6 4.6 4.6 1.4-1.4-4.6-4.6L18 7.4 16.6 6 12 10.6z" fill="currentColor" />
                </svg>
              </button>
            </div>

            {availableCollectionTemplates.length === 0 ? (
              <div className="empty-picker-state compact-picker-state">
                <strong>No collection templates available</strong>
                <p>No record collection templates are registered in this app yet.</p>
              </div>
            ) : (
              <form className="popup-form" onSubmit={(event) => void handleCreateRecordCollection(event)}>
                <label className="field-stack">
                  <span>Collection name</span>
                  <input
                    onChange={(event) => setNewRecordCollectionName(event.target.value)}
                    placeholder="For example: Vaccinations"
                    type="text"
                    value={newRecordCollectionName}
                  />
                </label>

                <label className="field-stack">
                  <span>Collection template</span>
                  <select
                    onChange={(event) => setNewRecordCollectionTypeValue(event.target.value)}
                    value={newRecordCollectionTypeValue}
                  >
                    <option value="">Choose a template</option>
                    {availableCollectionTemplates.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.templateLabel}
                      </option>
                    ))}
                  </select>
                </label>

                {newRecordCollectionTypeValue ? (
                  <div className="popup-preview-box">
                    <strong>{availableCollectionTemplates.find((option) => option.value === newRecordCollectionTypeValue)?.template.label}</strong>
                    <p>{availableCollectionTemplates.find((option) => option.value === newRecordCollectionTypeValue)?.template.description}</p>
                  </div>
                ) : null}

                <button
                  className="primary-button"
                  disabled={createRecordCollectionBusy || !newRecordCollectionName.trim() || !newRecordCollectionTypeValue}
                  type="submit"
                >
                  {createRecordCollectionBusy ? "Creating..." : "Create collection"}
                </button>
              </form>
            )}
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