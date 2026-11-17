# Technical rules — Afterlife BBS

Steering for how code is written in this project.

## Stack (non-negotiable)
- Vanilla HTML/CSS/JS. No framework, no build step, no bundler.
- No npm dependencies. No `package.json`. `node` is used only to run
  `tests/checks.mjs`.
- No external assets: no fonts, images, or scripts from a CDN. System
  fonts and inline SVG only. No audio files — WebAudio synthesis only.
- No backend, no paid APIs, no keys, no secrets anywhere in the tree.

## Files
- Entry points at the root: `index.html`, `styles.css`, `app.js`.
- `app.js` is an ES module. Pure logic is exported at the top so Node
  tests can import it; all DOM/localStorage/WebAudio work is behind the
  `typeof document !== 'undefined'` guard at the bottom.
- Posts live ONLY in `data/seed.json`. Never hard-code a post into JS.
  The seed file is the content team's replaceable file — keep its shape
  (`{ version, boards, posts }`) stable.
- `.kiro/` must exist at the repo root and must never be gitignored.

## Data & state
- `localStorage` keys: `afterlife-bbs-data-v1` (boards + posts),
  `afterlife-bbs-lit-v1` (candles lit by this browser),
  `afterlife-bbs-settings-v1` (display/sound prefs).
- Export/import and seed loading all go through `parseImportedState` —
  one validator, three callers. Never parse board JSON anywhere else.
- Never mutate state in place inside the pure functions; return fresh
  objects (`toggleCandle`, `addReplyToPost`, `paginate`, `sortPostsDesc`).

## Quality gates
- After any change to `app.js` or `data/seed.json`, run
  `node tests/checks.mjs` — it must exit 0.
- After any change to the served files, run `bash tests/smoke.sh`.
- New behaviour gets a requirement in
  `.kiro/specs/afterlife-bbs/requirements.md` (with acceptance criteria)
  and a task line in `tasks.md` — spec first, code second.
- Before any commit, update `tasks.md` checkboxes to match reality.
  (There is a hook for this — see `.kiro/hooks/`.)

## Accessibility & i18n
- Interface language is English throughout.
- Every interactive element has an accessible name. Status changes use
  live regions (`role="status"` / `role="alert"`).
- Respect `prefers-reduced-motion` on first load; keep the reduce-motion
  and high-contrast switches working.
- Escape all user content with `escapeHtml` before inserting into the DOM.

## Security / privacy
- No user data leaves the browser. The service worker caches same-origin
  static files only and never caches request bodies or cross-origin traffic.
- No credentials, tokens, or personal data in the repo, in logs, or in
  test fixtures.
