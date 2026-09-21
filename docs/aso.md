# ASO plan — Frame (App Store Connect app 6814411936)

Storefront analysed: **US (en-US)**. Prepared 2026-09-21, for version 1.0.0 (`PREPARE_FOR_SUBMISSION`, no build uploaded yet).

Data sources: public App Store search competition via `asc optimize keywords score`, App Store Connect reads via `asc` (read-only), and manual review of competitor product pages.

---

## 1. Competitive landscape

### Who actually owns this niche

| App | Subtitle | Ratings | Monetisation |
|---|---|---|---|
| **Photo Widget: Theme Wallpapers** (id 1530149106) | Lock Screen, Icons & Aesthetic | 168K, 4.64 | Free + ads; IAP $0.99–$24.99, sub $6.99/mo or $24.99/yr |
| **Widgetsmith** (id 1523682319) | — | 772K, 4.61 | Free + ads; Premium $1.99/mo, $19.99/yr |
| **Photo Widget.** by Impala Studios (id 1074246199) | Photo Widgets on Home Screen | 32K, 4.57 | Free + ads; $3.99/$12.49/$24.99 to remove ads + unlock unlimited widgets |
| **Color Widgets** (id 1531594277) | — | 524K, 4.60 | Free + ads + subscription |
| **Themify** (id 1534126062) | — | 343K, 4.56 | Free + ads + subscription |
| **iScreen** (id 1534704608) | — | 150K, 4.74 | Free + ads + subscription |
| **Photo Widget - Simple Widgets** (id 1658276765) | Top Widgets: Custom Collage | 188, 4.5 | Ads + Premium $4.99 / weekly sub |
| **Locket Widget** (id 568481…) | — | 568K, 4.76 | Adjacent (friend photos), not the same job |

### What this tells us

1. **Every single meaningful competitor monetises with ads, a subscription, or both.** Impala's "Photo Widget." explicitly sells *"Unlimited widgets. Remove ads"* as the IAP — i.e. the exact two things Frame gives away. There is no credible, well-ranked, genuinely-free, no-ads photo widget app in the US store. That is the whole wedge.
2. **The leaders have drifted off-category.** The #1 result for "photo widget" is now a *theme/wallpaper/icon/AI-wallpaper* app that ranks #90 in Graphics & Design. Widgetsmith, Color Widgets, Themify and iScreen are widget *suites*, not photo apps. A focused, fast, single-purpose photo widget is a real differentiated position, not just a cheaper one.
3. **Users are already complaining about exactly this.** Documented review themes for the category leader: features progressively moved behind paywalls (the developer had to walk back a 21-photo premium limit), and "photowidget now has premium, which is sad because not having a paid subscription was what brought me to this app." For Photo Widget - Simple Widgets, reviewers report being "bombarded with advertisements." Widgetsmith's recurring complaint is subscriptions gating basic features.
4. **Conversion, not just ranking, is where we win.** Since we cannot outrank 770K-rating incumbents on the head term at launch, the subtitle and the first line of the description have to do the differentiating work in the search results list. "No Ads" in the subtitle is a conversion weapon against a result page where every other app has ads.

### Vocabulary users actually search

The useful head terms and their measured difficulty (0–100, from public App Store search competition; lower = easier). Full runs are reproducible with `asc optimize keywords score`.

| Term | Difficulty | Read |
|---|---|---|
| widget | 67 | Head term, unwinnable, covered anyway |
| photo collage | 61 | High volume but **we do not do collages** — dropped |
| photo widget | **57** | The money term. Hard, but must be owned in the name |
| photo | 55 | Covered by name |
| frame | 54 | Covered by name (brand doubles as keyword) |
| free widget | 48 | Worth covering via `free` |
| album | 48 | |
| digital frame / digital photo frame | 44 | High intent, cheap to reach — brand name already supplies "frame" |
| photo gallery | 44 | |
| gallery widget | 40 | |
| home screen widget | 39 | |
| album widget | 39 | Weak incumbents (top result has 0 ratings) |
| photo album | 38 | |
| picture widget / picture frame | 36 | Parallel vocabulary, cheap |
| slideshow | 36 | |
| photo slideshow | 32 | Exactly what the app does |
| free photo widget | 30 | |
| widget album | 33 | |
| custom widget | 28 | |
| photo memories | 26 | |
| photos on home screen | 23 | |
| photo widget free | 22 | |
| unlimited photos | 22 | |
| slideshow widget | 22 | |
| shuffle photos / photo shuffle | 20–21 | Core feature, low competition |
| frame widget | 20 | |
| photo rotate | 18 | |
| offline photo | 17 | |
| lock screen photo | 16 | Cheapest term in the category — **but we do not ship Lock Screen widgets**, so deliberately excluded |
| rotating photo | 9 | Almost uncontested |

