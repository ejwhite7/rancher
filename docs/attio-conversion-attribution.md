# Attio conversion attribution

Partnership webhook schema v7 sends structured first-touch and conversion-touch attribution to the Attio workflow. `additional_context` contains only text manually entered by the submitter.

## Object attributes

People, Companies, and Deals each use the same focused 32-field schema:

- `first_utm_source`, `first_utm_medium`, `first_utm_campaign`, `first_utm_term`, `first_utm_content`
- `first_attribution_id`, `first_source_platform`, `first_marketing_tactic`, `first_creative_format`, `first_ad_group`, `first_ad_group_id`, `first_ad_placement`, `first_device`, `first_match_type`, `first_network`
- The same 15 names with the `conversion_` prefix
- `attribution_submission_id`
- `attribution_converted_at`

First-touch values are immutable CRM acquisition evidence. The Attio workflow should populate a first-touch attribute only when it is empty. Conversion-touch values, submission ID, and conversion timestamp are written from each partnership conversion. For one partnership conversion, apply the same parsed values to the Person, associated Company, and created Deal.

## Parse JSON

Use `hookdeck/website-attio-parse-json.json` as the Attio Parse JSON test payload. Map every parsed first-touch and conversion-touch value to the identically named attribute on all three converted records. Keep the Person upsert before Company and Deal creation so the workflow can relate all three records.

The source attribution is retained in `rancher.submission_attribution`; migration 013 adds the explicit conversion snapshot to partnership webhook schema v7. Hookdeck transformation `website-attio` flattens the focused values for Attio while retaining the nested source object in the webhook.
