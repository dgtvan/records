import { describeHealthProfile, groupHealthTimeline, parseHealthFiles } from "./logic";
import { HealthTemplateSummaryCard, HealthTemplateWorkspace } from "./renderers";
import { healthUploadDefinition } from "./upload";
import type { TemplateDefinition } from "../types";

export const healthTemplate: TemplateDefinition = {
  id: "health",
  label: "Health",
  folderName: "records",
  description: "Health record workflow with inline preview and Drive-backed uploads.",
  emptyMessage: "This profile has no health records yet.",
  parseFiles: parseHealthFiles,
  buildGroups: groupHealthTimeline,
  menuLabel: "Health Records",
  intro: "Store dated medical documents in a profile-scoped timeline with inline preview.",
  upload: healthUploadDefinition,
  describeProfile: describeHealthProfile,
  SummaryCard: HealthTemplateSummaryCard,
  WorkspaceRenderer: HealthTemplateWorkspace,
};