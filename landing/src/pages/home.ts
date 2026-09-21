import { APP_STORE_URL, SUPPORT_URL, renderFooter, renderHeader, renderPage } from "./layout";

const homeStyles = `
.hero {
  position: relative;
  padding: 76px 0 0;
  text-align: center;
}
.hero::before {
  content: "";
  position: absolute;
  top: -320px;
  left: 50%;
  width: 1000px;
  height: 680px;
  max-width: 160vw;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(245, 179, 1, 0.16), rgba(245, 179, 1, 0) 72%);
  pointer-events: none;
}
.hero > * { position: relative; }

h1 {
  margin: 24px 0 0;
  font-size: clamp(40px, 6.6vw, 70px);
  line-height: 1.04;
  letter-spacing: -0.035em;
  font-weight: 700;
}
h1 em {
  font-style: normal;
  color: var(--accent);
}

.lede {
  margin: 22px auto 0;
  max-width: 34em;
  color: var(--muted);
  font-size: clamp(17px, 2.1vw, 19.5px);
  line-height: 1.62;
}

.cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 34px;
}
.cta-note {
  margin: 16px 0 0;
  color: var(--muted);
  font-size: 14.5px;
}

.shots {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin: 64px 0 0;
  padding: 0;
  list-style: none;
}

.shot { margin: 0; }

.shot-frame {
  position: relative;
  aspect-ratio: 9 / 19.5;
  border-radius: 26px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  background:
    linear-gradient(160deg, rgba(245, 179, 1, 0.18), rgba(245, 179, 1, 0.02) 55%),
    var(--surface-2);
  box-shadow: 0 30px 60px -38px rgba(0, 0, 0, 0.95);
}
.shot-frame img {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  border: 0;
}
.shot-frame::before {
  content: "Screenshot";
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.shot figcaption {
  margin-top: 14px;
  color: var(--muted);
  font-size: 14.5px;
  text-align: center;
}

section { padding: 86px 0 0; }

.band {
  margin-top: 86px;
  padding: 44px 40px;
  border-radius: 24px;
  border: 1px solid rgba(245, 179, 1, 0.26);
  background: linear-gradient(135deg, rgba(245, 179, 1, 0.12), rgba(245, 179, 1, 0.03));
}
.band h2 {
  margin: 0;
  font-size: clamp(25px, 3.4vw, 34px);
  line-height: 1.22;
  letter-spacing: -0.028em;
  font-weight: 700;
}
.band p {
  margin: 14px 0 0;
  max-width: 58ch;
  color: var(--muted);
  font-size: 16.5px;
}
.nos {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 26px 0 0;
  padding: 0;
  list-style: none;
}
.nos li {
  padding: 8px 15px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: rgba(7, 7, 8, 0.45);
  font-size: 14.5px;
  font-weight: 600;
}

h2.title {
  margin: 0;
  font-size: clamp(26px, 3.6vw, 36px);
  line-height: 1.2;
  letter-spacing: -0.03em;
  font-weight: 700;
}
.sub {
  margin: 14px 0 0;
  max-width: 58ch;
  color: var(--muted);
  font-size: 16.5px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 18px;
  margin-top: 38px;
}
.card {
  padding: 26px 24px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
}
.card h3 {
  margin: 0;
  font-size: 17.5px;
  font-weight: 650;
  letter-spacing: -0.012em;
}
.card p {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 15.5px;
  line-height: 1.6;
}
.glyph {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  margin-bottom: 18px;
  border-radius: 11px;
  border: 1px solid rgba(245, 179, 1, 0.28);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 15px;
  font-weight: 700;
}

.steps {
  counter-reset: step;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  margin: 38px 0 0;
  padding: 0;
}
.steps li {
  counter-increment: step;
  padding: 24px 22px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--muted);
  font-size: 15.5px;
}
.steps li::before {
  content: counter(step);
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-bottom: 14px;
  border-radius: 999px;
  background: var(--accent);
  color: #0b0b0d;
  font-size: 14px;
  font-weight: 700;
}
.steps b { color: var(--ink); font-weight: 650; }

.why {
  margin-top: 26px;
  max-width: 62ch;
  color: var(--muted);
  font-size: 16.5px;
}
.why strong { color: var(--ink); font-weight: 650; }

.close {
  margin-top: 86px;
  padding: 56px 40px;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: var(--surface);
  text-align: center;
}
.close h2 {
  margin: 0;
  font-size: clamp(26px, 3.6vw, 36px);
  line-height: 1.2;
  letter-spacing: -0.03em;
  font-weight: 700;
}
.close p {
  margin: 14px auto 0;
  max-width: 46ch;
  color: var(--muted);
  font-size: 16.5px;
}

@media (max-width: 860px) {
  .shots {
    grid-auto-flow: column;
    grid-auto-columns: 62vw;
    grid-template-columns: none;
    gap: 16px;
    margin-top: 48px;
    padding-bottom: 10px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .shots::-webkit-scrollbar { display: none; }
  .shot { scroll-snap-align: center; }
}

@media (max-width: 640px) {
  .hero { padding: 44px 0 0; }
  section { padding: 60px 0 0; }
  .band { margin-top: 60px; padding: 30px 22px; border-radius: 20px; }
  .close { margin-top: 60px; padding: 38px 22px; border-radius: 20px; }
  .shots { grid-auto-columns: 72vw; }
  .shot-frame { border-radius: 22px; }
  .cta .btn { width: 100%; }
}
`;

type Shot = { file: string; alt: string; caption: string };

