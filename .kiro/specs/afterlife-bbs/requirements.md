# Requirements — Afterlife BBS (Kiroween 2026, Resurrection)

Status: living spec. Owner: build lane B. Last updated: 2026-11-17.
Conventions: each requirement has an ID, a statement, and acceptance criteria
that can be checked by hand or by `node tests/checks.mjs` / `bash tests/smoke.sh`.

## 1. Delivery & constraints

### REQ-01 — Static, zero-cost, zero-backend
The app is plain HTML/CSS/JS with no build step, no framework, no paid API,
no key, no server. It runs from a static host (GitHub Pages) and from
`python3 -m http.server` locally.
- **Accept:** `index.html`, `styles.css`, `app.js` exist at the repo root;
  no `package.json`, no `node_modules`, no network fetch except the two
  seed files (`data/seed.json`, `data/seed-marlowe.json`) and same-origin
  static files.

### REQ-02 — Fresh code
All code is written new on/after 2026-11-17. No code written before
2026-10-30 is reused.
- **Accept:** README discloses the creation date and the no-reuse statement;
  no vendored libraries exist in the tree.

### REQ-03 — Replaceable seed data
Seed content lives only in `data/seed.json` (Hollow Creek, 37 posts) and
`data/seed-marlowe.json` (The Marlowe House, 28 posts). The app loads them
with `fetch` and never hard-codes posts.
- **Accept:** each seed file holds 5 boards and ≥ 25 posts; deleting a
  file's posts (on a fresh browser profile) yields an empty board; the JS
  source contains no seed post titles.

### REQ-04 — Kiro project layout
The repo root contains `.kiro/` with `specs/afterlife-bbs/`
(requirements.md, design.md, tasks.md), `steering/` (product.md, tech.md),
`hooks/` (≥ 2 hook configs), and `agents/` (≥ 1 custom agent). `.kiro/`
is never added to `.gitignore`.
- **Accept:** all listed files exist; no `.gitignore` entry mentions `.kiro`.

## 2. Dial-up intro

### REQ-05 — Modem handshake intro
On first visit (per session) an intro overlay shows a modem handshake log
animation; it can be skipped at any time and replayed from the footer.
- **Accept:** overlay appears on a fresh session; Skip closes it immediately;
  Replay re-opens it.

### REQ-06 — Synthesised sound, no audio files
The handshake sound is synthesised with WebAudio. No audio files are loaded.
- **Accept:** no `.mp3/.wav/.ogg` in the tree; "Dial in" plays tones;
  "Enter quietly" plays nothing; a sound toggle exists and persists.

### REQ-07 — Motion & contrast preferences
Reduce-motion and high-contrast switches exist, apply immediately, and
persist across visits. `prefers-reduced-motion` is respected on first load.
- **Accept:** toggling each switch changes the page; reloading keeps the
  setting; with reduce-motion on, the intro animation is near-instant.

## 3. Boards, posts, replies

### REQ-08 — Five boards
Boards: Town Square, Séance Circle, The Library, Workshop, Lost & Found.
Each board page lists its posts newest first.
- **Accept:** home lists all five; each board page shows only its own posts,
  in reverse chronological order.

### REQ-09 — Post detail & replies
Opening a post shows its full text, author, time, candle count, and its
reply thread; replies can be added.
- **Accept:** reply appears immediately under the post and survives reload.

### REQ-10 — Post validation
Title (required, ≤ 120 chars) and body (required, ≤ 2000 chars) are
validated; name is optional (≤ 40 chars) and defaults to
"Anonymous Neighbour". Invalid input shows an inline error and posts nothing.
- **Accept:** empty title/body is rejected with a visible message; 121-char
  title / 2001-char body are rejected; valid posts appear instantly.

### REQ-11 — Persistence
Posts, replies, candle counts, and lit-state survive a reload via
`localStorage`.
- **Accept:** post something, reload, it is still there with the same count.

## 4. Candles

### REQ-12 — One candle per browser per post
"Light a candle" replaces a like. The same browser can light a given post
at most once; tapping again takes the candle back and the count returns.
- **Accept:** property checks in `tests/checks.mjs` pass: repeated toggling
  never moves the count by more than 1 from baseline, and toggling twice
  restores the original count.

## 5. Slow social rules

### REQ-13 — Pagination, no infinite scroll
Board lists show 10 posts per page with Newer/Older controls.
- **Accept:** property checks pass: pages partition the full list — no
  duplicates across pages, no post missing, `totalPages = ceil(n/10)`.

### REQ-14 — End-of-board message
On the last page the board displays: "You have read all the notes on this
board. Go for a walk."
- **Accept:** message appears exactly on the last page (and only when the
  board has posts); it does not appear on earlier pages.

### REQ-15 — Resting hours (curfew)
Between 00:00 and 06:00 local time, posting and replying are disabled: the
submit buttons read "The board is resting" and are disabled, with a short
explanation next to them. Reading stays fully available.
- **Accept:** property checks pass for the 0/6 boundaries (05:59 resting,
  06:00 open, 00:00 resting, 23:59 open); a banner explains the rest.

