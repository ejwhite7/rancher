# Requesting a complete social ad asset set

Use this specification whenever Rancher commissions or generates a paid-social creative concept. A complete set contains the same approved concept in all four exports below; resizing one finished layout is not sufficient.

## Required exports and safe zones

The safe zones are conservative Rancher production rules, not promises that every platform UI will be identical. Keep the logo, headline, legal qualifiers, URL, and any drawn CTA inside the stated rectangle. Background color, photography, and nonessential illustration may bleed to the canvas edge.

Coordinates are measured from the top-left corner.

| Export | Typical use | Required safe rectangle | Edge clearance |
| --- | --- | --- | --- |
| `1200 × 630` | LinkedIn, Meta landscape, Google horizontal | `x 120–1080`, `y 63–567` (960 × 504) | 10% on every edge |
| `1080 × 1080` | Meta/LinkedIn square feed | `x 108–972`, `y 108–972` (864 × 864) | 10% on every edge |
| `1080 × 1350` | Instagram/Meta 4:5 feed | `x 108–972`, `y 135–1148` (864 × 1013) | 10% left/top/right; 15% bottom |
| `1080 × 1920` | Instagram/Facebook Stories and Reels; TikTok | `x 108–864`, `y 288–1440` (756 × 1152) | 10% left, 20% right, 15% top, 25% bottom |

The larger right and bottom exclusions on 9:16 protect key content from reaction controls, account/caption UI, platform CTAs, and device chrome. TikTok explicitly notes that its safe zone changes with caption length and interactive add-ons, so every upload still needs a placement preview.

`1200 × 630` is the Rancher interchange export requested for this workflow. Google’s exact recommended horizontal size is `1200 × 628`; LinkedIn commonly specifies `1200 × 627`, both at approximately 1.91:1. If a destination rejects or crops the interchange file, make an additional platform-native export from the same master rather than stretching it.

## Copy-pastable request

> Create one Rancher paid-social concept as a complete, separately composed four-format asset set: 1200×630 landscape, 1080×1080 square, 1080×1350 portrait, and 1080×1920 vertical. Preserve the same campaign idea, approved copy, visual hierarchy, and brand identity across all formats, but recompose each canvas rather than mechanically cropping it. Keep every logo, headline, qualifier, URL, and drawn CTA inside the Rancher safe rectangle for that format. Backgrounds and nonessential illustration may bleed. Use the supplied Rancher logo artwork without alteration, primary ink `#193E34`, warm paper `#F7F6EE`, lime `#D8EE8A`, Georgia for editorial display copy, and Arial/Helvetica for utility copy. Keep claims restrained and evidence-based. Do not promise guaranteed revenue, call data anonymous or risk-free, or imply that all datasets qualify. Return editable masters plus web-ready PNG exports, named `[campaign]-[concept]-1200x630.png`, `...-1080x1080.png`, `...-1080x1350.png`, and `...-1080x1920.png`.

Also provide with each set:

- one clean version without baked-in CTA text when the platform supplies the CTA;
- one text-safe version with headline/logo/qualifier guides visible in the editable master but hidden in the export;
- alt text and the exact copy used;
- source/license details for any third-party image;
- a preview screenshot for every intended placement;
- confirmation that text is legible at actual mobile display size and that no key element crosses a safe-zone boundary.

## Creative and compliance rules

- Prefer one message, one visual idea, and one action per asset.
- Use sentence case. Avoid exclamation points, hype, glossy gradients, and generic AI imagery.
- A drawn button is part of the artwork, not a functional control. Do not place one where the platform’s own CTA will cover it.
- Treat payout figures as illustrative only. Include a nearby qualifier such as “Indicative only. Not a quote or guaranteed earnings.”
- Never claim universal eligibility, guaranteed buyers, guaranteed revenue, full anonymity, zero risk, or automatic legal compliance.
- Do not place confidential, personal, customer, or production data in creative mockups.
- Check contrast and legibility; never encode meaning by color alone.

## Delivery checklist

1. Confirm all four files have the exact requested pixel dimensions.
2. Overlay the safe-zone guides and inspect every key element.
3. Preview the files in each intended platform placement; recompose if UI or automated crops interfere.
4. Inspect at phone size, not only at 100% on a desktop canvas.
5. Check copy, logo clear space, contrast, claims, disclaimers, file size, color profile, and filenames.
6. Keep the editable source and approval record with the campaign.

## Source notes

Reviewed 2026-09-14:

- [Meta: text overlays and safe zones for Stories and Reels](https://www.facebook.com/business/help/980593475366490) — keep top, bottom, and side edges free of key elements on 9:16 placements.
- [Meta: aspect-ratio best practices](https://www.facebook.com/business/help/103816146375741) — recommends 9:16 for Stories and Reels.
- [TikTok: Auction In-Feed ad specifications](https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads) — safe area varies with dimensions, caption length, and add-ons.
- [Google Ads: Performance Max image assets](https://support.google.com/google-ads/answer/14530211) — recommends 1200×628 horizontal and 1200×1200 square assets.
- [LinkedIn Marketing Solutions: share and image specifications](https://www.linkedin.com/help/lms/answer/a521928) — identifies 1200×627 and 1.91:1 for landscape imagery.

The pixel rectangles above deliberately exceed a simple minimum where variable interface overlays warrant it. They are cross-platform house guidance derived from the official placement behavior, not platform-certified templates.
