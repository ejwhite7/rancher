import { z } from "zod";

export const ATTRIBUTION_KEYS = [
  "source",
  "medium",
  "campaign",
  "term",
  "content",
  "id",
  "source_platform",
  "marketing_tactic",
  "creative_format",
  "adextension",
  "adgroup",
  "adgroupid",
  "adplacement",
  "adposition",
  "campaignid",
  "geo",
  "keymatch",
  "device",
  "matchtype",
  "network",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type AttributionTouch = Partial<Record<AttributionKey, string>>;
export type Attribution = { first: AttributionTouch; last: AttributionTouch };

const touchShape = Object.fromEntries(
  ATTRIBUTION_KEYS.map((key) => [key, z.string().trim().max(500).optional()]),
) as Record<AttributionKey, z.ZodOptional<z.ZodString>>;

export const attributionSchema = z
  .object({
    first: z.object(touchShape).strict(),
    last: z.object(touchShape).strict(),
  })
  .strict();

export const EMPTY_ATTRIBUTION: Attribution = { first: {}, last: {} };

export const attributionFieldName = (
  touch: "first" | "last",
  key: AttributionKey,
) => `attribution_${touch}_${key}`;

export function attributionFromForm(form: HTMLFormElement): Attribution {
  window.__attribution?.fillFormFields({ scope: form });
  const fields = new FormData(form);
  const readTouch = (touch: "first" | "last") =>
    Object.fromEntries(
      ATTRIBUTION_KEYS.flatMap((key) => {
        const value = String(
          fields.get(attributionFieldName(touch, key)) ?? "",
        ).trim();
        return value && value !== "(not set)" ? [[key, value]] : [];
      }),
    ) as AttributionTouch;
  return { first: readTouch("first"), last: readTouch("last") };
}

export function attributionPersonProperties(
  prefix: "attribution_first" | "attribution_last" | "partnership_first" | "partnership_last",
  touch: AttributionTouch,
) {
  return Object.fromEntries(
    ATTRIBUTION_KEYS.flatMap((key) =>
      touch[key] ? [[`${prefix}_${key}`, touch[key]]] : [],
    ),
  );
}
