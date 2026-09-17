import {
  ATTRIBUTION_KEYS,
  attributionFieldName,
} from "../lib/attribution";

export default function AttributionFields() {
  return (
    <div className="form-honeypot" aria-hidden="true">
      {(["first", "last"] as const).flatMap((touch) =>
        ATTRIBUTION_KEYS.map((key) => (
          <input
            key={`${touch}-${key}`}
            type="hidden"
            name={attributionFieldName(touch, key)}
            data-attribution-field={`${touch}.${key}`}
            tabIndex={-1}
          />
        )),
      )}
    </div>
  );
}
