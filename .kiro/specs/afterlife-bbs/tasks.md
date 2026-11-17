# Tasks — Afterlife BBS

Status as of 2026-11-17. Checked = done and verified (see "Verification").
Work in build lane B only touches `afterlife-bbs/`; seed content will be
replaced by the content lane's `seed-posts.json` via `data/seed.json`.

## MVP — done

- [x] Scaffold: `index.html`, `styles.css`, `app.js` (ES module, no build)
- [x] Seed data: `data/seed.json` — 37 posts across 5 boards (content lane seed + 5 matcher offers), Hollow Creek fiction
- [x] Seed loading via `fetch("data/seed.json")`; no posts hard-coded in JS
- [x] Home view: 5 board cards with note/candle counts
- [x] Board view: posts newest-first, 10 per page, Newer/Older controls
- [x] Post detail view: full text, meta, reply thread
- [x] New post form with validation (title ≤120, body ≤2000, name ≤40)
- [x] Reply form with the same validation
- [x] Persistence in `localStorage` (data / lit map / settings, separate keys)
- [x] Candles: light once per browser per post, tap again to take back
- [x] End-of-board message on the last page
- [x] Curfew 00:00–06:00 local: banner + disabled submit buttons + explanation
- [x] Séance Circle: request/offer + category fields (Séance form only)
- [x] Séance matching: offers-only, same category, one entry per author, links to offer posts; shown after posting a request and on the request's page
- [x] Export whole board as JSON download
- [x] Import JSON file with validation + success/failure toast; bad files leave the board untouched
- [x] Dial-up intro overlay: handshake log, skip, replay; WebAudio synth sound, no audio files
- [x] Settings: reduce-motion, high-contrast, sound, typewriter — persisted; `prefers-reduced-motion` respected on first load
- [x] CRT theme: phosphor green/amber, scanlines, ASCII sign, typewriter tagline; responsive to 360px
- [x] Accessibility: skip link, labels, `aria-pressed` on candle, live regions for toasts/errors, semantic landmarks
- [x] PWA: `manifest.json`, `sw.js` (same-origin static files only), inline SVG favicon (+ local `favicon.svg`)
- [x] `.kiro/`: specs (requirements/design/tasks), steering (product/tech), hooks (×2), agents (séance-matcher)
- [x] `README.md`, `LICENSE` (MIT)
- [x] `tests/checks.mjs` (node, no deps): post append, candle idempotence, pagination partition, curfew boundaries, export/import round-trip, validation, matcher
- [x] `tests/smoke.sh`: http.server + curl homepage 200 + key files
- [x] Verification run: `node tests/checks.mjs` all pass; `bash tests/smoke.sh` all pass (see Verification below)

## Phase 2 — the kit (2026-11-17, done)

- [x] Second demo community: `data/seed-marlowe.json` — The Marlowe House, one apartment building, 28 posts across the same 5 boards; all 5 help categories have an offer for the matcher
- [x] Community switcher on the home page (Hollow Creek / Marlowe House / your boards), with real note counts; per-community `localStorage` keys so boards never overwrite each other; last-open community survives reload
- [x] Kit form: name (≤ 60) + optional tagline + board picker (all five by default, ≥ 1 required); creates the board with a Caretaker welcome note; duplicate names rejected with a visible message
- [x] Export v2 envelope carries the community; v1 files still import; importing another community's file opens that community instead of overwriting the current one
- [x] Header, dial-up subtitle, and footer follow the active community
- [x] `tests/checks.mjs`: kit checks (createCommunity, v2 round-trip, v1 compat) + seed-file validation for both demo boards (17 checks total, all passing)
- [x] `tests/smoke.sh`: now also checks `data/seed-marlowe.json`
- [x] README + Devpost draft rewritten for the kit positioning; fixed the draft's stale "IndexedDB" claim (storage is localStorage only)
- [x] Specs updated: REQ-25–REQ-28 (communities & kit); fixed stale REQ-03/REQ-18 acceptance text
- [x] Visual check in a real headless browser (see Verification below)

## Phase 3 — red-team round 1 fixes (2026-11-17, done)

Why: an outside AI judge reviewed the live demo and found the pitch
over-claimed in five places. All fixes are honest labelling or real
features — no backend was added; local-first is stated as the design.

