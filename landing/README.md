# frame-landing

Landing page and privacy policy for **Frame**, served by a single **Cloudflare Worker** — the same
setup as the sister app's `kaset-share-page` worker (`wrangler.jsonc`, a module Worker as `main`, a
`./public` assets directory, no build step).

Frame has no sharing feature, so this Worker has no API routes, no KV and no secrets. It serves
three things and nothing else.

## Routes

| Route | What it serves |
|---|---|
| `/` | The landing page (`src/pages/home.ts`) |
| `/privacy` | The privacy policy (`src/pages/privacy.ts`). `/privacy.html` and `/privacy-policy` also work |
| `/shots/*.png` | The App Store screenshots, straight from `./public` |
| anything else | A 404 page (`src/pages/notFound.ts`) |

Both HTML pages are rendered by the Worker rather than stored as static files, so it sets
`content-type: text/html; charset=utf-8`, cache headers, an `ETag` (so repeat visits get a 304) and
a strict `Content-Security-Policy` itself. All CSS is inline in the page. **There are no external
stylesheets, no web fonts, no scripts and no analytics** — the page loads nothing from anyone,
which is the whole point of the app.

## Layout

```
landing/
  wrangler.jsonc          worker name, compatibility date, entry point, assets binding
  package.json            dev/deploy scripts + wrangler (no build step)
  tsconfig.json
  src/
    index.ts              routing, headers, 404
    pages/
      layout.ts           shared <head>, CSS tokens, header, footer, App Store URL
      home.ts             landing page (copy, screenshot slots, styles)
      privacy.ts          privacy policy (mirrors ../PRIVACY.md)
      notFound.ts         404 page
  public/
    robots.txt
    shots/                ← the App Store screenshots go here
```

No comments appear in any `.ts` file: the repo's pre-commit lint rejects them.

## Screenshots

The landing page expects **four** portrait screenshots at `public/shots/`:

| File | Suggested shot |
|---|---|
| `albums.png` | The album list |
| `album.png` | One album open, photos inside |
| `widgets.png` | Widgets on the Home Screen |
| `settings.png` | Widget settings / how often the photo changes |

Drop the PNGs in `landing/public/shots/` with exactly those names and they appear automatically —
nothing else to change. Until they exist the page still renders correctly: each slot shows an empty
gold-tinted phone frame labelled "Screenshot".

Each frame is `aspect-ratio: 9 / 19.5` and crops from the top, so tall App Store screenshots
(e.g. 1290×2796) fit without distortion. To rename them, add a fifth, or drop to three, edit the
`shots` array near the bottom of `src/pages/home.ts` — the grid is four-up on desktop and turns into
a swipeable snap-scrolling row below 860px wide.

`PLACE_SCREENSHOTS_HERE.md` in that folder is only a reminder; delete it once the real files are in.

## Local preview

```bash
cd landing
npm install          # first time only
npx wrangler dev     # http://localhost:8787
```

`wrangler dev` compiles the TypeScript itself (esbuild). There is no build step to run.

---

# Deploying to Cloudflare

Two supported paths. **The CLI is the primary one** — it is one command and it prints the live URL.
The dashboard path is there if you would rather it redeploy on every `git push`.

## Path A — deploy from your terminal (recommended)

You need Node.js installed. Everything else comes from `npx`.

### 1. Install the dependencies

```bash
cd /Users/radwanalbahrani/Desktop/Github/Repositories/failed_attempts/photo-widget-free/landing
npm install
```

