# Accessibility rules

- Target WCAG 2.2 AA. Verify contrast in the final context; token membership alone does not guarantee a valid pairing.
- Preserve semantic landmarks, heading order, lists, links, buttons, labels, fieldsets, legends, native disclosures, and tab semantics.
- Every interactive element must work by keyboard, retain a visible focus indicator, and have a usable accessible name.
- Keep body text at 16px where practical; reserve 10–13px for short labels, metadata, and qualifiers, never dense body copy.
- Maintain comfortable targets. Do not reproduce the 1px visually hidden radio style without its fully clickable labeled tile.
- Announce estimate and submission status updates through the existing live regions. Avoid overly chatty announcements.
- Respect `prefers-reduced-motion`: disable nonessential transition and animation and use automatic rather than smooth scrolling.
- Supply meaningful alt text for informative images and empty alt text for purely decorative art. Never put essential copy only in an image.
- Keep form errors specific, in text, and associated with the relevant field where possible. Preserve user input after recoverable failures.
- Responsive reflow must not require horizontal page scrolling at 320px. Horizontal scrolling is allowed only for the clearly bounded mobile tab strip.
- Avoid autoplay, flashes, parallax, forced focus movement, hover-only disclosure, and time-limited interactions.
