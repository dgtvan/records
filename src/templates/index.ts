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

export function getTemplateRecordType(templateId: TemplateId, recordTypeId: string) {
  return getTemplateDefinition(templateId).recordTypes.find((recordType) => recordType.id === recordTypeId) ?? null;
}

export type {
  TemplateDefinition,
  TemplateHeaderRendererProps,
  TemplateRecordTypeDefinition,
  TemplateRecordTypeRendererProps,
  TemplateSummaryCardProps,
  TemplateWorkspaceRendererProps,
} from "./types";