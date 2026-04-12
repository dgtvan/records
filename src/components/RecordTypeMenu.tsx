import type { TemplateRecordTypeDefinition } from "../templates";

interface RecordTypeMenuProps {
  recordTypes: TemplateRecordTypeDefinition[];
  activeRecordTypeId?: string;
  onSelectRecordType(recordTypeId: string): void;
}

export function RecordTypeMenu({ recordTypes, activeRecordTypeId, onSelectRecordType }: RecordTypeMenuProps) {
  return (
    <div className="record-type-menu" role="tablist" aria-label="Record types">
      {recordTypes.map((recordType) => (
        <button
          className={recordType.id === activeRecordTypeId ? "record-type-button active" : "record-type-button"}
          key={recordType.id}
          onClick={() => onSelectRecordType(recordType.id)}
          type="button"
        >
          <strong>{recordType.label}</strong>
          <span>{recordType.description}</span>
        </button>
      ))}
    </div>
  );
}