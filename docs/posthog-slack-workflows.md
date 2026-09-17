# PostHog form-submission Slack workflows

Successful Rancher form submissions trigger three active PostHog Workflows that post to Slack channel `#form-submissions` (`C0C2HJ89ZUM`). Each workflow deduplicates on `submission_id`, aborts if Slack delivery fails, and sends one message immediately after the matching event.

| Form | PostHog event | Slack fields |
| --- | --- | --- |
| Partnership | `partnership_request_submitted` | Submission ID, name, email, domain, job title, company, company size, data history, record types, additional context, outreach consent, referral bonus, calculator scenario |
| Contact | `contact_form_submitted` | Submission ID, name, email, message |
| Referral | `referral_form_submitted` | Submission ID, referrer first name, referrer last name, referrer email, referred first name, referred last name, referred email, company size, industry |

The contact and referral events are captured only after the API confirms persistence. Analytics or workflow failure never changes a successful browser confirmation into an error. Form controls remain excluded from PostHog autocapture.

## Verification

Before activation, test each workflow with `workflows-test-run` and mocked asynchronous functions. Verify the trigger matches and the Slack action completes without making a real Slack request. After activation, submit clearly marked test forms and confirm one message per submission in `#form-submissions`.

The Slack connection must be able to post to the channel. If delivery reports `not_in_channel`, invite the PostHog Slack app to `#form-submissions`, then retry the failed workflow invocation.
