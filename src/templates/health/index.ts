import { describeHealthProfile, groupHealthTimeline, parseHealthFiles } from "./logic";
import { HEALTH_RECORD_TYPE_ID } from "./models";
import { HealthRecordTypeView, HealthTemplateSummaryCard, HealthTemplateWorkspace } from "./renderers";
import { healthUploadDefinition } from "./upload";
import type { TemplateDefinition } from "../types";

const healthRecordType = {
  id: HEALTH_RECORD_TYPE_ID,
  label: "Records",
  folderName: "records",
  description: "Health record workflow with inline preview and Drive-backed uploads.",
  emptyMessage: "This profile has no health records yet.",
  parseFiles: parseHealthFiles,
  buildGroups: groupHealthTimeline,
  upload: healthUploadDefinition,
  RecordTypeView: HealthRecordTypeView,
};

export const healthTemplate: TemplateDefinition = {
  id: "health",
  label: "Health",
  menuLabel: "Health Records",
  intro: "Store dated medical documents in a profile-scoped timeline with inline preview.",
  recordTypes: [healthRecordType],
  describeProfile: describeHealthProfile,
  SummaryCard: HealthTemplateSummaryCard,
  WorkspaceRenderer: HealthTemplateWorkspace,
};