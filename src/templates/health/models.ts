export interface HealthTemplateFacts {
  careFocus: string;
  acceptedFormats: string[];
  timelineMode: string;
}

export const HEALTH_RECORD_TYPE_ID = "records";

export const HEALTH_TEMPLATE_FACTS: HealthTemplateFacts = {
  careFocus: "Medical certificates, lab results, prescriptions, and related scans.",
  acceptedFormats: ["PDF", "PNG", "JPG", "JPEG"],
  timelineMode: "Grouped by filename date prefix with warnings for malformed files.",
};