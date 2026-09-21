#!/usr/bin/env bash
# Local IPA build -> TestFlight upload -> wait for processing -> cancel any active review -> submit for App Store review.
#
# Requires the App Store Connect CLI (https://github.com/rorkai/App-Store-Connect-CLI):
#   brew install asc
#   asc auth login --name "frame" --key-id KEY_ID --issuer-id ISSUER_ID --private-key ./AuthKey_KEY_ID.p8
# or the env fallbacks: ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY_PATH.
# EAS-managed keys do not work here: the .p8 is only downloadable from Apple at creation time,
# so generate a separate App Manager key for local shipping.
#
# Release notes come from release-notes/<version>.json when it exists (write it with the
# release-notes skill: /release-notes). Shape: {"en-US":{"whatsNew":"…","promotionalText":"…"}, …}.
# Anything not supplied per locale is carried forward from the previous release.
#
# Usage: bash scripts/ship-ios.sh [flags]
#   --notes-file PATH    Per-locale notes JSON (default: release-notes/<version>.json)
#   --whats-new TEXT     One release-notes text for every locale (overridden by --notes-file)
#   --promo-text TEXT    One promotional text for every locale (overridden by --notes-file)
#   --notes-locales CSV  Locales to write into (default: every locale on the version)
#   --copy-from VERSION  Version to copy metadata from (default: the last READY_FOR_SALE version)
#   --no-cancel          Fail instead of cancelling a submission that is already in review
#   --no-review          Stop after the build finishes processing (TestFlight only)
#   --skip-build         Reuse the existing ./build.ipa (bun run deploy:upload does this)
#   --skip-upload        Build is already uploaded; just wait and submit
#   --dry-run            Preview every mutation without applying it
#   --poll 60s           Processing poll interval
#   --timeout 45m        Processing timeout
set -euo pipefail

cd "$(dirname "$0")/.."

SKIP_BUILD=0
SKIP_UPLOAD=0
SUBMIT_FOR_REVIEW=1
CANCEL_ACTIVE=1
COPY_FROM=""
WHATS_NEW=""
PROMO_TEXT=""
NOTES_FILE=""
NOTES_LOCALES=""
DRY_RUN=0
POLL="60s"
TIMEOUT="45m"
IPA="./build.ipa"

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1 ;;
    --skip-upload) SKIP_BUILD=1; SKIP_UPLOAD=1 ;;
    --no-review) SUBMIT_FOR_REVIEW=0 ;;
    --no-cancel) CANCEL_ACTIVE=0 ;;
    --copy-from) COPY_FROM="${2:?--copy-from needs a version string}"; shift ;;
    --whats-new) WHATS_NEW="${2:?--whats-new needs text}"; shift ;;
    --promo-text) PROMO_TEXT="${2:?--promo-text needs text}"; shift ;;
    --notes-file) NOTES_FILE="${2:?--notes-file needs a path}"; shift ;;
    --notes-locales) NOTES_LOCALES="${2:?--notes-locales needs a comma-separated list}"; shift ;;
    --dry-run) DRY_RUN=1 ;;
    --poll) POLL="${2:?--poll needs a duration}"; shift ;;
    --timeout) TIMEOUT="${2:?--timeout needs a duration}"; shift ;;
    --ipa) IPA="${2:?--ipa needs a path}"; shift ;;
    -h|--help) sed -n '2,28p' "$0"; exit 0 ;;
    *) echo "ship-ios: unknown option $1" >&2; exit 2 ;;
  esac
  shift
done

step() { printf '\n\033[1;36m==>\033[0m \033[1m%s\033[0m\n' "$1"; }
note() { printf '    %s\n' "$1"; }
# Read one value out of a JSON blob: jget "$JSON" 'd.version?.id'
# Empty or malformed input reads as absent rather than crashing the run.
jget() { node -pe "let d;try{d=JSON.parse(process.argv[1])}catch{d={}}const v=($2);v===undefined||v===null?'':String(v)" "$1"; }

# App id and marketing version stay single-sourced in eas.json / app.json.
APP_ID="${ASC_APP_ID:-$(node -p "require('./eas.json').submit.production.ios.ascAppId")}"
VERSION="${APP_VERSION:-$(node -p "require('./app.json').expo.version")}"

if ! command -v asc >/dev/null 2>&1; then
  echo "ship-ios: 'asc' not found. Install it with: brew install asc" >&2
  exit 1
fi
# `asc auth status` exits 0 with no credentials at all, so check the payload.
AUTH_JSON="$(asc auth status --output json 2>/dev/null || echo '{}')"
if [ -z "$(jget "$AUTH_JSON" '(d.credentials?.length||0)>0||d.environmentCredentialsComplete===true?"1":""')" ]; then
  echo "ship-ios: asc has no credentials. Run 'asc auth login' or set ASC_KEY_ID/ASC_ISSUER_ID/ASC_PRIVATE_KEY_PATH." >&2
  exit 1
