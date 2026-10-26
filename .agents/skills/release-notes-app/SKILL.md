---
name: release-notes-app
description: Write App Store release notes ("What's New") and promotional text for the Frame version about to ship, and save them to release-notes/<version>.json so `bun run release:ios` can apply them. Use when preparing an App Store submission, when asked for release notes / what's new / promo text / store copy, or before running the iOS ship script.
---

# App Store release notes

Produce `release-notes/<version>.json` for the version in `app.json`. `scripts/ship-ios.sh` reads
that file automatically and writes each locale's text onto the App Store version before submitting,
so once this file is right the user runs one command and never opens App Store Connect.

## Output shape

```json
{
  "en-US": { "whatsNew": "…", "promotionalText": "…" }
}
```

Frame's listing is English only (`CFBundleLocalizations` is `["en"]`). Any locale you omit keeps
whatever was carried over from the previous release, so if the listing ever gains a locale, cover it.
Confirm the real list when `asc` is authenticated:

```bash
APP_ID=$(node -p "require('./eas.json').submit.production.ios.ascAppId")
VERSION=$(node -p "require('./app.json').expo.version")
VERSION_ID=$(asc versions list --app "$APP_ID" --platform IOS --version "$VERSION" --output json \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).data[0].id')
asc localizations list --version "$VERSION_ID" --output table
```

## Gather what actually changed

1. Version: `node -p "require('./app.json').expo.version"`.
2. Frame ships from `main` and has no tags. The range starts at the commit that set the previous
   version: `git log -L '/"version"/,+1:app.json' --oneline` shows each bump; read
   `git log <previous-bump>..HEAD --oneline` from the one before the current version.
3. Read the commit bodies and diffs for anything ambiguous. Do not guess at a feature from a subject.

Keep only what a user can notice: new features, visible fixes, redesigned screens, speed the user
feels. Drop refactors, dependency bumps, test changes, instrumentation, and internal perf work that
never crossed a perceptible threshold. If the release is genuinely all internal, say so and write
notes about stability rather than inventing features.

## Write the copy

- **whatsNew** has a fixed shape: **one sentence saying what this release is about, a blank line,
  then bullet points.** Never a wall of sentences and never bullets with no lead.

  ```
  Deleting albums and folders works again, and you can now drag albums into folders.

  • Fixed deleting an album or folder doing nothing
  • Drag an album or folder onto a folder to move it
  ```

  Lead sentence: what a returning user would notice first, in their words. No version number,
  Apple already shows it. Bullets: 2 to 6, one line each, most interesting first, no trailing
  periods. Use `•`. 4000 character hard limit; aim well under 600.
- **promotionalText**: one line, 170 character hard limit. It sits above the description and can be
  changed without a new build, so it pitches the app as it is now, not the changelog. Frame's pitch
  is that it is free for good: no ads, no subscription, no limits on albums or photos.
- Name things the way the app does (albums, folders, widgets, Home Screen), never by module names.
- **No em dashes.** Use a colon, a comma, parentheses, or two sentences.

## Deliver

1. Write `release-notes/<version>.json` (create the directory if needed).
2. Print the copy back in the reply, with the character count of `promotionalText`.
3. Tell the user the next command: `bun run release:ios` for the full build → TestFlight → review
   chain, or `bun run release:ios:submit` when the build is already uploaded.

Expect iterations on wording. Offer a couple of distinct angles for `promotionalText` with a short
rationale for each rather than one take, and rewrite on request without re-deriving the changelog.
