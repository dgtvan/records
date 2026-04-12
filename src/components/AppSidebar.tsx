import { getTemplateDefinition, type TemplateRecordTypeDefinition } from "../templates";
import type { ProfileIssue, ProfileRecord } from "../types";

interface AppSidebarProps {
  profilesBusy: boolean;
  profiles: ProfileRecord[];
  issues: ProfileIssue[];
  activeProfileId?: string;
  availableRecordTypes: TemplateRecordTypeDefinition[];
  activeRecordTypeId?: string;
  onSignOut(): void;
  onSelectProfile(profile: ProfileRecord): void;
  onSelectRecordType(recordTypeId: string): void;
}

export function AppSidebar({
  profilesBusy,
  profiles,
  issues,
  activeProfileId,
  availableRecordTypes,
  activeRecordTypeId,
  onSignOut,
  onSelectProfile,
  onSelectRecordType,
}: AppSidebarProps) {
  const activeProfile = profiles.find((profile) => profile.profileFolderId === activeProfileId);
  const activeTemplate = activeProfile ? getTemplateDefinition(activeProfile.config.templateId) : null;

  return (
    <aside className="sidebar-shell">
      <div className="sidebar-card app-sidebar">
        <div className="sidebar-top">
          <div>
            <p className="sidebar-eyebrow">Google Drive Records</p>
            <h1 className="sidebar-title">Records Timeline</h1>
          </div>
        </div>

        <section className="sidebar-section">
          <div>
            <h2 className="sidebar-section-title">Profile</h2>
            <p className="sidebar-note">{activeProfile ? `${activeProfile.config.name} · ${activeTemplate?.label ?? "Unknown template"}` : "Profile selection"}</p>
          </div>
          <div className="sidebar-list">
            {profilesBusy ? <p className="sidebar-empty">Loading profiles...</p> : null}
            {!profilesBusy && profiles.length === 0 ? <p className="sidebar-empty">No profiles found in Drive.</p> : null}
            {!profilesBusy
              ? profiles.map((profile) => (
                  <button
                    className={profile.profileFolderId === activeProfileId ? "sidebar-item active" : "sidebar-item"}
                    key={profile.profileFolderId}
                    onClick={() => onSelectProfile(profile)}
                    type="button"
                  >
                    <strong>{profile.config.name}</strong>
                    <span>{getTemplateDefinition(profile.config.templateId).label}</span>
                  </button>
                ))
              : null}
          </div>
        </section>

        <section className="sidebar-section">
          <div>
            <h2 className="sidebar-section-title">Record Types</h2>
            <p className="sidebar-note">Select a folder-backed record type. Nothing is auto-opened.</p>
          </div>
          <div className="sidebar-list">
            {!activeProfile ? <p className="sidebar-empty">Choose a profile first.</p> : null}
            {activeProfile && availableRecordTypes.length === 0 ? (
              <p className="sidebar-empty">No recognized record type folders in this profile.</p>
            ) : null}
            {activeProfile
              ? availableRecordTypes.map((recordType) => (
                  <button
                    className={recordType.id === activeRecordTypeId ? "sidebar-item active" : "sidebar-item"}
                    key={recordType.id}
                    onClick={() => onSelectRecordType(recordType.id)}
                    type="button"
                  >
                    <strong>{recordType.label}</strong>
                    <span>{recordType.description}</span>
                  </button>
                ))
              : null}
          </div>
        </section>

        {issues.length > 0 ? (
          <section className="sidebar-section warning-section">
            <h2 className="sidebar-section-title">Warnings</h2>
            <ul className="warning-list">
              {issues.map((issue) => (
                <li key={issue.profileFolderId}>
                  <strong>{issue.profileFolderName}</strong>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="sidebar-footer-actions">
          <button className="icon-button" title="Settings coming soon" type="button">
            <svg aria-hidden="true" className="sidebar-icon" viewBox="0 0 24 24">
              <path
                d="M10.3 2.5h3.4l.5 2.3c.6.2 1.1.5 1.6.9l2.2-.8 1.7 2.9-1.7 1.6c.1.3.1.7.1 1.1s0 .7-.1 1.1l1.7 1.6-1.7 2.9-2.2-.8c-.5.4-1 .7-1.6.9l-.5 2.3h-3.4l-.5-2.3c-.6-.2-1.1-.5-1.6-.9l-2.2.8-1.7-2.9 1.7-1.6a7 7 0 0 1 0-2.2L3.8 7.8 5.5 5l2.2.8c.5-.4 1-.7 1.6-.9zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button className="icon-button" onClick={onSignOut} title="Sign out" type="button">
            <svg aria-hidden="true" className="sidebar-icon" viewBox="0 0 24 24">
              <path
                d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v-2H6V6h4zm5.6 3.4L14.2 8.8l2.2 2.2H9v2h7.4l-2.2 2.2 1.4 1.4 4.6-4.6z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}