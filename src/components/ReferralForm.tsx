import { useEffect, useRef, useState, type SubmitEvent } from "react";
import type { ReferralFormContent } from "../lib/referral";
export default function ReferralForm({
  copy,
  preview = false,
}: {
  copy: ReferralFormContent;
  preview?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const submission = useRef<{ payload: string; key: string } | null>(null);
  useEffect(() => setReady(true), []);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || pending.current || sent) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const payload = {
      referrer_first_name: String(
        fields.get("referrer_first_name") || "",
      ).trim(),
      referrer_last_name: String(fields.get("referrer_last_name") || "").trim(),
      referrer_email: String(fields.get("referrer_email") || "").trim(),
      referral_first_name: String(
        fields.get("referral_first_name") || "",
      ).trim(),
      referral_last_name: String(fields.get("referral_last_name") || "").trim(),
      referral_email: String(fields.get("referral_email") || "").trim(),
      company_size: String(fields.get("company_size") || "").trim(),
      industry: String(fields.get("industry") || "").trim(),
      website: String(fields.get("website") || ""),
    };
    const serialized = JSON.stringify(payload);
    if (submission.current?.payload !== serialized)
      submission.current = { payload: serialized, key: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/referral/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          idempotencyKey: submission.current.key,
        }),
      });
      if (!response.ok || (await response.json()).saved !== true)
        throw Error("Could not save referral");
      setSent(true);
      const email = payload.referrer_email.toLowerCase();
      // Analytics must never turn a saved referral into a failed submission.
      try {
        window.posthog?.identify(email, {
          email,
          name: `${payload.referrer_first_name} ${payload.referrer_last_name}`,
          domain: email.split("@")[1],
        });
      } catch {
        /* Keep the confirmation visible if analytics is unavailable. */
      }
      try {
        window.posthog?.capture("referral_form_submitted", {
          form: "referral",
          submission_id: submission.current.key,
          company_size: payload.company_size,
          industry: payload.industry,
        });
      } catch {
        /* Delivery was already confirmed by the server. */
      }
    } catch {
      setError(copy.save_error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="referral-form-panel"
      aria-labelledby="referral-form-heading"
    >
      <h1 id="referral-form-heading">{copy.title}</h1>
      <p>{copy.description}</p>
      {sent ? (
        <p role="status" className="referral-success">
          {copy.success}
        </p>
      ) : (
        <form onSubmit={submit} className="referral-form ph-no-capture">
          <div className="form-honeypot" aria-hidden="true">
            <label>
              {copy.honeypot_label}
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="referral-name-row">
            <label htmlFor="referrer_first_name">
              {copy.referrer_first_name_label}
              <input
                id="referrer_first_name"
                name="referrer_first_name"
                autoComplete="section-referrer given-name"
                maxLength={120}
                required
              />
            </label>
            <label htmlFor="referrer_last_name">
              {copy.referrer_last_name_label}
              <input
                id="referrer_last_name"
                name="referrer_last_name"
                autoComplete="section-referrer family-name"
                maxLength={120}
                required
              />
            </label>
          </div>
          <label htmlFor="referrer_email">
            {copy.referrer_email_label}
            <input
              id="referrer_email"
              name="referrer_email"
              type="email"
              autoComplete="section-referrer email"
              maxLength={180}
              required
            />
          </label>
          <div className="referral-name-row">
            <label htmlFor="referral_first_name">
              {copy.referral_first_name_label}
              <input
                id="referral_first_name"
                name="referral_first_name"
                autoComplete="off"
                maxLength={120}
                required
              />
            </label>
            <label htmlFor="referral_last_name">
              {copy.referral_last_name_label}
              <input
                id="referral_last_name"
                name="referral_last_name"
                autoComplete="off"
                maxLength={120}
                required
              />
            </label>
          </div>
          <label htmlFor="referral_email">
            {copy.referral_email_label}
            <input
              id="referral_email"
              name="referral_email"
              type="email"
              autoComplete="off"
              maxLength={180}
              required
            />
          </label>
          <div className="referral-select-field">
            <label htmlFor="company_size">
              {copy.referral_company_size_label}
            </label>
            <select
              id="company_size"
              name="company_size"
              defaultValue=""
              required
            >
              <option value="" disabled></option>
              {copy.company_size_options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="referral-select-field">
            <label htmlFor="industry">{copy.referral_industry_label}</label>
            <select id="industry" name="industry" defaultValue="" required>
              <option value="" disabled></option>
              {copy.industry_options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <p role="alert">{error}</p>
          {preview && <p>Form submissions are disabled in preview.</p>}
          <button
            type="submit"
            className="btn"
            disabled={!ready || busy || preview}
          >
            {busy ? copy.submitting_label : copy.submit_label}
          </button>
          <noscript>
            <p>{copy.no_javascript}</p>
          </noscript>
        </form>
      )}
    </section>
  );
}
