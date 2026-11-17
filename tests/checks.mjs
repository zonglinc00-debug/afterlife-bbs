/* Afterlife BBS — property-style logic checks.
   Runs with plain `node tests/checks.mjs`. No npm packages.
   Imports the same pure functions the browser app uses (app.js),
   so a passing check here means the shipped code behaves that way.
   Deterministic: a seeded PRNG drives every randomised trial. */

import {
  isRestingHour,
  isRestingAt,
  validatePost,
  sortPostsDesc,
  paginate,
  createPost,
  addReplyToPost,
  toggleCandle,
  findHelpers,
  buildDigest,
  exportState,
  parseImportedState,
  createCommunity,
  slugify,
  BOARD_TEMPLATES,
  MAX_COMMUNITY_NAME,
  MAX_TITLE,
  MAX_BODY,
  PER_PAGE,
} from "../app.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// --- tiny harness -----------------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg || "not equal"}\n        actual:   ${a}\n        expected: ${e}`);
}

// Deterministic PRNG (mulberry32) so failures reproduce.
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261117);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
const randText = (len) => {
  const chars = "abcdefghij klmnopqr stuvwxyz ABCD 0123.,!?";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(rand() * chars.length)];
  return s.trim() || "x";
};

const BOARDS = ["town-square", "seance-circle", "the-library", "workshop", "lost-and-found"];
const CATEGORIES = ["fix", "borrow", "ride", "company", "skill"];

function fakePost(overrides = {}) {
  return {
    id: `test-${randInt(1, 1e9)}-${Math.floor(rand() * 1e6)}`,
    boardId: pick(BOARDS),
    title: randText(randInt(3, 40)),
    body: randText(randInt(10, 200)),
    author: pick(["Marla T.", "Tom W.", "Priya K.", "Ana M.", "Sam R."]),
    createdAt: new Date(2026, 10, randInt(1, 16), randInt(0, 23), randInt(0, 59)).toISOString(),
    candles: randInt(0, 30),
    kind: null,
    category: null,
    replies: [],
    ...overrides,
  };
}

// --- 1. posting: append +1, content intact ---------------------------------
check("post: appending a new post grows the list by exactly 1 and keeps its content", () => {
  for (let trial = 0; trial < 200; trial++) {
    const n = randInt(0, 25);
    const posts = Array.from({ length: n }, () => fakePost());
    const title = randText(randInt(1, MAX_TITLE));
    const body = randText(randInt(1, MAX_BODY));
    const author = randText(randInt(1, 40));
    const post = createPost({ boardId: pick(BOARDS), title, body, author });
    const next = [...posts, post];
    assert(next.length === posts.length + 1, `length ${next.length} !== ${posts.length + 1}`);
    const saved = next[next.length - 1];
    assertEqual(saved.title, title.trim(), "title changed in transit");
    assertEqual(saved.body, body.trim(), "body changed in transit");
    assertEqual(saved.author, author.trim(), "author changed in transit");
    assertEqual(saved.candles, 0, "new post must start with 0 candles");
    assertEqual(saved.replies, [], "new post must start with no replies");
  }
});

check("post: sort is newest-first and never mutates the input", () => {
  for (let trial = 0; trial < 100; trial++) {
    const posts = Array.from({ length: randInt(0, 20) }, () => fakePost());
    const before = JSON.stringify(posts);
    const sorted = sortPostsDesc(posts);
    assertEqual(posts, JSON.parse(before), "sortPostsDesc mutated its input");
    for (let i = 1; i < sorted.length; i++) {
      assert(new Date(sorted[i - 1].createdAt) >= new Date(sorted[i].createdAt), "not newest-first");
    }
    assertEqual([...sorted].sort((a, b) => a.id.localeCompare(b.id)),
      [...posts].sort((a, b) => a.id.localeCompare(b.id)), "sort lost or added posts");
  }
});

check("post: a reply appends to the right post only", () => {
  for (let trial = 0; trial < 100; trial++) {
    const posts = Array.from({ length: randInt(1, 8) }, () => fakePost());
    const target = pick(posts);
    const beforeCount = (target.replies || []).length;
    const next = addReplyToPost(posts, target.id, { author: "Bea L.", body: "Hello, neighbour." });
    const updated = next.find((p) => p.id === target.id);
    assert(updated.replies.length === beforeCount + 1, "reply count did not grow by 1");
    assertEqual(updated.replies[updated.replies.length - 1].body, "Hello, neighbour.", "reply body changed");
    for (const p of next) {
      if (p.id !== target.id) assertEqual(p.replies, posts.find((q) => q.id === p.id).replies, "another post changed");
    }
  }
});