This pulls in `wrangler` (Cloudflare's CLI) locally. If you would rather have it globally instead,
`npm install -g wrangler` works too — then drop the `npx` from the commands below.

### 2. Log in to Cloudflare

```bash
npx wrangler login
```

This opens your browser, asks you to sign in to Cloudflare and to authorise Wrangler, then hands the
token back to the terminal. You only do this once per machine.

Check it worked, and see which account you are on:

```bash
npx wrangler whoami
```

If your login has more than one account, Wrangler will ask which to use on the first deploy. You can
pin it by adding `"account_id": "<id>"` to `wrangler.jsonc`, or by setting `CLOUDFLARE_ACCOUNT_ID`.

### 3. Deploy

```bash
npx wrangler deploy
```

That single command uploads `src/index.ts` (compiled) and everything in `./public`, and creates the
Worker if it does not exist yet. It takes a few seconds.

**The first time you deploy to a brand-new account**, Cloudflare asks you to pick a `workers.dev`
subdomain for the account (a one-off prompt, in the terminal or the dashboard). That subdomain is
per **account**, not per Worker.

### 4. The URL

Wrangler prints the deployed URL at the end. It has the shape:

```
https://<worker-name>.<your-account-subdomain>.workers.dev
```

The worker name here is `frame-landing` (the `"name"` field in `wrangler.jsonc`), so if you deploy
to the same Cloudflare account that serves `share-page.kaset.workers.dev`, the account subdomain is
`kaset` and you will get:

```
https://frame-landing.kaset.workers.dev
https://frame-landing.kaset.workers.dev/privacy
```

**Trust the URL Wrangler prints over this guess** — the subdomain is whatever your account has.
To change the worker name, edit `"name"` in `wrangler.jsonc` and deploy again (that creates a *new*
Worker; delete the old one from the dashboard if you do not want both).

Use the `/privacy` URL as the app's **Privacy Policy URL** in App Store Connect, and the root URL as
the **Marketing URL**.

### 5. Redeploying

Change something, run `npx wrangler deploy` again. That is the whole loop. HTML is sent with
`cache-control: public, max-age=300`, so a changed page goes live within about five minutes for
someone who already visited (immediately for everyone else).

## Path B — deploy from the Cloudflare dashboard (auto-deploy on git push)

Use this if you want every push to the repo's default branch to redeploy the site. It requires the
repo to be on GitHub or GitLab, and `landing/` to be committed.

> Cloudflare changes this UI from time to time. The labels below are the ones in Cloudflare's
> current Workers Builds documentation. If a label does not match exactly, look for the nearest
> equivalent rather than assuming something is broken.

**For a Worker that does not exist yet:**

1. In the Cloudflare dashboard, go to **Workers & Pages**.
2. Select **Create application**.
3. Next to **Import a repository**, select **Get started**.
4. Connect your Git account (GitHub or GitLab) and authorise Cloudflare to see the repository, then
   pick `frame-photo-widget` from the list.
5. Configure the build. The important part for this repo is that **the Worker lives in a
   subdirectory**, so set the root directory / path to `landing`. Leave the build command empty —
   there is no build step — and let the deploy command stay `npx wrangler deploy`.
6. Select **Save and Deploy**.
7. When the build finishes, the Worker is live at its `workers.dev` subdomain. The URL is shown on
   the Worker's page in the dashboard (and under **Settings** → **Domains & Routes**).

**For a Worker you already created with `wrangler deploy` (Path A):**

1. **Workers & Pages** → select the `frame-landing` Worker.
2. **Settings** → **Builds**.
3. Select **Connect** and follow the prompts to pick the repository and build settings (again: root
   directory `landing`, no build command).
4. Push a commit — that triggers a build and deployment.

> The Worker's name in the dashboard must match the `"name"` field in `wrangler.jsonc`
> (`frame-landing`), or the build fails.

### Turning the workers.dev URL off

If you later attach a custom domain and want the `*.workers.dev` URL disabled, that setting lives on
the Worker's page under **Settings** → **Domains & Routes** (the `workers.dev` route can be
disabled there). Leave it on unless you have a reason not to — App Store Connect needs a working
privacy policy URL.

## Optional — a custom domain

Only possible if the domain is already a zone in the same Cloudflare account (i.e. its nameservers
point at Cloudflare). You cannot attach a domain Cloudflare does not host, and you cannot use a
hostname that already has a CNAME record.

1. **Workers & Pages** → select the `frame-landing` Worker.
2. **Settings** → **Domains & Routes** → **Add** → **Custom Domain**.
3. Enter the hostname, e.g. `frame.yourdomain.com`.
4. Select **Add Custom Domain**.

Cloudflare creates the DNS record and issues the certificate for you; it is usually live within a
minute or two. After that the site answers on both the custom domain and the `workers.dev` URL:

```
https://frame.yourdomain.com
https://frame.yourdomain.com/privacy
```

If you point the site at a custom domain **after** submitting to App Store Connect, remember to
update the Privacy Policy URL there too — or keep using the `workers.dev` URL, which does not expire.

## Deleting it

```bash
npx wrangler delete
```

Or **Workers & Pages** → the Worker → **Settings** → **Delete**.

## Keeping the policy in sync

`src/pages/privacy.ts` is the web rendering of `../PRIVACY.md`. They must say the same thing — if
one changes, change the other, including the "Last updated" date at the top.