### REQ-16 — No engagement machinery
Nowhere on the site do follower counts, ads, ad slots, or algorithmic
recommendations appear.
- **Accept:** a text search of the built files finds no "follower",
  no ad-slot markup, and no "recommended for you" content.

## 6. Séance matching

### REQ-17 — Request categories
Posting in the Séance Circle asks whether the note is a request or an
offer, and a category: fix / borrow / ride / company / skill.
- **Accept:** the two fields appear only on the Séance Circle form.

### REQ-18 — Local matching
After a request is posted, the board shows a "These neighbours might help
you" card listing authors who previously *offered* help in the same
category (seed posts and user posts), one entry per author, linking to
their offer. Matching is purely local.
- **Accept:** posting a "fix" request surfaces Henry Marsh's tap-fix offer
  (seed data); posting a "company" request shows the card hidden and a
  toast saying no offers exist yet (no seed offer in that category).

## 7. Export / import

### REQ-19 — Export whole board as JSON
One click downloads the full board (boards + posts) as a JSON file.
- **Accept:** the downloaded file parses as JSON and contains the same
  boards and posts as shown on screen.

### REQ-20 — Import restores the board
Choosing a JSON file replaces the board with its contents; success and
failure are both reported to the user.
- **Accept:** export → reset → import round-trips to identical data
  (property check); importing invalid JSON or a wrongly shaped file shows
  an error and leaves the current board untouched.

## 8. PWA & polish

### REQ-21 — Installable & offline
`manifest.json` + `sw.js` make the app installable; the service worker
caches only this site's own static files.
- **Accept:** manifest validates (name, icons, start_url, display);
  `sw.js` registers without error on localhost; with the server stopped
  after a first visit, the page still loads from cache.

### REQ-22 — CRT aesthetic, usable
Phosphor green / amber palette, scanlines, ASCII-art sign, typewriter
tagline (switchable). Layout is tidy and usable on a 360px-wide phone.
- **Accept:** visual check at desktop and 360px widths; no horizontal
  overflow; no overlapping text.

### REQ-23 — Accessibility & language
The whole interface is English. Every interactive element has an accessible
name/label; status changes are announced via live regions.
- **Accept:** tab through the page: every control is reachable and named;
  candle button exposes `aria-pressed`; toasts use `role="status"`.

## 10. Communities & the kit (phase 2, 2026-11-17)

Why: the 2025 winners were templates with two applications, not single
apps. Afterlife BBS is a *kit* for opening a board, and it ships with two
demonstrations of the same kit.

### REQ-25 — Two demo communities
Hollow Creek (a small town, 37 seed posts) and The Marlowe House (one
apartment building, 48 flats, 28 seed posts) are both fully working and
switchable from the home page. Each keeps its own data; switching never
mixes or wipes the other board's posts.
- **Accept:** home lists both communities with real note counts; switching
  shows the other community's boards and posts; a post made on one board
  is invisible on the other; reloading keeps the last-open community.

### REQ-26 — Open your own board (the kit)
A form on the home page opens a new board in about five minutes: a name
(required, ≤ 60 chars), an optional one-line description, and a choice of
which of the five standard boards to include (all five by default, at
least one required). The new board opens with a welcome note from the
Caretaker on its first board.
- **Accept:** submitting with a name opens the new board immediately;
  empty name / over-long name / zero boards selected are rejected with a
  visible message and create nothing; a duplicate name is rejected;
  the welcome note is present; the board survives reload.

### REQ-27 — Export / import carries the community
Exports are v2 files: `{ version: 2, community: { id, name, tagline },
boards, posts }`. v1 files (no community key) still import. Importing a
file that belongs to another community opens that community instead of
overwriting the one on screen.
- **Accept:** property checks pass: v2 round-trip preserves community +
  boards + posts exactly; v1 round-trip still works with community null;
  importing Hollow Creek's export while on Marlowe House switches to
  Hollow Creek with its posts intact.

### REQ-28 — Seed files validated by checks
Both seed files are validated by `tests/checks.mjs`: 5 boards each, every
post's board exists, ids unique, séance posts have a valid kind/category,
every help category has at least one offer (so matching can demo), and no
post mentions the other community.
- **Accept:** `node tests/checks.mjs` exits 0, including the seed checks;
  `bash tests/smoke.sh` checks both seed files return 200.

## 11. Tests

### REQ-24 — Automated checks
`tests/checks.mjs` runs with plain `node`, no npm packages, and covers:
post append (+1, content intact), candle idempotence, pagination partition,
curfew boundaries, export/import round-trip. `tests/smoke.sh` starts an
HTTP server and curls the homepage (200) plus key files.
- **Accept:** `node tests/checks.mjs` exits 0; `bash tests/smoke.sh`
  exits 0.