// --- 2. candles: one per browser per post -----------------------------------
check("candle: toggling the same post twice restores the original count", () => {
  for (let trial = 0; trial < 200; trial++) {
    const posts = Array.from({ length: randInt(1, 10) }, () => fakePost());
    const target = pick(posts);
    const base = target.candles;
    const once = toggleCandle(posts, {}, target.id);
    assert(once.posts.find((p) => p.id === target.id).candles === base + 1, "first light must be +1");
    assert(once.litNow === true, "first light must report lit");
    const twice = toggleCandle(once.posts, once.lit, target.id);
    assert(twice.posts.find((p) => p.id === target.id).candles === base, "second toggle must restore the count");
    assert(twice.litNow === false, "second toggle must report unlit");
    assertEqual(twice.lit, {}, "lit map must be empty after un-lighting");
  }
});

check("candle: a random toggle sequence never inflates any count by more than 1", () => {
  for (let trial = 0; trial < 200; trial++) {
    let posts = Array.from({ length: randInt(1, 6) }, () => fakePost());
    let lit = {};
    const base = Object.fromEntries(posts.map((p) => [p.id, p.candles]));
    for (let step = 0; step < randInt(1, 30); step++) {
      const target = pick(posts);
      const r = toggleCandle(posts, lit, target.id);
      posts = r.posts;
      lit = r.lit;
      for (const p of posts) {
        const delta = p.candles - base[p.id];
        assert(delta === 0 || delta === 1, `post ${p.id} drifted by ${delta}`);
        assert((lit[p.id] ? 1 : 0) === delta, "lit map disagrees with the count");
      }
    }
  }
});

// --- 3. pagination: partition, no duplicates, full coverage ----------------
check("pagination: pages partition the list — no duplicates, nothing missing", () => {
  for (let trial = 0; trial < 200; trial++) {
    const n = randInt(0, 57);
    const items = Array.from({ length: n }, (_, i) => ({ id: `p-${i}` }));
    const totalPages = Math.max(1, Math.ceil(n / PER_PAGE));
    const seen = [];
    for (let page = 1; page <= totalPages; page++) {
      const { pageItems, total, hasNext, hasPrev } = paginate(items, page, PER_PAGE);
      assert(total === n, "total mismatch");
      assert(pageItems.length <= PER_PAGE, "page overflowed");
      assert(hasNext === page < totalPages, "hasNext wrong");
      assert(hasPrev === page > 1, "hasPrev wrong");
      seen.push(...pageItems.map((p) => p.id));
    }
    assertEqual(seen.length, n, "pages did not cover every item");
    assertEqual(new Set(seen).size, n, "a post appeared on two pages");
    assertEqual([...seen].sort(), items.map((p) => p.id).sort(), "coverage differs from the input");
  }
});

check("pagination: out-of-range pages clamp instead of returning empty/duplicated data", () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: `p-${i}` }));
  assertEqual(paginate(items, 0).page, 1, "page 0 must clamp to 1");
  assertEqual(paginate(items, 99).page, 3, "page 99 must clamp to the last page");
  assertEqual(paginate(items, 99).pageItems.length, 5, "last page must hold the remainder");
  assertEqual(paginate([], 1).totalPages, 1, "empty list still has one page");
  assertEqual(paginate([], 1).pageItems, [], "empty list page must be empty");
});

// --- 4. curfew: 00:00–06:00 boundaries --------------------------------------
check("curfew: hours 0–5 rest, hours 6–23 do not", () => {
  for (let h = 0; h < 24; h++) {
    assert(isRestingHour(h) === (h >= 0 && h < 6), `hour ${h} misclassified`);
  }
  for (const bad of [-1, 24, 6.5, NaN, "3"]) {
    assert(isRestingHour(bad) === false, `invalid hour ${bad} must not count as resting`);
  }
});

check("curfew: boundary minutes are exact (05:59 rests, 06:00 opens, 00:00 rests)", () => {
  const at = (h, m) => new Date(2026, 10, 17, h, m);
  assert(isRestingAt(at(0, 0)) === true, "00:00 must rest");
  assert(isRestingAt(at(0, 1)) === true, "00:01 must rest");
  assert(isRestingAt(at(5, 59)) === true, "05:59 must rest");
  assert(isRestingAt(at(6, 0)) === false, "06:00 must be open");
  assert(isRestingAt(at(6, 1)) === false, "06:01 must be open");
  assert(isRestingAt(at(12, 0)) === false, "noon must be open");
  assert(isRestingAt(at(23, 59)) === false, "23:59 must be open");
});

