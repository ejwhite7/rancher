# Component inventory and states

Canonical implementation: `src/components/**`, `src/layouts/**`, and `src/styles/global.css`.

## Global shell

- **Skip link:** hidden until keyboard focus; moves directly to `#main-content`.
- **Navigation:** sticky translucent paper header, lockup, anchor links, and primary CTA. At 760px and below, use a labeled menu button and stacked disclosure. Update `aria-expanded`; close after link activation.
- **Footer:** lockup, short explanation, legal navigation, and copyright. Stack groups on mobile.

## Marketing sections

- **Hero:** eyebrow, editorial two-line heading with italic sage emphasis, explanatory paragraph, primary and secondary actions, small qualifier, branded landscape, and trust notes. Desktop is asymmetric; mobile stacks copy before art and stacks actions.
- **Intro:** two-column category explanation; stack below 760px.
- **Data tabs:** four vertical tabs and one panel. Selected state uses active sage. Support Arrow Left/Right, Home, and End; manage focus, `aria-selected`, and panel ownership. On mobile, tabs become a horizontally scrollable row.
- **Calculator:** live estimate, two range controls, four location choices, disclaimer, and CTA. Never describe output as a quote or guaranteed earnings. Keep `aria-live` on estimate and visible labels on controls. It is centered at 60%/632px max and becomes full width by 1000px.
- **Use-case cards:** platform strip, title, explanation, expandable detail, and one custom-data CTA card. Three columns desktop, two at 1000px, one at 760px.
- **Process:** dark-green four-step progression with lime accents and rights summary. Two columns on mobile.
- **Protection demo:** explanatory content, checklist, before/after transformation demo, and three principles. Preserve explicit caveats that de-identification reduces but does not eliminate risk.
- **FAQ:** editorial introduction and native disclosure rows. Maintain keyboard-operable native `details`/`summary` and plus/minus visual state.
- **Contact:** explanatory copy and partnership form in a bordered surface. Two columns desktop and one below 760px.
- **Legal layout:** compact navigation, readable 900px body measure, linked policy navigation, and footer.

## Partnership form

Required: name, work email, job title, company, company size, history, at least one record type, and outreach consent. “Anything else to know?” is the only optional visible field. Maintain busy, disabled, success, server-validation, connection-error, and no-JavaScript states. Never expose the honeypot. Preserve entries on failure and do not redirect before persistence succeeds.

## Shared interaction states

- Default, hover, focus-visible, selected/checked/open, disabled/busy, success/status, and error must all be designed.
- Primary hover darkens to `#285648` and lifts 2px. Reduced-motion removes transitions and smooth scrolling.
- Focus must remain visible; use 2px `#658a2e` with 5px default outline offset, or an equally visible local treatment.
- Do not communicate state by color alone. Pair selection with checkmarks, text, shape, or native control state.