### Apple's own signals (read-only checks)

```
asc app-tags list --app 6814411936                  -> data: [] (0 tags)
asc apps search-keywords list --app 6814411936 \
    --locale en-US --platform IOS                   -> data: [] (0 keywords)
asc status --app 6814411936                         -> 1.0.0 PREPARE_FOR_SUBMISSION, no builds
asc optimize keywords discover --app ... --country US-> unavailable (no Apple Ads credentials)
```

Interpretation:

- **Apple has generated no discoverability tags for this app yet.** App tags are derived after the app has metadata, a binary and review; an empty list here is expected pre-launch, not a problem. It is also a free feedback loop: **after the app goes live, re-run `asc app-tags list` — the tags Apple picks are Apple telling you how its own classifier understood your app.** If the tags come back as "Wallpapers" or "Themes" rather than photo/widget concepts, the metadata is mis-signalling.
- The `searchKeywords` relationship is empty because nothing has been pushed to the live version localisation yet.
- Apple Ads *Search Popularity* (the only true volume signal Apple publishes) is unavailable without Apple Ads credentials. If you ever set up an Apple Ads account, `asc ads auth login` then `asc optimize keywords discover --app 6814411936 --country US` and `asc optimize keywords score --keywords ... --genre ...` will add real demand numbers on top of the difficulty numbers above. Everything below is therefore based on measured *competition* plus category intuition, not measured volume.

---

## 2. Recommended metadata

### App name — 25 / 30 characters

```
Frame: Photo Widget Album
```

Verified: 25 characters.

Why:

- Keeps the brand **Frame**, which is itself a category keyword (difficulty 54) and, critically, combines with "Photo" to reach **digital photo frame / photo frame / picture frame** — an entire second search intent (people looking for a digital photo frame for their phone) that costs us nothing.
- Keeps **"Photo Widget"** as an adjacent exact phrase. This is the single highest-volume term in the niche and the name field is the highest-weighted indexed field; giving it up would be malpractice.
- Adds **"Album"**, which was unused name real estate (the old name spent only 19 of 30 characters). It buys exact-phrase coverage of *widget album*, and all-words coverage of *photo album*, *album widget*, *picture album*. "Album widget" in particular has visibly weak incumbents.
- No price words, no competitor names, no emoji, no rank claims — Apple-safe.
- **Fallback if review objects to a three-word descriptor:** `Frame: Photo Widget` (19 chars). This has not been a problem for peers — the store already carries "Photo Widget: Theme Wallpapers" and "Photo Widget - Simple Widgets".

### Subtitle — 29 / 30 characters

```
Home Screen Slideshow, No Ads
```

Verified: 29 characters. Zero word overlap with the name (name+subtitle words: frame, photo, widget, album, home, screen, slideshow, no, ads).

Why:

- **"Home Screen"** — the single most common qualifier people attach to widget searches ("photos on home screen", "home screen widget"). Combined with the name's "Widget" and "Photo" it covers *home screen widget*, *home screen photo*, *photos on home screen*.
- **"Slideshow"** — the most accurate one-word description of what this app does, and it unlocks *photo slideshow* (32), *slideshow widget* (22) and *picture slideshow*. It also communicates the rotation feature instantly to a browsing user.
- **"No Ads"** — this is the conversion lever. On a results page where every competing app is ad-supported, two words in the subtitle do more for install rate than any keyword could. It is a feature claim, not a price claim, so it does not fall foul of Apple's "no pricing in name/subtitle" guidance the way "Free" would.
- Deliberately **not** using "Free" here: Apple's product page guidance discourages pricing information in the name and subtitle, and the App Store already shows a "Get" button. "Free" is instead carried by the keyword field (indexed) and by the promotional text and description (persuasion).

### Keywords — 100 / 100 characters

```
picture,gallery,shuffle,digital,free,rotate,memories,family,pet,baby,private,custom,unlimited,travel
```

Verified: exactly 100 characters, 14 terms, no spaces after commas, no term repeated from the name or subtitle, all singular.

Per-term justification:

| Term | Chars | Why |
|---|---|---|
| `picture` | 7 | Unlocks the entire parallel vocabulary a large share of users type instead of "photo": *picture widget* (36), *picture frame* (36), *picture album*, *picture slideshow*, *picture gallery*. Highest value per character in the list. |
| `gallery` | 7 | *photo gallery* (44), *gallery widget* (40). Common alternative mental model for "albums of my photos". |
| `shuffle` | 7 | Literal shipped feature. *photo shuffle* (20) / *shuffle photos* (21) are low-competition and high-intent; Impala's app markets "Photo Shuffle" as a headline feature, so the term has proven demand. |
| `digital` | 7 | Only exists to combine with the brand: *digital frame* (44) and *digital photo frame* (44). Reaches a distinct, high-intent audience for 7 characters. |
| `free` | 4 | The identity, and a real search modifier: *free photo widget* (30), *photo widget free* (22), *free widget* (48). Cheapest possible way to be indexed for the wedge without putting a price word in the name. |
| `rotate` | 6 | *rotating photo* is the least contested term measured (9) and *photo rotate* is 18. Describes the core behaviour in the words non-technical users use. |
| `memories` | 8 | *photo memories* (26), *memory widget* (28). Emotional-intent searches; a rotating album of your own photos is a genuine match. Plural kept because "memories" is the form people type; "memory" is not a natural search here. |
| `family` | 6 | *family photo* (37). Highest-volume of the audience modifiers and matches the description's own framing. |
| `pet` | 3 | *pet widget* (40) but near-zero competition in combination with photo/album. 3 characters. |
| `baby` | 4 | *baby widget* (22). Same logic — new parents are a large, motivated segment for a rotating photo widget. |
| `private` | 7 | *private photo* (33). Supports the on-device / no-account / no-tracking story, which is a secondary wedge after "free". |
| `custom` | 6 | *custom widget* (28). Very common generic qualifier in this category. |
| `unlimited` | 9 | *unlimited photos* (22). Directly indexes the no-limits promise; competitors literally sell "unlimited widgets" as an IAP. |
| `travel` | 6 | *travel photo widget* long tail; matches the description's trip-album example. Uses the last 6 characters rather than leaving budget unspent. |

**Deliberately excluded, and why:**

- `collage` — high volume, but Frame shows one photo per widget. Indexing for it buys mismatched installs and bad reviews. (It is in the current keyword field; remove it.)
- `lock screen` / `lock` — the cheapest terms measured (*lock screen photo*, 16), but Frame ships Home Screen widgets only. Revisit the moment Lock Screen widgets ship; it is the single biggest available keyword upgrade.
- `aesthetic`, `wallpaper`, `theme`, `icon` — high volume, but this is where the theme-suite apps live. A dark, focused photo app will lose those users and their reviews.
- `no ads`, `home screen`, `slideshow`, `photo`, `widget`, `album`, `frame` — already in the name or subtitle; Apple indexes those fields separately, so repeating them here would waste characters.
- `couple` — *couple widget* is 53 difficulty and dominated by Locket (568K ratings). Unwinnable.
- `offline`, `carousel`, `grid`, `homescreen` (one word) — low real search demand relative to their character cost; they lost the budget contest to `travel`/`unlimited`.
- Any competitor trademark (Widgetsmith, Locket, Photo Widget Inc.) — prohibited and grounds for rejection.

### Promotional text — 160 / 170 characters

```
Free forever. No ads, no subscriptions, no paywall, no limits. Unlimited albums, a different album on every widget, and photos that change on their own all day.
```

Verified: 160 characters. Not indexed for search — this is pure persuasion, and it sits above the description, so it must land the wedge in the first four words. It can also be changed at any time without shipping a new build, which makes it the right place for launch messaging and later A/B-style iteration.

### Description — 1,788 / 4,000 characters

Not indexed for App Store search. Written for conversion: the free-forever claim in line one, short scannable blocks, a bulleted feature list for skimmers, and the anti-paywall promise repeated as the closing line.

```
Frame puts your own photos on your Home Screen — and it is free. Not free-with-ads. Not free-for-now. Not free-until-you-hit-a-limit. There is no paywall in this app and there never will be one.

WHY IT EXISTS
Every good photo widget app eventually turns paid, or buries your photos under banner ads. Frame was built because putting your own pictures on your own Home Screen should not cost anything.

AS MANY ALBUMS AS YOU LIKE
Make an album for anything: a trip, a person, a pet, a year. Add as many photos as you want. Nothing is capped, ever.

EVERY WIDGET GETS ITS OWN ALBUM
Place as many widgets as you like, in small, medium, large or extra large. Each one picks its own album, so your family shots and your travel shots can sit on the same screen.

PHOTOS THAT CHANGE ON THEIR OWN
Choose how often a widget moves to the next photo: every five minutes, every fifteen, hourly, every six hours, or once a day. Shuffle them if you would rather be surprised. It keeps going whether or not the app is open.

OPTIONAL DETAIL
Show the album name or the date over the photo, or keep it clean and let the picture speak.

YOUR PHOTOS STAY YOURS
No account. No sign-in. No network code at all. Your photos are never uploaded anywhere, because there is nowhere for them to go. Frame keeps a resized copy in its own storage, so your widgets keep working even if you later delete the original.

WHAT YOU GET
• Unlimited albums, unlimited photos
• Small, medium, large and extra large widgets
• A different album on every widget
• Rotation every 5 minutes, 15 minutes, hour, 6 hours or day
• Optional shuffle
• Optional album name and date overlay
• Works fully offline
• A dark, quiet interface that stays out of the way

No ads. No subscriptions. No paywall. No limits. No tracking. No account.
```