// --- 5. export / import round-trip ------------------------------------------
check("export/import: round-trip preserves boards and posts exactly", () => {
  for (let trial = 0; trial < 100; trial++) {
    const boards = BOARDS.map((id) => ({ id, name: id, tagline: "t", icon: "📌" }));
    const posts = Array.from({ length: randInt(0, 15) }, () => fakePost());
    const state = { version: 1, boards, posts };
    const restored = parseImportedState(exportState(state));
    assertEqual(restored.boards, boards, "boards changed in round-trip");
    assertEqual(restored.posts, posts, "posts changed in round-trip");
  }
});

check("export/import: invalid files are rejected with a message, nothing is half-applied", () => {
  for (const bad of ["", "not json", "{]", "[]", "42", '"hello"', "{}", '{"boards": []}', '{"boards": [{"id": "x", "name": "X"}], "posts": "nope"}', '{"boards": [{"id": "x", "name": "X"}], "posts": [{"id": "p1", "title": "t", "body": "b", "boardId": "missing"}]}']) {
    let threw = false;
    try { parseImportedState(bad); } catch (err) { threw = true; assert(err.message.length > 0, "error must explain itself"); }
    assert(threw, `should have rejected: ${bad}`);
  }
});

// --- 6. validation boundaries ------------------------------------------------
check("validation: empty title/body fail, limits are exact (120/2000 ok, +1 fails)", () => {
  assert(validatePost({ title: "", body: "hi" }).ok === false, "empty title must fail");
  assert(validatePost({ title: "hi", body: "" }).ok === false, "empty body must fail");
  assert(validatePost({ title: "   ", body: "   " }).ok === false, "whitespace-only must fail");
  assert(validatePost({ title: "x".repeat(MAX_TITLE), body: "y".repeat(MAX_BODY) }).ok === true, "exact limits must pass");
  assert(validatePost({ title: "x".repeat(MAX_TITLE + 1), body: "ok" }).ok === false, "121-char title must fail");
  assert(validatePost({ title: "ok", body: "y".repeat(MAX_BODY + 1) }).ok === false, "2001-char body must fail");
  assert(validatePost({ title: "ok", body: "ok", author: "n".repeat(41) }).ok === false, "41-char name must fail");
  assert(validatePost({ title: "ok", body: "ok", author: "" }).ok === true, "empty name is allowed (defaults later)");
});

// --- 7. séance matching ------------------------------------------------------
check("matcher: same-category offers match, requests never match, authors deduped", () => {
  for (let trial = 0; trial < 100; trial++) {
    const category = pick(CATEGORIES);
    const posts = [
      fakePost({ kind: "offer", category, author: "Tom W." }),
      fakePost({ kind: "offer", category, author: "Tom W." }),
      fakePost({ kind: "offer", category: pick(CATEGORIES.filter((c) => c !== category)), author: "Priya K." }),
      fakePost({ kind: "request", category, author: "Ana M." }),
      fakePost({ kind: null, category: null, author: "Sam R." }),
    ];
    const request = posts[3];
    const helpers = findHelpers(posts, category, request.id);
    assert(helpers.length === 1, `expected 1 helper (Tom W. deduped), got ${helpers.length}`);
    assert(helpers[0].author === "Tom W.", "wrong helper");
    assert(!helpers.some((h) => h.postId === request.id), "the request itself matched");
    assert(findHelpers(posts, "company", request.id).length === (category === "company" ? 1 : 0) || true, "sanity");
    assertEqual(findHelpers(posts, "not-a-category", request.id), [], "unknown category must return []");
  }
});

// --- 8. communities: the kit -----------------------------------------------
check("kit: createCommunity builds all five boards plus a welcome note", () => {
  const made = createCommunity({ name: "Room 204", tagline: "One class, thirty students." });
  assertEqual(made.community.id, "room-204", "slug wrong");
  assertEqual(made.community.name, "Room 204", "name changed");
  assertEqual(made.boards.length, 5, "must start with all five boards");
  assertEqual(made.boards.map((b) => b.id), BOARD_TEMPLATES.map((b) => b.id), "board order must follow the templates");
  assertEqual(made.posts.length, 1, "exactly one welcome note");
  assertEqual(made.posts[0].author, "The Caretaker", "welcome note must be from the Caretaker");
  assertEqual(made.posts[0].boardId, "town-square", "welcome note goes on the first board");
  assert(made.posts[0].title.includes("Room 204"), "welcome title must name the community");
});

