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

## 12. Red-team round 1 fixes (2026-11-17)

Why: an outside AI judge (Duck.ai, free, no login) reviewed the live demo
and found the pitch over-claimed in five places: the "community" is one
browser's data, Kiro's contribution was invisible, the daily digest was a
promise with no feature, the matcher was unexplained, and the two demo
boards read as one template. These requirements close those gaps honestly —
no backend is added; local-first is stated as the design, not hidden.

### REQ-29 — Today's digest is a real view
A digest page (`#/digest`, linked from the top nav and the home lede)
computes, from real data, what happened on the active board today: new
notes today, help requests with no reply yet, and today's notes that
received a candle. Nothing is hard-coded.
- **Accept:** `buildDigest()` property checks pass (today filtering by
  local date, unanswered requests, warmed notes); opening `#/digest` in a
  browser shows the three sections with real posts; with nothing new today
  the page says so plainly ("No new notes today yet") instead of showing
  stale or invented content.

### REQ-30 — Honest local-first disclosure
Every place the app could imply shared or server behaviour says, in plain
words, that it is local to this browser: the kit form and its button, the
candle note, the curfew banner and notes, the house rules, and the reset
confirmation (which names the community and says user notes are deleted).
- **Accept:** visual check asserts the kit copy contains "only in this
  browser"; the candle note and curfew banner contain "this browser";
  the reset confirm names the community and the deletion.

### REQ-31 — Built with Kiro, in the app
The home page has a "Built with Kiro" section naming the real artifacts
(specs, steering, hooks, custom agent, Kiro CLI 3.4.0) and tracing one
feature end to end: REQ-18 → `findHelpers()` in `app.js` → the match card
→ property checks in `tests/checks.mjs` → `.kiro/agents/seance-matcher.md`.
It states plainly that no MCP servers were used. Only claims verifiable
from the repo itself are made.
- **Accept:** the section renders on the home page; every file it names
  exists in the repo; the trace's requirement, function, and test all
  exist and pass.

### REQ-32 — Séance matching is explained in the UI
Both the Séance Circle help box and the match card state the matching
rule in one sentence: neighbours who posted an offer in the same
category, one entry per neighbour, newest offer first; requests never
match requests; all on-device.
- **Accept:** the match card text contains the rule; posting a request
  still surfaces the same helpers as before (REQ-18 checks pass).

### REQ-33 — Marlowe House reads as a building, not a copy
The two demo communities share the five-board template set (one kit, one
template — that is the product), but their words differ: every Marlowe
board tagline is building-flavoured (lifts, lobby, flat to flat), and the
seed posts are building topics. A full per-community board set (different
board ids per community) is out of scope: the seed checks enforce the
five template ids, and changing that is a rework, not a copy fix.
- **Accept:** `data/seed-marlowe.json` board taglines all differ from
  Hollow Creek's; the seed checks still pass; the limitation is recorded
  in `hidden_files/redteam-round1.md`.

## 13. Red-team round 2 fixes (2026-11-17)

Why: round 2 found the digest route dead in a returning visitor's
browser — the new index.html arrived but the old `app.js` was served from
the service worker cache, because `sw.js` never changed between releases
and was cache-first for everything. It also found the reset confirmation
invisible (native `confirm` is auto-dismissed by automation), "New today"
already empty a day after the seed dates, a blocking intro, and a
"1 notes" plural bug. These requirements close all of them.

### REQ-34 — Seed dates anchor to the visitor's first visit
Demo seed posts are fiction dated in the past. On first load of a demo
community, their dates shift by whole days so the newest seed post lands
on the visitor's local today, preserving the gaps between posts and
shifting replies with their posts. Stored copies and imports keep their
own dates; nothing is invented — the board never creates posts. One
exception: a stored demo board that is still pure seed content (every
post id is a seed id, no user post or reply) is re-anchored the same
way on load, so returning visitors from before this fix also get a
real "today"; any user content means the stored dates are left alone.
- **Accept:** `rebaseSeedDates()` property checks pass (newest lands
  today, gaps preserved, no shift when already today, replies shift too,
  input never mutated); loading Hollow Creek fresh shows real posts under
  "New today" in the digest no matter what calendar day it is.

### REQ-35 — Cache-safe service worker updates
The service worker must never serve a previous release's code to a
returning visitor while the new page is live: the cache name carries a
version and old caches are deleted on activate; `sw.js` is registered
with `updateViaCache: "none"` so update checks always fetch it fresh;
navigations and scripts are network-first (fresh when online, cache when
offline) and other same-origin assets stay cache-first; both seed files
are precached; when a new worker installs while a page is open, a banner
offers "Reload to get it". Every network fetch in the worker uses
`cache: "reload"`: a plain fetch still honours the browser HTTP cache,
and the update simulation caught the v2 cache itself being filled with
the previous release's `app.js` from a warm HTTP cache.
- **Accept:** a browser that installed the previous release, then reloads
  after the new release is served, shows the new version with no
  cache-buster (digest link present, `#/digest` renders); with the server
  stopped after a first visit, the page still loads from cache (REQ-21
  offline behaviour preserved); the update banner appears when a new
  worker installs and reloads the page.

### REQ-36 — Reset asks in the page and reports the result
Reset uses a visible in-page dialog, not `window.confirm`: it names the
community and states the cost (how many notes and replies will be
deleted), offers an explicit cancel, and after confirming shows a toast
with the restored count ("back to its N original notes").
- **Accept:** visual check drives the full chain — open, cancel (nothing
  changes), open, confirm (board resets, toast names the community and
  the restored count); no `window.confirm` remains in `app.js`.

### REQ-37 — The intro plays by itself and never gates the board
On a first visit the dial-up sequence starts on its own, quietly (sound
needs a user gesture), and closes by itself when the log finishes. Skip
is always visible, and the footer still replays the intro with sound.
- **Accept:** visual check loads the app in a fresh context, clicks
  nothing, and the overlay is gone within 8 seconds; Skip still closes
  it immediately when clicked.

### REQ-38 — Counts are pluralised correctly
Every count the user sees — board cards (including their accessible
names), page info, community list, import toast, reset dialog — reads
"1 note" / "2 notes", never "1 notes".
- **Accept:** `plural()` property checks pass; the visual check asserts a
  one-note board's card and accessible name say "1 note".

## 11. Tests

### REQ-24 — Automated checks
`tests/checks.mjs` runs with plain `node`, no npm packages, and covers:
post append (+1, content intact), candle idempotence, pagination partition,
curfew boundaries, export/import round-trip. `tests/smoke.sh` starts an
HTTP server and curls the homepage (200) plus key files.
- **Accept:** `node tests/checks.mjs` exits 0; `bash tests/smoke.sh`
  exits 0.