fi

CONFIRM_FLAG="--confirm"
[ "$DRY_RUN" -eq 1 ] && CONFIRM_FLAG="--dry-run"

echo "app $APP_ID  version $VERSION  ipa $IPA"

if [ "$SKIP_BUILD" -eq 0 ]; then
  step "Building IPA locally"
  rm -f "$IPA"
  # eas fetches its local-build plugin through npx; the 7-day npm release-age guard is for
  # third-party dependencies, not for Expo's own tooling, so it is lifted for this one call.
  npm_config_min_release_age=0 eas build --profile production --platform ios --local --output "$IPA" --non-interactive
fi

# Lower bound for build discovery, taken before the upload and padded for clock skew.
SINCE="$(date -u -v-10M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%SZ)"

UPLOAD_DRY_FLAG=""
[ "$DRY_RUN" -eq 1 ] && UPLOAD_DRY_FLAG="--dry-run"

if [ "$SKIP_UPLOAD" -eq 0 ]; then
  step "Uploading to TestFlight"
  [ -f "$IPA" ] || { echo "ship-ios: $IPA not found (drop --skip-build to build it)" >&2; exit 1; }
  # asc uploads to Apple's presigned URLs directly. `eas submit` queues behind EAS's own workers,
  # which was measured at 35 minutes of waiting for an artefact that is already built locally.
  UPLOAD_JSON="$(asc builds upload \
    --app "$APP_ID" \
    --ipa "$IPA" \
    --platform IOS \
    --output json \
    ${UPLOAD_DRY_FLAG:-})"
  UPLOAD_STATE="$(jget "$UPLOAD_JSON" 'd.state ?? d.data?.state ?? d.status')"
  note "upload state: ${UPLOAD_STATE:-unknown}"
  if [ "$DRY_RUN" -eq 1 ]; then
    note "dry run: upload operations reserved, nothing committed"
    exit 0
  fi
fi

step "Waiting for App Store Connect to process the build"
WAIT_JSON="$(asc builds wait \
  --app "$APP_ID" \
  --latest \
  --version "$VERSION" \
  --platform IOS \
  --since "$SINCE" \
  --poll-interval "$POLL" \
  --timeout "$TIMEOUT" \
  --fail-on-invalid \
  --output json)"

BUILD_ID="$(jget "$WAIT_JSON" 'd.buildId')"
BUILD_NUMBER="$(jget "$WAIT_JSON" 'd.buildNumber')"
note "build $VERSION ($BUILD_NUMBER) is VALID -> $BUILD_ID"

if [ "$SUBMIT_FOR_REVIEW" -eq 0 ]; then
  step "Done (TestFlight only)"
  note "Submit later with: bun run release:ios:submit"
  exit 0
fi

step "Checking for an active review submission"
REVIEW_JSON="$(asc review status --app "$APP_ID" --platform IOS --output json)"
REVIEW_STATE="$(jget "$REVIEW_JSON" 'd.reviewState')"
SUBMISSION_ID="$(jget "$REVIEW_JSON" 'd.latestSubmission?.id')"
ACTIVE_VERSION="$(jget "$REVIEW_JSON" 'd.version?.version')"
note "reviewState=${REVIEW_STATE:-unknown} version=${ACTIVE_VERSION:-none}"

case "$REVIEW_STATE" in
  WAITING_FOR_REVIEW|IN_REVIEW)
    if [ "$CANCEL_ACTIVE" -eq 0 ]; then
      echo "ship-ios: $ACTIVE_VERSION is $REVIEW_STATE and --no-cancel was passed. Cancel it manually or drop the flag." >&2
      exit 1
    fi
    step "Cancelling $REVIEW_STATE submission for $ACTIVE_VERSION"
    if [ "$DRY_RUN" -eq 1 ]; then
      note "dry-run: asc submit cancel --id $SUBMISSION_ID --confirm"
    else
      asc submit cancel --id "$SUBMISSION_ID" --confirm --output table
      # Cancellation is asynchronous; the version stays locked until it lands.
      for _ in $(seq 1 18); do
        REVIEW_STATE="$(jget "$(asc review status --app "$APP_ID" --platform IOS --output json)" 'd.reviewState')"
        case "$REVIEW_STATE" in
          WAITING_FOR_REVIEW|IN_REVIEW|CANCELING) note "waiting for cancellation... ($REVIEW_STATE)"; sleep 10 ;;
          *) break ;;
        esac
      done
      note "reviewState=$REVIEW_STATE"
      case "$REVIEW_STATE" in
        WAITING_FOR_REVIEW|IN_REVIEW|CANCELING)
          echo "ship-ios: submission $SUBMISSION_ID is still $REVIEW_STATE after 3 minutes. Re-run once it clears." >&2
          exit 1 ;;
      esac
    fi
    ;;
  PENDING_DEVELOPER_RELEASE)
    echo "ship-ios: $ACTIVE_VERSION is approved and awaiting release. Release it first, then re-run." >&2
    exit 1 ;;
