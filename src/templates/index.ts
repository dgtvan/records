import type { TemplateId } from "../types";
import { healthTemplate } from "./health";
import type { TemplateDefinition } from "./types";

const TEMPLATE_MAP: Record<TemplateId, TemplateDefinition> = {
  health: healthTemplate,
};

export function getTemplateDefinition(templateId: TemplateId): TemplateDefinition {
  return TEMPLATE_MAP[templateId];
}

export function listTemplateDefinitions(): TemplateDefinition[] {
  return Object.values(TEMPLATE_MAP);
}

export type {
  TemplateDefinition,
  TemplateHeaderRendererProps,
  TemplateRendererProps,
  TemplateSummaryCardProps,
  TemplateUploadDefinition,
  TemplateWorkspaceRendererProps,
} from "./types";