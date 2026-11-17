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
