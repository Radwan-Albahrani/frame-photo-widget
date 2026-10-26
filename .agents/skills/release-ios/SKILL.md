---
name: release-ios
description: Router for shipping Kaset to TestFlight and the App Store. Decides which asc-* skill, script, or command to use for the situation at hand: building, uploading, waiting on processing, writing release notes, cancelling a stuck submission, submitting for review, diagnosing a rejection, or triaging TestFlight crashes. Use at the start of any release work, when a submission is stuck or rejected, or when unsure which asc skill applies.
---

# Shipping Kaset for iOS

Start here for anything release-shaped, then hand off. The `asc-*` skills are written for a generic
app; this file records where Kaset differs, and those differences win.

## The normal path

```bash
bun release:ios                  # build -> TestFlight -> wait for processing -> submit for review
bun deploy:testflight:local      # same, but stops after processing (TestFlight only)
bun release:ios:submit           # the tail on its own, for a build already uploaded
```

`scripts/ship-ios.sh` is the whole flow. EAS builds and uploads the IPA (its credentials are already
configured); `asc` does everything after the upload. Write the release notes **before** the submit
step runs, with the `release-notes` skill.

Order for a full release: `release-notes` → build → verify processing → submit. Splitting the build
(`--no-review`) from the submit (`release:ios:submit`) is the safe way to work: the build takes
about 20 minutes and cannot submit anything, so notes and copy review happen in parallel with it.

## Route by situation

| Situation | Go to |
|---|---|
| Writing "What's New" or promo text | **`release-notes`** (this repo's skill, NOT `asc-whats-new-writer`) |
| Arabic store copy of any kind | **`ux-araby`**, always, before writing a word of it |
| Build, upload, wait, submit | `scripts/ship-ios.sh`; read `asc-release-flow` only when deviating from it |
| Submission stuck, rejected, or in an unclear state | `asc-submission-health` |
| Cancelling an in-review submission | The script does it automatically. Manually: `asc-submission-health` |
| Build stuck in processing, or picking a build | `asc-build-lifecycle` |
| TestFlight groups, testers, What to Test | `asc-testflight-orchestration` |
| Crash reports or beta feedback after a release | `asc-crash-triage` |
| Screenshots (sizes, resizing, upload) | `asc-screenshot-resize`, then `asc-shots-pipeline` for capture |
| Description, keywords, subtitle, URLs | `asc-metadata-sync` |
| Need an ID (app, build, version, group) | `asc-id-resolver` |
| Signing certs or provisioning broke the build | `asc-signing-setup` |
| Any `asc` flag or output question | `asc-cli-usage`, or `asc <command> --help` |
| Wiring a repeatable multi-step automation | `asc-workflow` |

Not applicable to this app: `asc-apple-ads`, `asc-ppp-pricing`, `asc-revenuecat-catalog-sync`,
`asc-subscription-localization`, `asc-notarization` (macOS), `asc-app-create-ui` (the record exists).

## Kaset-specific facts that override the generic skills

Each of these was established against the live App Store Connect API for app `6787275694`, and each
one contradicts something a generic skill would have you do.

- **`asc validate` is advisory here, not a gate.** It reports four
  `review_details.missing_field` blockers on every version, including 1.3.0, which shipped. The API
  returns `attributes: {}` for the review detail of every version, shipped or not, so the check can
  never pass. **`asc review submit` is the real gate**: Apple validates server side and the
  submission fails loudly if something is genuinely missing. Do not "fix" the phantom blockers.
- **`asc review submit` fails on its last call, and the draft it leaves behind is complete.** It
  attaches the build, creates the review submission, and adds the version item, then aborts with
  `review submission <id> does not contain target version <uuid>`. Cause, from
  `internal/cli/submit/submit_create.go`: the final check reads
  `item.Relationships.AppStoreVersion.Data.ID` on each submission item, but Apple's
  `/v1/reviewSubmissions/{id}/items` returns items with **no `relationships` key** unless the request
  asks for it, and asc's client does not. So the version id reads as `""`, the item is counted as
  unrelated, and `hasTargetVersion` stays false no matter what. No flag skips that check, and
  `--version-id` does not help: target resolution is fine, the items query is what comes back thin.
  Finish it with `asc review submissions-submit --id <id> --confirm`, which does not run the check.
  `scripts/ship-ios.sh` detects this exact message and does it automatically, then re-reads the state
  to confirm `WAITING_FOR_REVIEW`; any other error aborts the run.
  Confirmed live on 2026-08-15 shipping 1.3.1 build 148. Not reported upstream as of that date.
- **Shipped versions report `READY_FOR_DISTRIBUTION`, not `READY_FOR_SALE`.** Filtering a version
  list on `READY_FOR_SALE` silently returns nothing.
- **Never copy metadata onto a version that already exists.** `asc release stage` requires
  `--metadata-dir` or `--copy-metadata-from`, so running it against a prepared version overwrites
  that version's own description, keywords, and notes with the previous release's. Stage only when
  creating the version; for an existing one, `asc review submit --build` attaches the build by itself.
- **`asc builds wait --since <RFC3339>` is the upload-lag primitive.** A freshly uploaded build takes
  minutes to appear in the API; `wait` polls for discovery *and* processing, and prints a line per
  poll. Always pass `--fail-on-invalid`, or an `INVALID` build counts as a successful terminal state
  and gets submitted.
- **There are no git tags.** `asc-whats-new-writer` and similar skills reach for
  `git describe --tags`; use `git log main..HEAD` on the version branch instead.
- **There is no `./metadata` canonical directory.** Skills that assume `asc metadata pull` output
  need it pulled first, or they will read nothing.
- Auth is a keychain profile named `kaset` (App Manager key `AB75JP3Y7W`). `asc auth status` exits 0
  with zero credentials, so check the payload, not the exit code.
- App id and version are single-sourced: `eas.json` → `submit.production.ios.ascAppId`, and
  `app.json` → `expo.version`. Never hardcode either.

## Rules that outrank convenience

- **OTA updates only ever go out via `bun run deploy:ota`**, never `eas update` directly. The update
  message is derived from the tip commit subject.
- Gates before shipping anything: `bun run gates`. Then commit → push → OTA, in that order.
- Every mutation the script performs supports `--dry-run`. Use it on any release step you have not
  run before against this app.
- A cancelled submission is not instant. After `asc submit cancel` the version stays locked until the
  cancellation lands; the script polls for that, and a manual cancel must too.
