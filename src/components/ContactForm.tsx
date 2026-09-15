import { useEffect, useRef, useState, type SubmitEvent } from "react";
import type { ContactFormContent } from "../lib/contact";
export default function ContactForm({
  copy,
  preview = false,
}: {
  copy: ContactFormContent;
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
      name: String(fields.get("name") || "").trim(),
      email: String(fields.get("email") || "").trim(),
      message: String(fields.get("message") || "").trim(),
      website: String(fields.get("website") || ""),
    };
    const serialized = JSON.stringify(payload);
    if (submission.current?.payload !== serialized)
      submission.current = { payload: serialized, key: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/contact/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          idempotencyKey: submission.current.key,
        }),
      });
      if (!response.ok || (await response.json()).saved !== true)
        throw Error("Could not save message");
      setSent(true);
      window.posthog?.capture("contact_form_submitted", { form: "contact" });
    } catch {
      setError(copy.save_error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="contact-form-panel"
      aria-labelledby="contact-form-heading"
    >
      <h2 id="contact-form-heading">{copy.title}</h2>
      <p>{copy.description}</p>
      {sent ? (
        <p role="status" className="contact-success">
          {copy.success}
        </p>
      ) : (
        <form onSubmit={submit} className="contact-form ph-no-capture">
          <div className="form-honeypot" aria-hidden="true">
            <label>
              {copy.honeypot_label}
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label htmlFor="contact-name">
            {copy.name_label}
            <input
              id="contact-name"
              name="name"
              autoComplete="name"
              maxLength={120}
              placeholder={copy.name_placeholder}
              required
            />
          </label>
          <label htmlFor="contact-email">
            {copy.email_label}
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={180}
              placeholder={copy.email_placeholder}
              required
            />
          </label>
          <label htmlFor="contact-message">
            {copy.message_label}
            <textarea
              id="contact-message"
              name="message"
              rows={6}
              maxLength={5000}
              placeholder={copy.message_placeholder}
              required
            />
          </label>
          <p className="contact-privacy">
            {copy.privacy_notice}{" "}
            <a href="/privacy-policy/">{copy.privacy_link_label}</a>
          </p>
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
