import { SUPPORT_URL, renderFooter, renderHeader, renderPage } from "./layout";

const privacyStyles = `
.doc {
  max-width: 720px;
  margin: 0 auto;
  padding: 60px 0 0;
}

.doc h1 {
  margin: 20px 0 0;
  font-size: clamp(34px, 5.4vw, 50px);
  line-height: 1.08;
  letter-spacing: -0.033em;
  font-weight: 700;
}

.stamp {
  margin: 16px 0 0;
  color: var(--muted);
  font-size: 15px;
}

.summary {
  margin: 34px 0 0;
  padding: 26px 26px;
  border-radius: var(--radius);
  border: 1px solid rgba(245, 179, 1, 0.26);
  background: linear-gradient(135deg, rgba(245, 179, 1, 0.11), rgba(245, 179, 1, 0.03));
  font-size: 17.5px;
  line-height: 1.6;
}
.summary strong { font-weight: 650; }

.doc h2 {
  margin: 52px 0 0;
  font-size: 22px;
  line-height: 1.3;
  letter-spacing: -0.02em;
  font-weight: 650;
}

.doc p {
  margin: 14px 0 0;
  color: var(--muted);
  font-size: 16.5px;
  line-height: 1.68;
}

.doc ul {
  margin: 16px 0 0;
  padding: 0 0 0 22px;
  color: var(--muted);
  font-size: 16.5px;
  line-height: 1.68;
}
.doc li { margin-top: 8px; }
.doc li::marker { color: var(--accent); }

.doc strong { color: var(--ink); font-weight: 650; }

.doc .back {
  display: inline-flex;
  margin-top: 48px;
  color: var(--muted);
  font-size: 15px;
}
.doc .back:hover { color: var(--ink); text-decoration: none; }

@media (max-width: 640px) {
  .doc { padding: 36px 0 0; }
  .doc h2 { margin-top: 40px; font-size: 20px; }
  .summary { padding: 20px 20px; font-size: 16.5px; }
}
`;

const privacyBody = `${renderHeader()}
<main class="wrap">
  <article class="doc">
    <p class="eyebrow"><span class="dot" aria-hidden="true"></span>No data collected. None.</p>
    <h1>Privacy Policy for Frame</h1>
    <p class="stamp">Last updated: 21 September 2026</p>

    <p class="summary"><strong>Frame does not collect any data about you.</strong> That is the entire policy, but here are the specifics.</p>

    <h2>What Frame collects</h2>
    <p>Nothing. Frame has no account system, no analytics, no advertising SDK, no crash reporting service and no network code. There is no server to send anything to.</p>

    <h2>Your photos</h2>
    <p>When you add photos to an album, Frame makes a resized copy and stores it in its own storage on your device. It does this so your widgets keep working even if you later delete the original from Photos.</p>
    <ul>
      <li>Those copies <strong>never leave your device</strong>.</li>
      <li>They are not uploaded, backed up to any service run by us, or shared with anyone.</li>
      <li>Deleting a photo from an album deletes Frame&rsquo;s copy. Deleting the app removes all of them.</li>
    </ul>
    <p>Frame reads only the photos you pick yourself through Apple&rsquo;s photo picker. It never scans or reads the rest of your photo library, and it does not ask for full library access.</p>

    <h2>What is stored on your device</h2>
    <ul>
      <li>The albums you create and their names</li>
      <li>Resized copies of the photos you added</li>
      <li>Your settings (how often widgets change photos, and whether to show the album name or date)</li>
    </ul>
    <p>All of it lives in Frame&rsquo;s own storage and its App Group container, which is shared only between the Frame app and the Frame widget on the same device.</p>

    <h2>Third parties</h2>
    <p>Frame contains no third-party analytics, advertising or tracking SDKs. Nothing about your usage is shared with anyone, because nothing about your usage is recorded.</p>

    <h2>Children</h2>
    <p>Frame is safe for all ages. It collects no data from anyone, including children.</p>

    <h2>Changes</h2>
    <p>If this policy ever changes it will be updated here, with the date at the top. Frame will not start collecting data in a future version.</p>

    <h2>Contact</h2>
    <p>Questions or concerns: <a href="${SUPPORT_URL}" rel="noopener noreferrer">${SUPPORT_URL}</a></p>

    <a class="back" href="/">&larr; Back to Frame</a>
  </article>
</main>
${renderFooter()}`;

export const privacyHtml = renderPage({
  title: "Privacy Policy — Frame",
  description:
    "Frame collects no data about you. No analytics, no ads, no tracking, no network code. Your photos never leave your device.",
  styles: privacyStyles,
  body: privacyBody,
});
