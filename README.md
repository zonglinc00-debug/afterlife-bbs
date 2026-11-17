# Afterlife BBS — a kit for opening a slow-social board

> The bulletin board system is dead. Long live the bulletin board.

**Afterlife BBS** resurrects the dead BBS as a *slow social* community board kit: any apartment building, dorm, club, class, or small town can open its own board in about five minutes. No algorithms, no infinite scroll, no ads, no follower counts. Just neighbours, pinned notes, and candles.

Built for **Kiroween 2026** (Resurrection category). Deadline: 2026-12-04 14:00 PT.

## What it is

Two demo boards ship with the kit, both fully working — pick one, or open your own:

| Demo board | What it is | Seed notes |
|---|---|---|
| 🏡 **Hollow Creek** | A small fictional town | 37 posts across 5 boards |
| 🏢 **The Marlowe House** | One apartment building, 48 flats | 28 posts across 5 boards |

Every board — demo or yours — has the same five boards inside it:

| Board | What lives there |
|---|---|
| 🌳 Town Square | News, notices, neighbourly chatter |
| 🕯️ Séance Circle | Ask for help / offer a hand |
| 📚 The Library | Books, films, songs worth your evening |
| 🔧 Workshop | Trade skills, tools, know-how |
| 🧤 Lost & Found | Lost something? Found something? |

## Features (all real, all in the browser)

- **Open your own board** — pick a name, pick which of the five boards to include, and your board is open with a welcome note from the Caretaker. Your board lives in your browser; share it with one exported JSON file, and anyone can open it with Import.
- **Two demo boards** — Hollow Creek (a small town) and The Marlowe House (one apartment building), switchable from the home page, each with its own seed notes.
- **Dial-up intro** — modem handshake animation with WebAudio-synthesised sound (no audio files). Skippable, replayable from the footer.
- **Boards, posts, replies** — newest first, always. Posts and replies persist in `localStorage`.
- **Light a candle** — a candle instead of a like. One per neighbour per post, per browser; tap again to take it back.
- **Slow social, enforced by the product** — 10 posts per page, no infinite scroll; when you reach the end the board tells you: *"You have read all the notes on this board. Go for a walk."*
- **Resting hours** — from **00:00–06:00 local time** the board rests: posting and replying are disabled (the button says so, and explains why), reading still works. The rest is a house rule enforced in this browser only — a shared norm, not a server lock.
- **Today's digest** — one page, once a day: new notes today, help requests with no reply yet, and today's notes that received a candle (newest first, never ranked). Empty days say so plainly instead of inventing content.
- **Séance matching** — post a help request in the Séance Circle, pick a category (fix / borrow / ride / company / skill), and the board matches you on-device with neighbours who previously offered that kind of help. Pure frontend, nothing leaves the browser.
- **Export / import** — download the whole board as one JSON file; import it back (validated, with clear success/failure messages). Your community can pack up and leave any time.
- **PWA** — installable, works offline. The service worker caches only this site's own static files.
- **CRT aesthetic** — phosphor green / amber, scanlines, ASCII-art sign, typewriter tagline. Reduce-motion and high-contrast switches, persisted. Fully keyboard usable, labelled controls, English throughout.

## Run it locally

No build step, no dependencies, no accounts, no keys.

```bash
cd afterlife-bbs
python3 -m http.server 8000
# open http://localhost:8000
```

> The seed posts load from `data/seed.json` over HTTP, so open it through a local server rather than `file://`. (That is also how GitHub Pages serves it.)

### Run the checks

```bash
node tests/checks.mjs     # property-style logic checks, no npm packages
bash tests/smoke.sh       # starts a server, curls the homepage and key files
```

## How it works

- **Stack:** vanilla HTML/CSS/JS. No framework, no build, no backend, no paid APIs.
- **Data:** `localStorage`. Each community has its own key (`afterlife-bbs-data-v1:<community-id>`), plus `afterlife-bbs-lit-v1` (which posts this browser has lit), `afterlife-bbs-settings-v1` (display/sound preferences), `afterlife-bbs-community-v1` (which board is open), and `afterlife-bbs-user-communities-v1` (boards opened with the kit). First visit seeds from the demo seed files.
- **Seed content:** `data/seed.json` (Hollow Creek, 37 posts) and `data/seed-marlowe.json` (The Marlowe House, 28 posts) are the replaceable content files — 65 posts in total across the two demo boards. The app never hard-codes posts; the content team can swap a file and the app picks it up on a fresh browser. (Reset to the seed any time from the footer; reset affects only the board you are on.) Demo seed dates are fiction: on first visit they are anchored so the newest seed post lands on your local today, keeping "New today" in the digest real (see REQ-34). A stored demo board that is still pure seed content is re-anchored the same way; any board you have posted on keeps its real dates.
- **Updates:** the service worker is cache-safe by design (see REQ-35): navigations and scripts are fetched fresh when online, and when a newer version installs while the page is open a banner offers "Reload to get it". Returning visitors always reach the current release without a cache-buster.
- **Kiro:** the project is spec-driven. See `.kiro/specs/afterlife-bbs/` (requirements, design, tasks), `.kiro/steering/` (product principles, tech rules), `.kiro/hooks/` (logic checks on save, smoke test before commit), and `.kiro/agents/` (the séance-matcher helper agent). One feature traced end to end: the Séance matcher — REQ-18 → `findHelpers()` in `app.js` → the "These neighbours might help you" card → property checks in `tests/checks.mjs` → `.kiro/agents/seance-matcher.md`. Kiro CLI 3.4.0 is installed on the build machine. No MCP servers were used: the app needs no external data, so there was nothing to connect. Storage is `localStorage` only — no IndexedDB, no backend.
- **Built with Kiro, in the app:** the home page has a "Built with Kiro" section with the same trace, so judges can see the Kiro work without opening the repo.

## Known limitations

- **One device, one board (per community).** Data lives in the browser's `localStorage`; there is no server, so two neighbours on two devices do not see each other's posts unless one exports a JSON file and the other imports it. That is the design, not an oversight — but it is the honest limit of a zero-backend board. Exported files carry the community name, so importing someone else's file opens their board instead of overwriting yours.
- **Candles are per-browser, not per-person.** "One candle per neighbour" is enforced per browser via `localStorage`; clearing site data resets it. The UI says this next to the candle button.
- **One template board set.** Both demo boards (and every board opened with the kit) share the same five boards; only the words differ per community (Marlowe's board taglines are building-flavoured). Different board sets per community would need a rework of the seed checks, so that stays out of scope.
- **Seed loads over HTTP.** Opening `index.html` directly with `file://` fails the `fetch("data/seed.json")` call; use the local server (or GitHub Pages).
- **Service worker needs HTTP(S).** Offline mode works on `localhost` and on GitHub Pages, not on `file://`.
- **No accounts, no moderation tools, no search.** Deliberately out of scope for the MVP; a shared board would need those before real deployment.
- **Dial-up sound needs a user gesture** in some browsers; the "Dial in" button provides it. "Enter quietly" skips sound entirely.

## Disclosure

- **This project was created new on 2026-11-17 for Kiroween 2026. No code written before 2026-10-30 was reused.**
- **Third-party resources: none.** No libraries, no frameworks, no fonts, no images, no APIs, no keys. The favicon is an inline SVG (plus a local `favicon.svg` file); the dial-up sound is synthesised with WebAudio; the typeface is the system monospace stack.
- Seed posts are original fiction about the invented town of Hollow Creek. Any resemblance to real people is coincidental.

## License

MIT — see [LICENSE](LICENSE).
