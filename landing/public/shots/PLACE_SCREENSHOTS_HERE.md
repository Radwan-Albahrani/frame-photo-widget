Drop the App Store screenshots in this folder, named exactly:

- `albums.png`   — the album list
- `album.png`    — one album open, photos inside
- `widgets.png`  — widgets on the Home Screen
- `settings.png` — widget settings / how often photos change

They are referenced from the landing page as `/shots/<name>.png`
(see `shots` in `../../src/pages/home.ts`). Tall portrait images —
the frame is `aspect-ratio: 9 / 19.5` and crops from the top.

To use different filenames or a different number of screenshots,
edit the `shots` array in `src/pages/home.ts`.
