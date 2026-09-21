export const APP_STORE_URL = "https://apps.apple.com/app/id6814411936";
export const SUPPORT_URL = "https://github.com/Radwan-Albahrani/frame-photo-widget/issues";

const baseStyles = `
:root {
  color-scheme: dark;
  --bg: #070708;
  --surface: #101013;
  --surface-2: #17171c;
  --border: rgba(250, 250, 250, 0.09);
  --border-strong: rgba(250, 250, 250, 0.16);
  --ink: #fafafa;
  --muted: #a1a1aa;
  --accent: #f5b301;
  --accent-soft: rgba(245, 179, 1, 0.14);
  --radius: 18px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Helvetica Neue", sans-serif;
}

* { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font);
  font-size: 17px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

::selection { background: var(--accent); color: #0b0b0d; }

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 6px;
}

.wrap {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 26px 0 12px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--ink);
  font-weight: 650;
  font-size: 17px;
  letter-spacing: -0.01em;
}
.brand:hover { text-decoration: none; }

.mark {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  border: 1.5px solid var(--accent);
  background: linear-gradient(150deg, rgba(245, 179, 1, 0.34), rgba(245, 179, 1, 0.04));
  position: relative;
  flex: none;
}
.mark::after {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 4px;
  border: 1.5px solid rgba(250, 250, 250, 0.55);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 22px;
  font-size: 15px;
  color: var(--muted);
}
.nav-links a { color: var(--muted); }
.nav-links a:hover { color: var(--ink); text-decoration: none; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 14px 24px;
  border-radius: 999px;
  background: var(--accent);
  color: #0b0b0d;
  font-weight: 650;
  font-size: 16px;
  letter-spacing: -0.01em;
  border: 1px solid var(--accent);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-shadow: 0 10px 30px -12px rgba(245, 179, 1, 0.65);
}
.btn:hover {
  text-decoration: none;
  background: #ffc628;
  transform: translateY(-1px);
}
.btn:active { transform: translateY(0); }

.btn-ghost {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--border-strong);
  box-shadow: none;
}
.btn-ghost:hover { background: rgba(250, 250, 250, 0.05); }

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 7px 14px 7px 11px;
  border-radius: 999px;
  border: 1px solid rgba(245, 179, 1, 0.3);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent);
  flex: none;
}

.foot {
  border-top: 1px solid var(--border);
  margin-top: 96px;
  padding: 34px 0 60px;
  color: var(--muted);
  font-size: 14.5px;
}
.foot-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 26px;
}
.foot-links {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
}
.foot a { color: var(--muted); }
.foot a:hover { color: var(--ink); text-decoration: none; }

@media (max-width: 640px) {
  body { font-size: 16.5px; }
  .wrap { padding: 0 18px; }
  .nav { padding: 20px 0 8px; }
  .nav-links { gap: 16px; font-size: 14.5px; }
  .foot { margin-top: 64px; }
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
`;

export function renderPage(options: {
  title: string;
  description: string;
  styles: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${options.title}</title>
<meta name="description" content="${options.description}">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#070708">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:title" content="${options.title}">
<meta property="og:description" content="${options.description}">
<meta property="og:site_name" content="Frame">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23070708'/%3E%3Crect x='6.5' y='6.5' width='19' height='19' rx='5' fill='none' stroke='%23f5b301' stroke-width='2.5'/%3E%3C/svg%3E">
<style>${baseStyles}${options.styles}</style>
</head>
<body>
${options.body}
</body>
</html>`;
}

export function renderHeader(): string {
  return `<header class="wrap nav">
  <a class="brand" href="/"><span class="mark" aria-hidden="true"></span>Frame</a>
  <nav class="nav-links">
    <a href="/privacy">Privacy</a>
    <a href="${SUPPORT_URL}" rel="noopener noreferrer">Support</a>
  </nav>
</header>`;
}

export function renderFooter(): string {
  return `<footer class="foot">
  <div class="wrap foot-row">
    <div>Frame &mdash; made by Radwan Albahrani. Free forever.</div>
    <div class="foot-links">
      <a href="/">Home</a>
      <a href="/privacy">Privacy policy</a>
      <a href="${SUPPORT_URL}" rel="noopener noreferrer">Support</a>
      <a href="${APP_STORE_URL}" rel="noopener noreferrer">App Store</a>
    </div>
  </div>
</footer>`;
}