esac

step "Resolving the App Store version"
VERSIONS_JSON="$(asc versions list --app "$APP_ID" --platform IOS --limit 10 --output json)"
EXISTING_VERSION_ID="$(node -pe 'const d=JSON.parse(process.argv[1]);const cur=process.argv[2];((d.data||[]).find(v=>v?.attributes?.versionString===cur)||{}).id||""' \
  "$VERSIONS_JSON" "$VERSION")"

# Only copy metadata when we are creating the version. An existing version already
# carries its own prepared metadata, and copying would overwrite it with the last release's.
STAGE_METADATA=0
if [ -n "$COPY_FROM" ]; then
  STAGE_METADATA=1
elif [ -z "$EXISTING_VERSION_ID" ]; then
  STAGE_METADATA=1
  # Apple reports shipped versions as READY_FOR_DISTRIBUTION (READY_FOR_SALE is the legacy name).
  COPY_FROM="$(node -pe 'const d=JSON.parse(process.argv[1]);const cur=process.argv[2];
    const vs=(d.data||[]).filter(v=>v?.attributes?.versionString&&v.attributes.versionString!==cur);
    const done=["READY_FOR_DISTRIBUTION","READY_FOR_SALE"];
    (vs.find(v=>done.includes(v.attributes.appStoreState))||vs[0]||{attributes:{}}).attributes.versionString||""' \
    "$VERSIONS_JSON" "$VERSION")"
  if [ -z "$COPY_FROM" ]; then
    echo "ship-ios: $VERSION does not exist and no earlier version was found to copy metadata from. Pass --copy-from VERSION." >&2
    exit 1
  fi
  note "$VERSION does not exist yet, creating it from $COPY_FROM"
else
  note "$VERSION already exists ($EXISTING_VERSION_ID), leaving its metadata alone"
fi

# Per-locale notes written by the release-notes skill win over the flags and the copy.
[ -z "$NOTES_FILE" ] && [ -f "release-notes/$VERSION.json" ] && NOTES_FILE="release-notes/$VERSION.json"
if [ -n "$NOTES_FILE" ]; then
  [ -f "$NOTES_FILE" ] || { echo "ship-ios: $NOTES_FILE not found." >&2; exit 1; }
  note "release notes from $NOTES_FILE"
  HAS_WHATS_NEW="$(node -pe 'Object.values(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))).some(v=>v?.whatsNew)?"1":""' "$NOTES_FILE")"
  HAS_PROMO="$(node -pe 'Object.values(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))).some(v=>v?.promotionalText)?"1":""' "$NOTES_FILE")"
else
  HAS_WHATS_NEW=""; HAS_PROMO=""
  [ -n "$WHATS_NEW" ] && HAS_WHATS_NEW=1
  [ -n "$PROMO_TEXT" ] && HAS_PROMO=1
fi

# Text we are about to write ourselves must not be overwritten by the copy.
EXCLUDE_FIELDS=""
[ -n "$HAS_WHATS_NEW" ] && EXCLUDE_FIELDS="whatsNew"
[ -n "$HAS_PROMO" ] && EXCLUDE_FIELDS="${EXCLUDE_FIELDS:+$EXCLUDE_FIELDS,}promotionalText"
STAGE_ARGS=()
[ -n "$EXCLUDE_FIELDS" ] && STAGE_ARGS=(--exclude-fields "$EXCLUDE_FIELDS")

if [ "$STAGE_METADATA" -eq 1 ]; then
  step "Staging $VERSION with build $BUILD_NUMBER (metadata from $COPY_FROM)"
  asc release stage \
    --app "$APP_ID" \
    --version "$VERSION" \
    --build-id "$BUILD_ID" \
    --platform IOS \
    --copy-metadata-from "$COPY_FROM" \
    ${STAGE_ARGS[@]+"${STAGE_ARGS[@]}"} \
    "$CONFIRM_FLAG" \
    --output table
else
  note "skipping metadata copy; asc review submit attaches build $BUILD_NUMBER itself"
fi