const shots: Shot[] = [
  {
    file: "albums.png",
    alt: "The Frame album list on an iPhone, showing several photo albums",
    caption: "Albums for anything",
  },
  {
    file: "album.png",
    alt: "A single Frame album open, showing the photos inside it",
    caption: "As many photos as you like",
  },
  {
    file: "widgets.png",
    alt: "Frame widgets on an iPhone Home Screen in several sizes",
    caption: "Small to extra large",
  },
  {
    file: "settings.png",
    alt: "Frame widget settings, showing how often the photo changes",
    caption: "Changes on its own",
  },
];

function renderShots(): string {
  const items = shots
    .map(
      (shot) => `    <figure class="shot">
      <div class="shot-frame"><img src="/shots/${shot.file}" alt="${shot.alt}" loading="lazy" decoding="async"></div>
      <figcaption>${shot.caption}</figcaption>
    </figure>`
    )
    .join("\n");
  return `  <div class="shots">\n${items}\n  </div>`;
}

const homeBody = `${renderHeader()}
<main>
  <div class="wrap hero">
    <p class="eyebrow"><span class="dot" aria-hidden="true"></span>Free forever &mdash; no ads, no subscriptions</p>
    <h1>Your photos, on your <em>Home Screen</em>.</h1>
    <p class="lede">Frame is a photo widget for iPhone and iPad. Make albums of your own pictures, give every widget its own album, and let them change through the day. No account, no paywall, nothing leaves your device.</p>
    <div class="cta">
      <a class="btn" href="${APP_STORE_URL}" rel="noopener noreferrer">Download on the App Store</a>
      <a class="btn btn-ghost" href="#features">See what it does</a>
    </div>
    <p class="cta-note">iPhone and iPad &middot; iOS 18 or later &middot; English and Arabic</p>
  </div>

  <div class="wrap">
${renderShots()}

    <div class="band">
      <h2>Free forever. No ads, no subscriptions, no limits.</h2>
      <p>Frame exists because every good photo widget app eventually turns paid, or buries your pictures under banner ads. There is no paywall in this app and there never will be one. No trial that expires, no album cap, no watermark, no &ldquo;pro&rdquo; tier holding the good sizes hostage.</p>
      <ul class="nos">
        <li>No ads</li>
        <li>No subscriptions</li>
        <li>No in-app purchases</li>
        <li>No album or photo limits</li>
        <li>No account or sign-in</li>
        <li>No tracking</li>
        <li>No data collection</li>
      </ul>
    </div>

    <section id="features">
      <h2 class="title">What it does</h2>
      <p class="sub">Everything below is in the free app, because all of it is the free app.</p>
      <div class="cards">
        <div class="card">
          <div class="glyph" aria-hidden="true">A</div>
          <h3>As many albums as you like</h3>
          <p>Make an album for anything &mdash; a trip, a person, a pet, a year &mdash; and add as many photos as you want. Nothing is capped.</p>
        </div>
        <div class="card">
          <div class="glyph" aria-hidden="true">W</div>
          <h3>Every widget, its own album</h3>
          <p>Each widget you place picks its own album, so your family shots and your travel shots can sit on the same screen.</p>
        </div>
        <div class="card">
          <div class="glyph" aria-hidden="true">S</div>
          <h3>Four sizes</h3>
          <p>Small, medium, large and extra large. Put down as many as you like, in whatever mix fits your layout.</p>
        </div>
        <div class="card">
          <div class="glyph" aria-hidden="true">T</div>
          <h3>Photos change on their own</h3>
          <p>Choose how often a widget moves on: every five minutes, every fifteen, hourly, every six hours, or once a day. Shuffle them if you would rather be surprised.</p>
        </div>
        <div class="card">
          <div class="glyph" aria-hidden="true">D</div>
          <h3>Optional detail</h3>
          <p>Show the album name or the date over the photo, or keep it clean and let the picture speak.</p>
        </div>
        <div class="card">
          <div class="glyph" aria-hidden="true">P</div>
          <h3>Your photos stay yours</h3>
          <p>Frame has no account, no sign-in and no network code. Your photos are never uploaded anywhere, because there is nowhere for them to go.</p>
        </div>
      </div>
    </section>

    <section>
      <h2 class="title">Adding a widget</h2>
      <p class="sub">About twenty seconds, once.</p>
      <ol class="steps">
        <li>Touch and hold anywhere on your Home Screen.</li>
        <li>Tap <b>Edit</b>, then <b>Add Widget</b>, and search for <b>Frame</b>.</li>
        <li>Pick a size and place it.</li>
        <li>Touch and hold the placed widget, tap <b>Edit Widget</b>, and choose the album it should show.</li>
      </ol>
    </section>

    <section>
      <h2 class="title">Private by construction</h2>
      <p class="why">Frame reads only the photos you pick yourself through Apple&rsquo;s photo picker &mdash; it never asks for your whole library. When you add a photo to an album it keeps a resized copy in its own storage, so your widgets keep working even if you later delete the original from Photos. <strong>Those copies never leave your device.</strong> There is no analytics SDK, no advertising SDK, no crash reporter and no server to send anything to.</p>
      <p class="why"><a href="/privacy">Read the full privacy policy</a></p>
    </section>

    <div class="close">
      <h2>Put your own pictures on your own Home Screen.</h2>
      <p>It should not cost anything. It does not.</p>
      <div class="cta">
        <a class="btn" href="${APP_STORE_URL}" rel="noopener noreferrer">Download on the App Store</a>
        <a class="btn btn-ghost" href="${SUPPORT_URL}" rel="noopener noreferrer">Report an issue</a>
      </div>
    </div>
  </div>
</main>
${renderFooter()}`;

export const homeHtml = renderPage({
  title: "Frame — your photos on your Home Screen, free forever",
  description:
    "Frame is a free iOS photo widget. Unlimited albums, a different album per widget, and photos that change on their own. No ads, no subscriptions, no tracking, nothing leaves your device.",
  styles: homeStyles,
  body: homeBody,
});
