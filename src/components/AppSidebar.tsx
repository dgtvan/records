import type { TemplateDefinition } from "../templates";
import type { ProfileIssue } from "../types";

interface RecordCollectionListItem {
  id: string;
  name: string;
  template: TemplateDefinition;
}

interface AppSidebarProps {
  issues: ProfileIssue[];
  activeProfileName: string;
  availableRecordCollections: RecordCollectionListItem[];
  activeRecordCollectionId?: string;
  canAddRecordCollection: boolean;
  onOpenProfileSwitcher(): void;
  onOpenAddRecordCollectionPopup(): void;
  onSignOut(): void;
  onSelectRecordCollection(collectionId: string): void;
}

export function AppSidebar({
  issues,
  activeProfileName,
  availableRecordCollections,
  activeRecordCollectionId,
  canAddRecordCollection,
  onOpenProfileSwitcher,
  onOpenAddRecordCollectionPopup,
  onSignOut,
  onSelectRecordCollection,
}: AppSidebarProps) {
  const profileInitials = activeProfileName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "P";

  return (
    <aside className="sidebar-shell">
      <div className="sidebar-card app-sidebar">
        {/* <div className="sidebar-top">
          <div>
            <p className="sidebar-eyebrow">Google Drive Records</p>
            <h1 className="sidebar-title">Records Timeline</h1>
          </div>
        </div> */}

        <section className="profile-hero" aria-label="Current profile">
          <div className="profile-avatar">{profileInitials}</div>
          <p className="profile-name">{activeProfileName}</p>
        </section>

        <section className="sidebar-section">
          <div className="sidebar-section-head">
            <h2 className="sidebar-section-title">Record Collections</h2>
            <button
              className="icon-button compact-icon-button"
              disabled={!canAddRecordCollection}
              onClick={onOpenAddRecordCollectionPopup}
              title="Add record collection"
              type="button"
            >
              <svg aria-hidden="true" className="sidebar-icon" viewBox="0 0 24 24">
                <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <div className="sidebar-list">
            {availableRecordCollections.length === 0 ? <p className="sidebar-empty">No record collections in this profile yet.</p> : null}
            {availableRecordCollections.map((collection) => (
              <button
                className={collection.id === activeRecordCollectionId ? "sidebar-item active" : "sidebar-item"}
                key={collection.id}
                onClick={() => onSelectRecordCollection(collection.id)}
                type="button"
              >
                <strong>{collection.name}</strong>
                <span>{collection.template.label}</span>
              </button>
            ))}
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
          <button className="icon-button" onClick={onOpenProfileSwitcher} title="Switch profile" type="button">
            <svg aria-hidden="true" className="sidebar-icon" viewBox="0 0 24 24">
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.2 0-7 2.1-7 5v1h9.5a6.8 6.8 0 0 1-.5-2.5c0-1 .2-1.8.5-2.5zM19 14v2h-2v2h2v2h2v-2h2v-2h-2v-2z" fill="currentColor" />
            </svg>
          </button>
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