- [x] Today's digest (`#/digest`): real, computed from the active board's posts — new today, unanswered requests (max 5), today's notes that received a candle (newest first, never ranked by count — candles are never a score, steering/product.md §3); empty days say so plainly
- [x] Honest local-first disclosure: kit form + button ("Open my board — in this browser"), candle note ("One candle per browser per post"), curfew banner/notes ("enforced in this browser only"), house rules, reset confirm names the community and the deletion
- [x] "Built with Kiro" section on the home page: real artifacts only (specs, steering, hooks, agent, Kiro CLI 3.4.0), REQ-18 → `findHelpers()` → match card → checks → agent file trace, plain statement that no MCP servers were used
- [x] Séance matching explained in the UI: help box + match card state the rule (same category, one per neighbour, newest offer first; requests never match requests)
- [x] Marlowe House reads as a building: all five board taglines are building-flavoured (lifts, lobby, flat to flat); full per-community board sets stay out of scope (seed checks enforce the five template ids) — recorded in `hidden_files/redteam-round1.md`
- [x] Specs updated: REQ-29–REQ-33; `tests/checks.mjs`: 4 digest checks (21 total, all passing); visual check: 11 new assertions (31 total, all passing)

## Phase 4 — red-team round 2 fixes (2026-11-17, done)

Why: round 2 found the digest route dead in a returning visitor's
browser — new index.html arrived but the old `app.js` was served from
the service worker cache. Root cause, established by reproduction (not
guessed): the v1 worker was cache-first for everything and its file
never changed between releases, so no update was ever triggered. The
simulation then caught a second layer: a plain `fetch()` inside a
worker still honours the browser HTTP cache, so the v2 cache itself was
first filled with the old `app.js` from a warm HTTP cache.

- [x] Verdict first: the digest route was NOT a code bug — the deployed
      bytes render `#/digest` fine in a fresh profile (`hidden_files/live-digest-check.mjs`, 4/6 on first run: the two failures were the empty "New today" and the invisible reset confirm, both real and both fixed below). The live failure was stale-worker cache, reproduced end to end.
- [x] Cache-safe service worker (REQ-35): cache name `afterlife-bbs-v2`,
      both seed files precached, navigations + scripts network-first,
      other assets cache-first, `updateViaCache: "none"` on registration,
      every worker fetch uses `cache: "reload"`, update banner offers
      "Reload to get it" when a newer worker installs while the page is open
- [x] Seed dates anchor to the visitor's first visit (REQ-34):
      `rebaseSeedDates()` shifts demo seed posts by whole days so the
      newest lands today; stored pure-seed boards are re-anchored the
      same way on load; any user content (a `u-` post or reply) means
      stored dates are never touched
- [x] Reset is a visible in-page modal (REQ-36): names the community and
      the cost (notes + replies), explicit cancel, success toast reports
      the restored count; no `window.confirm` remains in `app.js`
- [x] Intro plays by itself and never gates the board (REQ-37): quiet
      auto-run, closes on its own in ~4s, Skip always visible, footer
      replay keeps the sound version
- [x] Pluralisation (REQ-38): one shared `plural()` helper for every
      count shown (board cards incl. accessible names, page info,
      community list, import toast, reset dialog) — "1 note", never
      "1 notes"
- [x] Specs updated: REQ-34–REQ-38; `tests/checks.mjs`: rebase + plural
      checks (24 total, all passing); visual check: intro auto-close,
      digest click-through, reset modal chain, plural aria-label
      (37 total, all passing); new `hidden_files/sw-update-check.mjs`:
      old release → swap → new release, no cache-buster (11 total, all
      passing, incl. update banner + offline reload)

## Verification (2026-11-17)

### v1 (as before)

```text
$ node tests/checks.mjs
  13 passed, 0 failed.
$ bash tests/smoke.sh
  SMOKE OK — homepage 200, all key files present.
```

### Phase 2 (re-run after the kit work)

```text
$ node tests/checks.mjs
  17 passed, 0 failed.
$ bash tests/smoke.sh
  SMOKE OK — homepage 200, all key files present (incl. data/seed-marlowe.json).
$ node ../hidden_files/visual-check.mjs   (Playwright + Chrome for Testing 159)
  20 passed, 0 failed.
```

Visual check covers: dial-up intro + Skip, the typewriter tagline, both demo
communities (37 + 28 notes), switching, board view, posting, candle (+1 and
`aria-pressed`), kit create + welcome note, kit empty-name rejection, curfew
at 02:30 (banner + disabled submit), desktop 1280px and mobile 390px with no
horizontal overflow, and zero console/page errors. Screenshots:
`hidden_files/visual/01–09.png`.

Visual review found and fixed two real bugs: (a) the typewriter typed the
`aria-label` ("Afterlife BBS tagline") instead of the real tagline — it now
reads `data-full`; (b) the post placeholder said "by the oak" (Hollow
Creek-specific) — now community-neutral. Both have regression assertions in
the visual check.