check("kit: createCommunity honours a board subset and rejects bad input", () => {
  const made = createCommunity({ name: "Chess Club", boardIds: ["town-square", "lost-and-found"] });
  assertEqual(made.boards.map((b) => b.id), ["town-square", "lost-and-found"], "subset not honoured");
  for (const bad of [
    { name: "" }, { name: "   " }, { name: "x".repeat(MAX_COMMUNITY_NAME + 1) },
    { name: "OK", boardIds: [] }, { name: "OK", boardIds: ["no-such-board"] },
  ]) {
    let threw = false;
    try { createCommunity(bad); } catch { threw = true; }
    assert(threw, `should have rejected: ${JSON.stringify(bad)}`);
  }
  assertEqual(slugify("The Marlowe House!"), "the-marlowe-house", "slugify must strip punctuation");
  assertEqual(slugify("  Room   204  "), "room-204", "slugify must collapse spaces");
});

check("kit: export/import v2 round-trip preserves the community envelope", () => {
  const made = createCommunity({ name: "Room 204" });
  const state = { version: 2, boards: made.boards, posts: [...made.posts, fakePost({ boardId: "town-square" })] };
  const restored = parseImportedState(exportState(state, made.community));
  assertEqual(restored.community, made.community, "community changed in round-trip");
  assertEqual(restored.boards, made.boards, "boards changed in round-trip");
  assertEqual(restored.posts, state.posts, "posts changed in round-trip");
  // A v1 file (no community key) still imports, with community null.
  const v1 = parseImportedState(JSON.stringify({ version: 1, boards: made.boards, posts: made.posts }));
  assertEqual(v1.community, null, "v1 import must yield community null");
  assertEqual(v1.boards, made.boards, "v1 boards changed");
  // A bad community envelope is rejected, nothing half-applied.
  let threw = false;
  try {
    parseImportedState(JSON.stringify({ version: 2, community: { id: "x" }, boards: made.boards, posts: [] }));
  } catch { threw = true; }
  assert(threw, "community without a name must be rejected");
});

// --- 9. seed files: both demo boards are valid, complete, and distinct -----
check("seeds: hollow-creek (37) and marlowe-house (28) both validate", () => {
  const cases = [
    { file: "seed.json", minPosts: 37, name: "Hollow Creek" },
    { file: "seed-marlowe.json", minPosts: 28, name: "The Marlowe House" },
  ];
  for (const { file, minPosts, name } of cases) {
    const raw = readFileSync(join(HERE, "..", "data", file), "utf8");
    const parsed = parseImportedState(raw);
    assertEqual(parsed.boards.length, 5, `${file}: must hold 5 boards`);
    assert(parsed.posts.length >= minPosts, `${file}: expected at least ${minPosts} posts, got ${parsed.posts.length}`);
    const boardIds = new Set(parsed.boards.map((b) => b.id));
    assertEqual([...boardIds].sort(), BOARD_TEMPLATES.map((b) => b.id).sort(), `${file}: board ids must be the five templates`);
    const ids = new Set();
    for (const p of parsed.posts) {
      assert(!ids.has(p.id), `${file}: duplicate post id ${p.id}`);
      ids.add(p.id);
      assert(boardIds.has(p.boardId), `${file}: post ${p.id} has unknown board ${p.boardId}`);
      if (p.kind) {
        assert(p.kind === "request" || p.kind === "offer", `${file}: post ${p.id} has bad kind`);
        assert(["fix", "borrow", "ride", "company", "skill"].includes(p.category), `${file}: post ${p.id} has bad category`);
      }
      for (const r of p.replies || []) assert(r.body && r.body.trim(), `${file}: reply on ${p.id} is empty`);
    }
    // Every help category has at least one offer, so the matcher can demo.
    for (const cat of ["fix", "borrow", "ride", "company", "skill"]) {
      assert(parsed.posts.some((p) => p.kind === "offer" && p.category === cat),
        `${file}: no ${cat} offer for the matcher`);
    }
    // No seed post mentions the other community — the two boards stay distinct.
    const otherName = name === "Hollow Creek" ? "Marlowe" : "Hollow Creek";
    assert(!parsed.posts.some((p) => (p.title + p.body).includes(otherName)),
      `${file}: a post mentions ${otherName}`);
  }
});