if [ -n "$HAS_WHATS_NEW" ] || [ -n "$HAS_PROMO" ]; then
  step "Writing release notes"
  VERSION_ID="$(jget "$(asc versions list --app "$APP_ID" --platform IOS --version "$VERSION" --output json)" 'd.data?.[0]?.id')"
  if [ -z "$VERSION_ID" ]; then
    echo "ship-ios: version $VERSION not found after staging; cannot write release notes." >&2
    exit 1
  fi

  if [ -n "$NOTES_LOCALES" ]; then
    LOCALES="$(echo "$NOTES_LOCALES" | tr ',' ' ')"
  else
    LOCALES="$(jget "$(asc localizations list --version "$VERSION_ID" --paginate --output json)" \
      'd.data?.map(l=>l.attributes?.locale).filter(Boolean).join(" ")')"
  fi
  [ -n "$LOCALES" ] || { echo "ship-ios: no locales configured on version $VERSION." >&2; exit 1; }

  for LOCALE in $LOCALES; do
    LOCALE_WN="$WHATS_NEW"
    LOCALE_PROMO="$PROMO_TEXT"
    if [ -n "$NOTES_FILE" ]; then
      LOCALE_WN="$(node -pe 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))[process.argv[2]]?.whatsNew||""' "$NOTES_FILE" "$LOCALE")"
      LOCALE_PROMO="$(node -pe 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))[process.argv[2]]?.promotionalText||""' "$NOTES_FILE" "$LOCALE")"
    fi
    if [ -z "$LOCALE_WN" ] && [ -z "$LOCALE_PROMO" ]; then
      note "$LOCALE: no text supplied, keeping what was copied from $COPY_FROM"
      continue
    fi

    TEXT_ARGS=()
    [ -n "$LOCALE_WN" ] && TEXT_ARGS+=(--whats-new "$LOCALE_WN")
    [ -n "$LOCALE_PROMO" ] && TEXT_ARGS+=(--promotional-text "$LOCALE_PROMO")

    note "$LOCALE: $(printf '%s' "${LOCALE_WN:-$LOCALE_PROMO}" | head -c 60)..."
    if [ "$DRY_RUN" -eq 1 ]; then
      continue
    fi
    asc localizations update \
      --version "$VERSION_ID" \
      --locale "$LOCALE" \
      "${TEXT_ARGS[@]}" \
      --output json >/dev/null
  done
fi

step "Readiness check"
# Advisory only. `review_details.missing_field` fires on every version here, including ones that
# shipped (1.3.0's review detail returns the same empty attributes over the API), so a blocking
# gate would never let a release through. `asc review submit` is the real gate: Apple validates
# server-side and the submission fails loudly if something is genuinely missing.
if ! asc validate --app "$APP_ID" --version "$VERSION" --platform IOS --output table; then
  note "validate reported blockers; continuing, the submission below is the real gate"
fi

step "Submitting $VERSION ($BUILD_NUMBER) for App Store review"
# `asc review submit` attaches the build, creates the review submission, adds the version item, then
# submits. That last call aborts with "does not contain target version": its check reads
# item.Relationships.AppStoreVersion.Data.ID, but Apple returns submission items with no
# relationships object, so the id reads as empty and the item never matches. The draft it leaves
# behind is complete, so finish it with the lower-level submit, which does not run that check.
SUBMIT_STATUS=0
SUBMIT_OUT="$(asc review submit \
  --app "$APP_ID" \
  --version "$VERSION" \
  --build-id "$BUILD_ID" \
  --platform IOS \
  "$CONFIRM_FLAG" \
  --output table 2>&1)" || SUBMIT_STATUS=$?
printf '%s\n' "$SUBMIT_OUT"

if [ "$SUBMIT_STATUS" -ne 0 ]; then
  DRAFT_ID="$(printf '%s' "$SUBMIT_OUT" \
    | sed -nE 's/.*review submission ([0-9a-fA-F-]{36}) does not contain target version.*/\1/p' | head -1)"
  if [ -z "$DRAFT_ID" ]; then
    echo "ship-ios: submission failed for a reason other than the known item-id mismatch." >&2
    exit "$SUBMIT_STATUS"
  fi
  note "asc left draft $DRAFT_ID unsubmitted (known item-id mismatch); submitting it directly"
  asc review submissions-submit --id "$DRAFT_ID" --confirm --output table

  FINAL_STATE="$(jget "$(asc submit status --id "$DRAFT_ID" --output json)" 'd.state')"
  case "$FINAL_STATE" in
    WAITING_FOR_REVIEW|IN_REVIEW) note "submission $DRAFT_ID is $FINAL_STATE" ;;
    *)
      echo "ship-ios: submission $DRAFT_ID is $FINAL_STATE, not submitted. Inspect with: asc submit status --id $DRAFT_ID" >&2
      exit 1 ;;
  esac
fi

step "Review status"
asc review status --app "$APP_ID" --version "$VERSION" --platform IOS --output table
