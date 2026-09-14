import { AREA_COLORS } from "@lifedesk/contracts";

/**
 * New tags take the next colour in the fixed palette rather than asking.
 *
 * Creating a tag happens mid-thought, while editing a task — a colour picker
 * there is a decision nobody wants at that moment. The colour is editable on
 * the tag's own page, where choosing one is the point.
 */
export function nextTagColor(existingCount: number) {
  return AREA_COLORS[existingCount % AREA_COLORS.length]!;
}

export const TAG_NAME_MAX_LENGTH = 40;