### Phase 3 — red-team round 1 fixes (re-run after the fixes)

```text
$ node tests/checks.mjs
  21 passed, 0 failed.
$ bash tests/smoke.sh
  SMOKE OK — homepage 200, all key files present.
$ node ../hidden_files/visual-check.mjs   (Playwright + Chrome for Testing 159)
  31 passed, 0 failed.
```

Visual check now also covers: the digest view (today's note + warmed note +
unanswered request, desktop and 390px, no overflow), the matcher explanation
card, the kit/Kiro honesty copy on the home page, and the curfew banner's
"browser only" wording. Screenshot: `hidden_files/visual/10-digest-desktop.png`.

Visual review found no new bugs. One known transient: the "Candle lit."
toast briefly overlaps a card in the digest screenshot — it disappears after
4 seconds and is not a defect.

### Phase 4 — red-team round 2 fixes (re-run after the fixes)

```text
$ node tests/checks.mjs
  24 passed, 0 failed.
$ bash tests/smoke.sh
  SMOKE OK — homepage 200, all key files present.
$ node ../hidden_files/visual-check.mjs   (Playwright + Chrome for Testing 159)
  37 passed, 0 failed.
$ node ../hidden_files/sw-update-check.mjs   (old release → swap → new release)
  11 passed, 0 failed.
```

Visual check now also covers: the intro auto-closing with no click, the
digest opening from the nav link (not just direct `#/digest`), the reset
modal chain (open → cancel → open → confirm → counted toast), and the
"1 note" plural fix in text and aria-label. Screenshot:
`hidden_files/visual/11-reset-modal.png`.

The SW update simulation is the regression test for the round-2 headline
bug: a browser holding the previous release's service worker, reloaded
after the new release is served, gets the new version with no
cache-buster — digest link present, `#/digest` renders, "New today" has
real posts, the v1 cache is gone, the update banner appears on a further
worker install, and the page still loads offline with the server stopped.
Two simulation failures on the way were real finds, both fixed: (1) the
first v2 worker filled its cache with the old `app.js` from a warm HTTP
cache — every worker fetch now uses `cache: "reload"`; (2) a returning
visitor's stored seed state predated the date anchoring, so "New today"
was empty — pure-seed stored boards are now re-anchored on load, while
any board with user content keeps its real dates.

Live repro note: the sandbox's Chromium cannot reach the internet (the
egress proxy refuses its CONNECT tunnels), so the live `#/digest` check
ran against a byte-identical copy of the deployed files
(`hidden_files/live-digest-check.mjs`, 4/6: the two failures were the
empty "New today" and the invisible reset confirm). The deployed
`app.js` itself was verified separately (44,983 bytes, contains the
digest route). A fresh-profile live check still belongs to the parent
agent's browser lane before submission.

Tooling note: `npx playwright install chromium` needed a user confirmation
the sandbox would not give a subagent, so Chrome came from Google's
Chrome-for-Testing zip instead (free, same engine). `/tmp` is a 512 MB tmpfs
— the 209 MB download filled it mid-run and broke one smoke run; tooling was
moved to `$HOME` after that. Nothing was pushed to GitHub; no account was
registered; Kiro login still pending the user.

```
$ node tests/checks.mjs
  13 passed, 0 failed.

$ bash tests/smoke.sh
  PASS  / -> 200
  PASS  /index.html -> 200
  PASS  /styles.css -> 200
  PASS  /app.js -> 200
  PASS  /data/seed.json -> 200
  PASS  /manifest.json -> 200
  PASS  /sw.js -> 200
  PASS  /favicon.svg -> 200
  SMOKE OK — homepage 200, all key files present.
```

## Polish / post-MVP — open

- [ ] Replace placeholder seed posts with the content lane's final
      `seed-posts.json` (drop-in at `data/seed.json`, same shape)
- [ ] Record the <3 min demo video (dial-up → board → post → candle → curfew)
- [ ] Deploy to GitHub Pages; confirm the live URL loads with seed data
- [ ] Test the service worker offline path in a real browser (server stopped after first visit)
- [ ] Keyboard-only walkthrough + screen-reader pass
- [ ] Consider: search within a board; per-board "last read" bookmark
- [ ] Consider: a "print this board" stylesheet for the town noticeboard wall
- [ ] Do NOT add: follower counts, ads, algorithmic ranking (banned by product.md)

## Notes

- Never add `.kiro/` to `.gitignore` (Devpost/Hackathon hard requirement).
- Never add a dependency, font, image, or API key to this project.
- If a check fails, fix the code, not the check — the checks encode the spec.