Changes from the current description: the free claim is moved into the opening sentence instead of paragraph two; a scannable "WHAT YOU GET" bullet block is added for users who never read prose; "network code" phrasing is kept because it is unusually credible; "collage" is nowhere in the copy, matching the keyword decision.

### en-GB

`metadata/app-info/en-GB.json` and `metadata/version/1.0.0/en-GB.json` currently mirror en-US. Apple indexes en-GB separately and it serves the UK, AU, NZ, IE and several other storefronts, so **apply the same four values there**. The copy needs no Britishisation (no US-only spellings are used). This is effectively a free doubling of indexed storefronts.

---

## 3. Summary table (apply these)

| Field | Value | Chars | Limit |
|---|---|---|---|
| name | `Frame: Photo Widget Album` | 25 | 30 |
| subtitle | `Home Screen Slideshow, No Ads` | 29 | 30 |
| keywords | `picture,gallery,shuffle,digital,free,rotate,memories,family,pet,baby,private,custom,unlimited,travel` | 100 | 100 |
| promotionalText | `Free forever. No ads, no subscriptions, no paywall, no limits. Unlimited albums, a different album on every widget, and photos that change on their own all day.` | 160 | 170 |
| description | see above | 1788 | 4000 |

Apply to **en-US and en-GB**, app 6814411936, version 1.0.0.

Non-metadata items that matter as much as the copy:

- **Screenshot 1 must say the wedge in text**, not just show the app. Something like "Free forever. No ads. No subscriptions." burned into the first screenshot. Most users decide from screenshot 1 and the subtitle without opening the page.
- **Category:** Photo & Video primary is correct — Utilities secondary is fine, but note the category leader sits in Graphics & Design. Photo & Video is the right home for a focused photo app and is less saturated with theme suites.
- **Ask for a review at a good moment** (after a second album is created, never on first launch). Rating count is a direct input to the App Store's ranking model and it is the one thing a new app is structurally worst at.

---

## 4. What to re-check after launch

1. **`asc app-tags list --app 6814411936`** once the app is live. Apple's own generated tags reveal how its classifier understood the app. Photo/widget/album-flavoured tags = the metadata is signalling correctly. Wallpaper/theme/aesthetic tags = reconsider the copy.
2. **`asc optimize keywords rank --app 6814411936 --keywords "photo widget,picture widget,photo slideshow,album widget,digital photo frame,free photo widget,photo shuffle,rotating photo" --country us`** weekly for the first 6–8 weeks. Baseline is "unranked everywhere" today. Terms where you break into the visible window fast are the ones worth doubling down on; terms still absent after two months are terms to trade away in the keyword field.
3. **Set up Apple Ads credentials** (`asc ads auth login`) even with zero ad spend, then re-run `asc optimize keywords discover` and `asc optimize keywords score --genre ...`. That unlocks Apple's official *Search Popularity* numbers, which converts every difficulty judgement in this document from "competition measured, volume estimated" to "both measured". This is the highest-leverage follow-up on the list.
4. **Watch the search terms in App Store Connect → Analytics** (`asc analytics`) for the queries actually driving impressions. Any recurring term that is not in the name, subtitle or keywords is a free swap candidate.
5. **Re-check the exclusions.** If Lock Screen widget support ships, add `lock` to the keyword field immediately — *lock screen photo* was the cheapest term measured in the entire category (difficulty 16). If a collage or grid layout ever ships, `collage` becomes worth its 8 characters.
6. **Iterate promotional text freely.** It needs no new build. Test a harder anti-paywall line ("The photo widget that never asks for money") against the current one and watch conversion in Analytics.
7. **Re-run the audit before each release:** `asc metadata keywords audit --app 6814411936 --version <v>` catches duplicate phrases, name/subtitle overlap and unused character budget automatically.
8. **Watch competitor moves.** If the category leader removes its paywall, the wedge narrows and the positioning needs to shift to "focused and fast" rather than "free". Re-read their recent reviews quarterly.
9. **Localise beyond English** once there is traction. The keyword field is per-locale, and es-MX / pt-BR / de-DE / ja are far less contested for this category than en-US.
