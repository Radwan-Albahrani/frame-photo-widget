import { renderFooter, renderHeader, renderPage } from "./layout";

const notFoundStyles = `
.empty {
  max-width: 560px;
  margin: 0 auto;
  padding: 110px 0 0;
  text-align: center;
}
.empty .code {
  color: var(--accent);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.empty h1 {
  margin: 18px 0 0;
  font-size: clamp(30px, 5vw, 44px);
  line-height: 1.12;
  letter-spacing: -0.03em;
  font-weight: 700;
}
.empty p {
  margin: 16px 0 0;
  color: var(--muted);
  font-size: 16.5px;
}
.empty .links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  margin-top: 32px;
}

@media (max-width: 640px) {
  .empty { padding: 64px 0 0; }
}
`;

const notFoundBody = `${renderHeader()}
<main class="wrap">
  <div class="empty">
    <p class="code">404</p>
    <h1>There is nothing here.</h1>
    <p>The page you were looking for does not exist on this site.</p>
    <div class="links">
      <a class="btn" href="/">Go to Frame</a>
      <a class="btn btn-ghost" href="/privacy">Privacy policy</a>
    </div>
  </div>
</main>
${renderFooter()}`;

export const notFoundHtml = renderPage({
  title: "Not found — Frame",
  description: "That page does not exist.",
  styles: notFoundStyles,
  body: notFoundBody,
});
