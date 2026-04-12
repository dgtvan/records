import type { DriveFile, ParsedRecord, ProfileRecord, TimelineGroup } from "../../types";
import { HEALTH_TEMPLATE_FACTS } from "./models";

export function describeHealthProfile(profile: ProfileRecord): string {
  return `${profile.config.name} uses the Health template and stores records in a dated timeline.`;
}

export function groupHealthTimeline(items: ParsedRecord[]): TimelineGroup[] {
  const datedGroups = new Map<string, ParsedRecord[]>();
  const warnings: ParsedRecord[] = [];

  for (const item of items) {
    if (!item.valid || !item.date) {
      warnings.push(item);
      continue;
    }

    const existing = datedGroups.get(item.date) ?? [];
    existing.push(item);
    datedGroups.set(item.date, existing);
  }

  const sortedDates = Array.from(datedGroups.keys()).sort((left, right) =>
    left < right ? 1 : left > right ? -1 : 0,
  );

  const groups = sortedDates.map((date) => ({
    key: date,
    label: date,
    items: datedGroups.get(date) ?? [],
    warning: false,
  }));

  if (warnings.length > 0) {
    groups.push({
      key: "unsorted",
      label: "Unsorted / Warning",
      items: warnings,
      warning: true,
    });
  }

  return groups;
}

export function parseHealthFiles(files: DriveFile[]): ParsedRecord[] {
  return files.map((file) => {
    const match = file.name.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);

    if (!match) {
      return {
        file,
        valid: false,
        warning: "Filename is missing the required YYYY-MM-DD_ prefix.",
      };
    }

    return {
      file,
      valid: true,
      date: match[1],
    };
  });
}

export function getHealthTemplateFacts(): string[] {
  return [
    HEALTH_TEMPLATE_FACTS.careFocus,
    `Accepted MVP formats: ${HEALTH_TEMPLATE_FACTS.acceptedFormats.join(", ")}.`,
    HEALTH_TEMPLATE_FACTS.timelineMode,
  ];
}