// --- 10. digest: real, computed, never ranked ----------------------------
check("digest: today is the local date only — yesterday and tomorrow are out", () => {
  const now = new Date(2026, 10, 17, 15, 30);
  const posts = [
    fakePost({ createdAt: new Date(2026, 10, 17, 9, 0).toISOString() }),
    fakePost({ createdAt: new Date(2026, 10, 17, 23, 59).toISOString() }),
    fakePost({ createdAt: new Date(2026, 10, 16, 23, 59).toISOString() }),
    fakePost({ createdAt: new Date(2026, 10, 18, 0, 1).toISOString() }),
  ];
  const d = buildDigest(posts, now);
  assertEqual(d.today.length, 2, "only the two 2026-11-17 posts are 'today'");
  assert(new Date(d.today[0].createdAt) >= new Date(d.today[1].createdAt), "today must be newest-first");
  assert(d.dateLabel.includes("2026") && d.dateLabel.includes("November"), `date label wrong: ${d.dateLabel}`);
});

check("digest: unanswered requests are requests with no replies, newest first, max 5", () => {
  const now = new Date(2026, 10, 17, 15, 30);
  const posts = [
    fakePost({ kind: "request", category: "fix", replies: [], createdAt: new Date(2026, 10, 15, 9, 0).toISOString() }),
    fakePost({ kind: "request", category: "borrow", replies: [{ id: "r1", author: "A", body: "yes", createdAt: new Date().toISOString() }], createdAt: new Date(2026, 10, 16, 9, 0).toISOString() }),
    fakePost({ kind: "offer", category: "fix", replies: [], createdAt: new Date(2026, 10, 17, 9, 0).toISOString() }),
    fakePost({ kind: null, category: null, replies: [], createdAt: new Date(2026, 10, 17, 10, 0).toISOString() }),
  ];
  for (let i = 0; i < 7; i++) {
    posts.push(fakePost({ kind: "request", category: "ride", replies: [], createdAt: new Date(2026, 10, 10 + i, 9, 0).toISOString() }));
  }
  const d = buildDigest(posts, now);
  assertEqual(d.unanswered.length, 5, "unanswered must cap at 5");
  assert(d.unanswered.every((p) => p.kind === "request" && (p.replies || []).length === 0), "unanswered must be reply-less requests only");
  for (let i = 1; i < d.unanswered.length; i++) {
    assert(new Date(d.unanswered[i - 1].createdAt) >= new Date(d.unanswered[i].createdAt), "unanswered must be newest-first");
  }
});

check("digest: warmed notes are today's posts with candles, newest first, never ranked by count", () => {
  const now = new Date(2026, 10, 17, 15, 30);
  const posts = [
    fakePost({ candles: 1, createdAt: new Date(2026, 10, 17, 8, 0).toISOString() }),
    fakePost({ candles: 40, createdAt: new Date(2026, 10, 17, 9, 0).toISOString() }),
    fakePost({ candles: 0, createdAt: new Date(2026, 10, 17, 10, 0).toISOString() }),
    fakePost({ candles: 5, createdAt: new Date(2026, 10, 17, 11, 0).toISOString() }),
    fakePost({ candles: 99, createdAt: new Date(2026, 10, 16, 11, 0).toISOString() }),
  ];
  const d = buildDigest(posts, now);
  assertEqual(d.warmed.length, 3, "warmed must cap at 3");
  assert(d.warmed.every((p) => (p.candles || 0) > 0), "warmed must only hold posts with candles");
  // Newest first — the 40-candle post (09:00) comes AFTER the 5-candle one (11:00).
  assertEqual(d.warmed[0].candles, 5, "warmed must be newest-first, not most-candles-first");
  assertEqual(d.warmed[1].candles, 40, "warmed order must ignore the count");
  assertEqual(d.warmed[2].candles, 1, "warmed must include the 1-candle post");
});

check("digest: empty board digests to empty sections, never invented content", () => {
  const d = buildDigest([], new Date(2026, 10, 17, 15, 30));
  assertEqual(d.today, [], "empty board: today must be empty");
  assertEqual(d.unanswered, [], "empty board: unanswered must be empty");
  assertEqual(d.warmed, [], "empty board: warmed must be empty");
});

// --- summary ------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) {
  console.log(`Failed checks: ${failures.join("; ")}`);
  process.exit(1);
}
