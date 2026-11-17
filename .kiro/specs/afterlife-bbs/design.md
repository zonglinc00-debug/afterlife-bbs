# Design — Afterlife BBS

Status: implemented 2026-11-17 (MVP). See `tasks.md` for what is done vs. open.

## 1. Idea in one paragraph

A dead technology (the BBS) is resurrected as a deliberate antidote to the
feed: a bulletin board for *one* small community, where slowness is a
feature. The Halloween "séance" theme is literal in the product — you
light candles instead of liking, the board "rests" at night, and asking
for help is a séance that summons neighbours who offered before.

## 2. Architecture

```
index.html      static shell: header, three views (home / board / post),
                post + reply forms, footer settings, dial-up overlay
styles.css      CRT theme, responsive layout, reduce-motion / high-contrast
app.js          ES module: exported pure logic + guarded browser app
data/seed.json  the ONLY place posts are defined (replaceable by content team)
manifest.json   PWA metadata (icon: local favicon.svg)
sw.js           cache-first service worker, same-origin static files only
tests/          node checks (no deps) + curl smoke test
```

- **No build step.** The browser loads `app.js` as a module directly.
- **No backend.** State is `localStorage`:
  - `afterlife-bbs-data-v1` — `{ version, boards, posts }`
  - `afterlife-bbs-lit-v1` — `{ postId: true }` for candles this browser lit
  - `afterlife-bbs-settings-v1` — display/sound preferences
- **Routing is hash-based** (`#/`, `#/board/<id>`, `#/post/<id>`) so every
  view is linkable and the back button works, with zero router code.
- **Seed loading:** on first visit the app `fetch("data/seed.json")`,
  validates it through the same `parseImportedState` used for imports, and
  stores it. After that, `localStorage` is the source of truth. A footer
  "Reset the board" clears the stored copy and re-seeds.

## 3. Key decisions

| Decision | Why | Alternative rejected |
|---|---|---|
| `localStorage`, not IndexedDB | Simpler, synchronous, enough for text posts; easier to export/import and to test in Node | IndexedDB: async API, more code, no benefit at this size |
| Pure functions exported from `app.js` | The same logic runs in the browser and in `node tests/checks.mjs` — one source of truth, no duplicated logic | Duplicating logic in tests (drifts) or a test-only bundle (build step) |
| Candles, not likes | A candle is finite, warm, and communal; it fits the séance theme and signals "I was here" rather than a score | A like counter invites ranking; a "kudos" button is the same thing renamed |
| Pagination (10/page) + end message | Hard-codes slowness into the product; the end-of-board line is the emotional payoff | Infinite scroll (banned by the brief); "load more" (same thing, slower) |
| Curfew 00:00–06:00 local time | Uses the visitor's own clock — no server, no timezone config; the board "sleeps" when its people do | A fixed UTC window (wrong for most visitors); a server-side flag (no server) |
| Séance matching is offers-only, one entry per author | A request should surface *people who already raised a hand*, not every post mentioning the word; dedup keeps the card short | Keyword search over all posts (noisy); ranking by candle count (reintroduces popularity) |
| Export = whole board JSON | Portability is the community's exit right; import uses the same validator as the seed loader | Per-post export (fiddly); cloud sync (paid, out of scope) |
| Service worker caches same-origin GET only | Offline works without ever touching a third party; nothing about the user leaves the device | Runtime caching of cross-origin requests (privacy + reliability risk) |
| System monospace + inline SVG only | Zero external assets: no font CDN, no image host, nothing to fail or track | Google Fonts / stock photos (external dependency, violates the brief) |

## 4. Data model

```jsonc
// state (localStorage + export file + seed file share this shape)
{ "version": 1,
  "boards": [{ "id": "town-square", "name": "Town Square",
               "tagline": "…", "icon": "🌳" }],
  "posts": [{ "id": "seed-ts-01", "boardId": "town-square",
              "title": "…", "body": "…", "author": "Marla T.",
              "createdAt": "2026-11-16T09:12:00",
              "candles": 12, "kind": null | "request" | "offer",
              "category": null | "fix" | "borrow" | "ride" | "company" | "skill",
              "replies": [{ "id": "…", "author": "…", "body": "…",
                            "createdAt": "…" }] }] }
```

- `kind`/`category` are only meaningful on Séance Circle (and Workshop
  offers); they are `null` elsewhere. The matcher only reads `kind:"offer"`.
- User posts get ids `u-<base36 time>-<random>`; seed ids are stable
  (`seed-<board>-<nn>`) so content and code can refer to them.
- Timestamps are ISO strings; sorting is `new Date(b) - new Date(a)`.

## 5. Rendering & UX

- Views are re-rendered from state on every route change; forms are plain
  HTML with `required`/`maxlength` plus JS validation that mirrors
  `validatePost` (same limits, same messages).
- All user content is escaped with `escapeHtml` before insertion; the only
  `innerHTML` writes use escaped values or static markup.
- Curfew is re-checked every 60s and on every route change, so a board
  left open overnight flips to "resting" by itself.
- Toasts (`role="status"`) announce post/reply/candle/export/import
  outcomes; form errors use `role="alert"`.
- The dial-up overlay is a `role="dialog"`; sound starts only from the
  "Dial in" button (a user gesture), so autoplay policies never block the
  page. "Enter quietly" runs the visual log with no audio.

## 6. Visual system

- Palette: `--bg #0a0f0a`, phosphor `--ink #9dffab`, bright `#d6ffd9`,
  amber `--amber #ffb000` (accents, links, candles), danger `#ff7a6b`.
- Scanlines: a fixed, pointer-events-none overlay (repeating gradient +
  vignette). High-contrast mode dims it and kills the text glow.
- Type: system monospace stack everywhere; ASCII-art sign is a `<pre>`.
- Layout: single column, max-width 880px, 44px minimum touch targets,
  wraps cleanly at 360px.
- Reduce-motion: kills the caret blink, transitions, and makes the
  dial-up log near-instant (`body.reduce-motion * { animation: none }`).

## 7. What is deliberately NOT built (MVP scope)

Accounts, moderation tools, search, direct messages, notifications,
multi-device sync, a daily digest. Each would need a server or an account
system; the MVP's promise is "works for one judge, in one browser, with
nothing else". See `tasks.md` for the post-MVP list.
