/* Afterlife BBS — Hollow Creek.
   Vanilla JS, no build step, no dependencies, no network calls except
   fetching the replaceable seed file (data/seed.json).
   Pure logic is exported so tests/checks.mjs can import it in Node.
   All DOM / localStorage / WebAudio work lives behind a
   `typeof document !== 'undefined'` guard at the bottom. */

// ---------------------------------------------------------------------------
// Constants & pure logic (safe to import in Node)
// ---------------------------------------------------------------------------

export const REST_START_HOUR = 0; // inclusive
export const REST_END_HOUR = 6; // exclusive: the board rests 00:00-06:00
export const MAX_TITLE = 120;
export const MAX_BODY = 2000;
export const MAX_AUTHOR = 40;
export const MAX_COMMUNITY_NAME = 60;
export const PER_PAGE = 10;

/**
 * The five standard boards every new community starts from.
 * Taglines are deliberately generic: each demo community keeps its own
 * flavour text in its seed file, and the kit uses these templates.
 */
export const BOARD_TEMPLATES = [
  { id: "town-square", name: "Town Square", tagline: "News, notices, and neighbourly chatter.", icon: "🌳" },
  { id: "seance-circle", name: "Séance Circle", tagline: "Ask for help, offer a hand. One neighbour at a time.", icon: "🕯️" },
  { id: "the-library", name: "The Library", tagline: "Books, films, and songs worth your evening.", icon: "📚" },
  { id: "workshop", name: "Workshop", tagline: "Trade skills, tools, and know-how.", icon: "🔧" },
  { id: "lost-and-found", name: "Lost & Found", tagline: "Lost something? Found something? Pin it here.", icon: "🧤" },
];

/** "The Marlowe House" -> "the-marlowe-house". Falls back to a timed id. */
export function slugify(text) {
  const slug = String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `board-${Date.now().toString(36)}`;
}

/**
 * Build a brand-new community from the kit: a name, an optional tagline,
 * and a subset of the five standard boards (all five by default).
 * Returns { community: { id, name, tagline }, boards, posts } where posts
 * holds a single welcome note from the Caretaker on the first board.
 * Throws an Error with a plain-English message on bad input.
 */
export function createCommunity({ name, tagline = "", boardIds = null, now = new Date() }) {
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName) throw new Error("Give your board a name.");
  if (cleanName.length > MAX_COMMUNITY_NAME) {
    throw new Error(`Name must be at most ${MAX_COMMUNITY_NAME} characters.`);
  }
  const wanted = boardIds == null ? BOARD_TEMPLATES.map((b) => b.id) : boardIds;
  if (!Array.isArray(wanted) || wanted.length === 0) {
    throw new Error("Pick at least one board for your community.");
  }
  const boards = wanted.map((id) => {
    const t = BOARD_TEMPLATES.find((b) => b.id === id);
    if (!t) throw new Error(`Unknown board: ${id}.`);
    return { ...t };
  });
  const stamp = now instanceof Date ? now : new Date(now);
  const community = {
    id: slugify(cleanName),
    name: cleanName,
    tagline: typeof tagline === "string" ? tagline.trim() : "",
  };
  const welcome = {
    id: `welcome-${stamp.getTime().toString(36)}`,
    boardId: boards[0].id,
    title: `Welcome to ${cleanName} — your board is open`,
    body: `This board belongs to ${cleanName}, and it is yours to run. Pin a note, ask for help in the Séance Circle, or light a candle for something kind. There are no algorithms here and no follower counts — just neighbours. When your board is ready, use Export to share it as one file, and anyone can open it with Import.`,
    author: "The Caretaker",
    createdAt: stamp.toISOString(),
    candles: 1,
    kind: null,
    category: null,
    replies: [],
  };
  return { community, boards, posts: [welcome] };
}

export const HELP_CATEGORIES = ["fix", "borrow", "ride", "company", "skill"];
export const CATEGORY_LABELS = {
  fix: "Fix something",
  borrow: "Borrow something",
  ride: "A ride",
  company: "Company",
  skill: "A skill",
};

/** True when the given local hour (0-23) falls in the resting window. */
export function isRestingHour(hour) {
  return Number.isInteger(hour) && hour >= REST_START_HOUR && hour < REST_END_HOUR;
}

/** True when the given Date (local time) falls in the resting window. */
export function isRestingAt(date) {
  return isRestingHour(date.getHours());
}

/** Validate a post/reply form payload. Returns { ok, errors }. */
export function validatePost({ title, body, author = "" }) {
  const errors = [];
  const t = typeof title === "string" ? title.trim() : "";
  const b = typeof body === "string" ? body.trim() : "";
  const a = typeof author === "string" ? author.trim() : "";
  if (!t) errors.push("Title is required.");
  else if (t.length > MAX_TITLE) errors.push(`Title must be at most ${MAX_TITLE} characters.`);
  if (!b) errors.push("Message is required.");
  else if (b.length > MAX_BODY) errors.push(`Message must be at most ${MAX_BODY} characters.`);
  if (a.length > MAX_AUTHOR) errors.push(`Name must be at most ${MAX_AUTHOR} characters.`);
  return { ok: errors.length === 0, errors };
}

/** Newest first. Never mutates the input array. */
export function sortPostsDesc(posts) {
  return [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Paginate a list. Page is 1-based and clamped.
 * Returns { pageItems, totalPages, total, page, hasPrev, hasNext }.
 * The pages partition the input: no duplicates, nothing skipped.
 */
export function paginate(items, page, perPage = PER_PAGE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    pageItems: items.slice(start, start + perPage),
    totalPages,
    total,
    page: safePage,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

/** Build a new post object. `now` is injectable for tests. */
export function createPost({ boardId, title, body, author, kind = null, category = null, now = new Date() }) {
  const stamp = now instanceof Date ? now : new Date(now);
  return {
    id: `u-${stamp.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    boardId,
    title: title.trim(),
    body: body.trim(),
    author: (author || "").trim() || "Anonymous Neighbour",
    createdAt: stamp.toISOString(),
    candles: 0,
    kind: kind || null,
    category: category || null,
    replies: [],
  };
}

/** Append a reply to one post. Returns a new posts array (input untouched). */
export function addReplyToPost(posts, postId, { author, body, now = new Date() }) {
  const stamp = now instanceof Date ? now : new Date(now);
  return posts.map((p) => {
    if (p.id !== postId) return p;
    const reply = {
      id: `u-${stamp.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      author: (author || "").trim() || "Anonymous Neighbour",
      body: body.trim(),
      createdAt: stamp.toISOString(),
    };
    return { ...p, replies: [...(p.replies || []), reply] };
  });
}

/**
 * Toggle this browser's candle on a post. Idempotent: lighting twice does
 * not double-count, un-lighting returns the count to where it was.
 * `lit` maps postId -> true for posts this browser has lit.
 * Returns { posts, lit, litNow } with fresh (non-mutated) inputs.
 */
export function toggleCandle(posts, lit, postId) {
  const alreadyLit = Boolean(lit && lit[postId]);
  const nextLit = { ...(lit || {}) };
  if (alreadyLit) delete nextLit[postId];
  else nextLit[postId] = true;
  const nextPosts = posts.map((p) => {
    if (p.id !== postId) return p;
    const next = Math.max(0, (p.candles || 0) + (alreadyLit ? -1 : 1));
    return { ...p, candles: next };
  });
  return { posts: nextPosts, lit: nextLit, litNow: !alreadyLit };
}

/**
 * Séance matching (pure, local): for a help request of one category, find
 * neighbours who previously *offered* help in that same category — in the
 * seed posts and in user posts alike. One entry per author (their most
 * recent offer), newest first. The request post itself is excluded.
 */
export function findHelpers(posts, category, excludePostId = null) {
  if (!HELP_CATEGORIES.includes(category)) return [];
  const byAuthor = new Map();
  for (const p of sortPostsDesc(posts)) {
    if (p.id === excludePostId) continue;
    if (p.kind !== "offer" || p.category !== category) continue;
    if (!byAuthor.has(p.author)) {
      byAuthor.set(p.author, { author: p.author, postId: p.id, title: p.title, boardId: p.boardId });
    }
  }
  return [...byAuthor.values()];
}

/** Local calendar day as "YYYY-MM-DD" in the browser's timezone. */
function localDayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Today's digest (pure, local): what happened on the board today, which
 * help requests are still unanswered, and which of today's notes received
 * a candle. `now` is injectable for tests.
 * Returns { dateLabel, today, unanswered, warmed }.
 * - today: posts created on `now`'s local date, newest first.
 * - unanswered: request posts with no replies yet, newest first, max 5.
 * - warmed: today's posts that received at least one candle, newest
 *   first, max 3. Deliberately NOT ranked by candle count — candles are
 *   a warm acknowledgement, never a score (see steering/product.md §3).
 */
export function buildDigest(posts, now = new Date()) {
  const stamp = now instanceof Date ? now : new Date(now);
  const todayKey = localDayKey(stamp);
  const today = sortPostsDesc(posts.filter((p) => localDayKey(p.createdAt) === todayKey));
  const unanswered = sortPostsDesc(
    posts.filter((p) => p.kind === "request" && (p.replies || []).length === 0)
  ).slice(0, 5);
  const warmed = today.filter((p) => (p.candles || 0) > 0).slice(0, 3);
  const dateLabel = stamp.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  return { dateLabel, today, unanswered, warmed };
}

/** "1 note" / "2 notes" — every count the user sees goes through this,
    so a single post never reads as "1 notes". */
export function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Anchor demo seed dates to the visitor's first visit (REQ-34).
 * Seed posts are fiction dated in the past; without this, "New today" in
 * the digest is empty for anyone arriving after the seed's newest date.
 * Shifts every post and reply by whole days so the newest post lands on
 * `now`'s local date, preserving the gaps between posts. Returns the
 * input untouched when the newest post is already from today, when the
 * list is empty, or when dates are unparseable. Never mutates its input.
 */
export function rebaseSeedDates(posts, now = new Date()) {
  const stamp = now instanceof Date ? now : new Date(now);
  const dayStart = (d) => {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return NaN;
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const todayStart = dayStart(stamp);
  let maxStart = -Infinity;
  for (const p of posts) {
    const t = dayStart(p.createdAt);
    if (Number.isFinite(t) && t > maxStart) maxStart = t;
  }
  if (!Number.isFinite(maxStart) || maxStart === todayStart) return posts;
  const shiftMs = todayStart - maxStart;
  const shift = (iso) => new Date(new Date(iso).getTime() + shiftMs).toISOString();
  return posts.map((p) => ({
    ...p,
    createdAt: shift(p.createdAt),
    replies: (p.replies || []).map((r) => ({ ...r, createdAt: shift(r.createdAt) })),
  }));
}

/** Serialise one community (boards + posts) for export. */
export function exportState(state, community = null) {
  return JSON.stringify(
    {
      version: 2,
      community: community
        ? { id: community.id, name: community.name, tagline: community.tagline || "" }
        : null,
      boards: state.boards,
      posts: state.posts,
    },
    null,
    2
  );
}

/**
 * Parse and validate an imported board JSON string.
 * Throws an Error with a plain-English message on any problem.
 * Returns a normalised { version, boards, posts } state.
 */
export function parseImportedState(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Import must be a JSON object with boards and posts.");
  }
  if (!Array.isArray(data.boards) || data.boards.length === 0) {
    throw new Error("Import must contain at least one board.");
  }
  if (!Array.isArray(data.posts)) {
    throw new Error("Import must contain a posts array.");
  }
  // Community envelope (v2 exports). v1 files have none — that is fine.
  let community = null;
  if (data.community !== undefined && data.community !== null) {
    const c = data.community;
    if (!c || typeof c.id !== "string" || !c.id || typeof c.name !== "string" || !c.name) {
      throw new Error("Import community needs an id and a name.");
    }
    community = {
      id: c.id,
      name: c.name,
      tagline: typeof c.tagline === "string" ? c.tagline : "",
    };
  }
  for (const b of data.boards) {
    if (!b || typeof b.id !== "string" || !b.id || typeof b.name !== "string" || !b.name) {
      throw new Error("Every board needs an id and a name.");
    }
  }
  const boardIds = new Set(data.boards.map((b) => b.id));
  const posts = data.posts.map((p, i) => {
    if (!p || typeof p.id !== "string" || !p.id) throw new Error(`Post #${i + 1} is missing an id.`);
    if (typeof p.title !== "string" || !p.title.trim()) throw new Error(`Post "${p.id}" is missing a title.`);
    if (typeof p.body !== "string" || !p.body.trim()) throw new Error(`Post "${p.id}" is missing a message.`);
    if (!boardIds.has(p.boardId)) throw new Error(`Post "${p.id}" belongs to an unknown board.`);
    return {
      id: p.id,
      boardId: p.boardId,
      title: p.title,
      body: p.body,
      author: typeof p.author === "string" && p.author.trim() ? p.author : "Anonymous Neighbour",
      createdAt: typeof p.createdAt === "string" && p.createdAt ? p.createdAt : new Date().toISOString(),
      candles: Number.isFinite(p.candles) && p.candles >= 0 ? Math.floor(p.candles) : 0,
      kind: p.kind === "offer" || p.kind === "request" ? p.kind : null,
      category: HELP_CATEGORIES.includes(p.category) ? p.category : null,
      replies: Array.isArray(p.replies)
        ? p.replies.filter((r) => r && typeof r.body === "string" && r.body.trim()).map((r) => ({
            id: typeof r.id === "string" ? r.id : `imported-${Math.random().toString(36).slice(2, 8)}`,
            author: typeof r.author === "string" && r.author.trim() ? r.author : "Anonymous Neighbour",
            body: r.body,
            createdAt: typeof r.createdAt === "string" && r.createdAt ? r.createdAt : new Date().toISOString(),
          }))
        : [],
    };
  });
  return {
    version: typeof data.version === "number" ? data.version : 1,
    community,
    boards: data.boards.map((b) => ({
      id: b.id,
      name: b.name,
      tagline: typeof b.tagline === "string" ? b.tagline : "",
      icon: typeof b.icon === "string" ? b.icon : "📌",
    })),
    posts,
  };
}

// ---------------------------------------------------------------------------
// Browser app (only runs where `document` exists; Node imports skip this)
// ---------------------------------------------------------------------------

if (typeof document !== "undefined") {
  const $ = (sel) => document.querySelector(sel);
  // One data key per community, so two demo boards (and any board a
  // neighbour opens with the kit) never overwrite each other.
  const DATA_KEY_PREFIX = "afterlife-bbs-data-v1:";
  const LIT_KEY = "afterlife-bbs-lit-v1";
  const SETTINGS_KEY = "afterlife-bbs-settings-v1";
  const COMMUNITY_KEY = "afterlife-bbs-community-v1";
  const USER_COMMUNITIES_KEY = "afterlife-bbs-user-communities-v1";

  // Demo communities shipped with the kit. Each has its own seed file.
  const BUILTIN_COMMUNITIES = [
    { id: "hollow-creek", name: "Hollow Creek", tagline: "A small town. Five boards. No algorithms.", est: "est. 1994 · resurrected 2026", seedUrl: "data/seed.json" },
    { id: "marlowe-house", name: "The Marlowe House", tagline: "One apartment building, 48 flats. Five boards.", est: "est. 1962 · resurrected 2026", seedUrl: "data/seed-marlowe.json" },
  ];

  let state = null; // { version, boards, posts } of the active community
  let community = BUILTIN_COMMUNITIES[0]; // { id, name, tagline, est?, seedUrl? }
  let userCommunities = []; // [{ id, name, tagline, boards }] created with the kit
  let lit = {}; // postId -> true, this browser only
  let settings = { reduceMotion: false, highContrast: false, sound: true, typewriter: true };
  let currentBoardId = null;
  let currentPostId = null;
  let currentPage = 1;
  let lastMatch = null; // { category, helpers } shown after posting a request
  let toastTimer = null;

  // ---------- small helpers ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  }
  function snippet(text, n = 140) {
    return text.length > n ? text.slice(0, n).trimEnd() + "…" : text;
  }
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }
  function boardById(id) { return state.boards.find((b) => b.id === id) || null; }
  function postById(id) { return state.posts.find((p) => p.id === id) || null; }
  function postsForBoard(boardId) {
    return sortPostsDesc(state.posts.filter((p) => p.boardId === boardId));
  }

  // ---------- persistence ----------
  function communityDataKey(id) { return `${DATA_KEY_PREFIX}${id}`; }
  function saveState() {
    try { localStorage.setItem(communityDataKey(community.id), JSON.stringify(state)); } catch { /* storage full/blocked: app still works in memory */ }
  }
  function saveUserCommunities() {
    try { localStorage.setItem(USER_COMMUNITIES_KEY, JSON.stringify(userCommunities)); } catch { /* ignore */ }
  }
  function saveActiveCommunityId() {
    try { localStorage.setItem(COMMUNITY_KEY, community.id); } catch { /* ignore */ }
  }
  function loadUserCommunities() {
    try {
      const raw = localStorage.getItem(USER_COMMUNITIES_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          userCommunities = list.filter((c) => c && typeof c.id === "string" && typeof c.name === "string" && Array.isArray(c.boards));
        }
      }
    } catch { userCommunities = []; }
  }
  function findCommunity(id) {
    return BUILTIN_COMMUNITIES.find((c) => c.id === id)
      || userCommunities.find((c) => c.id === id)
      || null;
  }
  function allCommunities() { return [...BUILTIN_COMMUNITIES, ...userCommunities]; }
  function saveLit() {
    try { localStorage.setItem(LIT_KEY, JSON.stringify(lit)); } catch { /* ignore */ }
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = { ...settings, ...JSON.parse(raw) };
    } catch { /* keep defaults */ }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settings.reduceMotion = true;
    }
  }
  function loadLit() {
    try {
      const raw = localStorage.getItem(LIT_KEY);
      if (raw) lit = JSON.parse(raw) || {};
    } catch { lit = {}; }
  }
  /** A fresh state for a community: its seed file for the demos, or a
      blank board set (with the welcome note) for kit-made communities. */
  async function freshStateFor(comm) {
    if (comm.seedUrl) {
      const res = await fetch(comm.seedUrl);
      if (!res.ok) throw new Error(`Could not load ${comm.seedUrl} (HTTP ${res.status}).`);
      const seed = await res.json();
      const parsed = parseImportedState(JSON.stringify(seed));
      // Demo seeds are fiction: anchor their dates to this visitor's
      // first visit so "New today" in the digest is real, not empty
      // (REQ-34). Stored copies and imports keep their own dates.
      return { version: parsed.version, boards: parsed.boards, posts: rebaseSeedDates(parsed.posts, new Date()) };
    }
    const made = createCommunity({ name: comm.name, tagline: comm.tagline || "", boardIds: comm.boards.map((b) => b.id) });
    return { version: 2, boards: made.boards, posts: made.posts };
  }

  /** Load one community: stored copy first, fresh state if there is none. */
  async function loadCommunityState(comm) {
    try {
      const raw = localStorage.getItem(communityDataKey(comm.id));
      if (raw) {
        const parsed = parseImportedState(raw);
        const posts = await maybeRebaseStoredSeed(comm, parsed.posts);
        state = { version: parsed.version, boards: parsed.boards, posts };
        if (posts !== parsed.posts) saveState();
        return;
      }
    } catch { /* corrupt local copy: fall through to a fresh state */ }
    state = await freshStateFor(comm);
    saveState();
  }

  /**
   * Returning visitors who first loaded a demo before REQ-34 shipped hold
   * seed posts dated in the past, so "New today" is empty for them. If
   * the stored board is still pure seed content — every post id is a seed
   * id and no reply carries a user id (u-…) — anchor it to today exactly
   * like a fresh load does. Any user content (a u- post or reply) means
   * hands off: real notes are never re-dated.
   */
  async function maybeRebaseStoredSeed(comm, storedPosts) {
    if (!comm.seedUrl) return storedPosts;
    try {
      const res = await fetch(comm.seedUrl);
      if (!res.ok) return storedPosts;
      const seed = await res.json();
      const seedIds = new Set((seed.posts || []).map((p) => p.id));
      const touched = storedPosts.some(
        (p) => !seedIds.has(p.id)
          || (p.replies || []).some((r) => typeof r.id === "string" && r.id.startsWith("u-"))
      );
      if (touched) return storedPosts;
      return rebaseSeedDates(storedPosts, new Date());
    } catch { return storedPosts; }
  }

  // ---------- settings / display modes ----------
  function applySettings() {
    document.body.classList.toggle("reduce-motion", settings.reduceMotion);
    document.body.classList.toggle("high-contrast", settings.highContrast);
    $("#set-reduce-motion").checked = settings.reduceMotion;
    $("#set-high-contrast").checked = settings.highContrast;
    $("#set-sound").checked = settings.sound;
    $("#set-typewriter").checked = settings.typewriter;
  }
  function runTypewriter() {
    const el = $("#typewriter");
    // The full text lives in data-full: the visible text is the typing
    // target, and aria-label is only the accessible name — never the source.
    const full = el.dataset.full || el.textContent;
    if (!settings.typewriter || settings.reduceMotion) { el.textContent = full; return; }
    el.textContent = "";
    let i = 0;
    const tick = () => {
      if (i <= full.length) { el.textContent = full.slice(0, i); i += 1; setTimeout(tick, 22); }
    };
    tick();
  }

  // ---------- curfew ----------
  function updateRestUI() {
    const resting = isRestingAt(new Date());
    $("#rest-banner").hidden = !resting;
    for (const [btnId, noteId] of [["#post-submit", "#post-resting-note"], ["#reply-submit", "#reply-resting-note"]]) {
      const btn = $(btnId);
      const note = $(noteId);
      if (!btn) continue;
      btn.disabled = resting;
      btn.textContent = resting ? "🌙 The board is resting — back at 6am" : (btnId === "#post-submit" ? "📌 Pin it to the board" : "↩ Post reply");
      if (note) note.hidden = !resting;
    }
  }

  // ---------- routing & rendering ----------
  function showView(name) {
    for (const v of ["home", "board", "post", "digest"]) {
      $(`#view-${v}`).hidden = v !== name;
    }
    $("#main").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // ---------- communities (the kit) ----------
  function applyCommunityIdentity() {
    document.title = `Afterlife BBS — ${community.name}`;
    const sub = $("#dialup-sub");
    if (sub) sub.textContent = `${community.name} · ${community.est || "opened 2026"}`;
    const foot = $("#footer-community");
    if (foot) foot.textContent = community.name;
    const active = $("#active-community-name");
    if (active) active.textContent = community.name;
  }

  function renderCommunityList() {
    const ul = $("#community-list");
    ul.innerHTML = allCommunities().map((c) => {
      const isActive = c.id === community.id;
      let count = null;
      try {
        const raw = localStorage.getItem(communityDataKey(c.id));
        if (raw) count = parseImportedState(raw).posts.length;
      } catch { count = null; }
      if (isActive && state) count = state.posts.length;
      return `<li class="community-card${isActive ? " is-active" : ""}">
        <button type="button" data-community="${escapeHtml(c.id)}" data-seed-url="${c.seedUrl ? escapeHtml(c.seedUrl) : ""}" ${isActive ? 'aria-current="true"' : ""} aria-label="Open ${escapeHtml(c.name)}${isActive ? " (currently open)" : ""}">
          <span class="community-name">${escapeHtml(c.name)}${isActive ? ' <span class="community-open">● open now</span>' : ""}</span>
          <span class="community-tagline">${escapeHtml(c.tagline || "")}</span>
          <span class="community-meta">${count === null ? "Not visited yet — tap to open" : plural(count, "note", "notes")}${c.seedUrl ? "" : " · yours"}</span>
        </button>
      </li>`;
    }).join("");
    // For demo boards never visited, show the real seed count (one fetch
    // each; the browser caches them, and no data leaves the device).
    ul.querySelectorAll("[data-community]").forEach((btn) => {
      btn.addEventListener("click", () => switchCommunity(btn.getAttribute("data-community")));
      const seedUrl = btn.getAttribute("data-seed-url");
      const meta = btn.querySelector(".community-meta");
      if (seedUrl && meta && meta.textContent.startsWith("Not visited yet")) {
        fetch(seedUrl).then((r) => r.json()).then((seed) => {
          const n = Array.isArray(seed.posts) ? seed.posts.length : 0;
          meta.textContent = `${plural(n, "note", "notes")} waiting`;
        }).catch(() => { /* keep the fallback text */ });
      }
    });
  }

  async function switchCommunity(id) {
    const target = findCommunity(id);
    if (!target) { renderHome(); return; }
    if (target.id === community.id) { renderHome(); return; }
    community = target;
    saveActiveCommunityId();
    lastMatch = null;
    currentPage = 1;
    try {
      await loadCommunityState(community);
    } catch (err) {
      toast(`Could not open that board: ${err.message}`);
      return;
    }
    applyCommunityIdentity();
    renderHome();
    toast(`You are now on ${community.name}.`);
  }

  function renderHome() {
    renderCommunityList();
    applyCommunityIdentity();
    const ul = $("#board-list");
    ul.innerHTML = state.boards.map((b) => {
      const count = state.posts.filter((p) => p.boardId === b.id).length;
      const candles = state.posts.filter((p) => p.boardId === b.id).reduce((s, p) => s + (p.candles || 0), 0);
      return `<li class="board-card"><a href="#/board/${escapeHtml(b.id)}" aria-label="${escapeHtml(b.name)}, ${plural(count, "note", "notes")}">
        <h3><span class="board-icon" aria-hidden="true">${escapeHtml(b.icon)}</span>${escapeHtml(b.name)}</h3>
        <p>${escapeHtml(b.tagline)}</p>
        <p class="board-meta">${plural(count, "note", "notes")} · 🕯️ ${plural(candles, "candle", "candles")} lit</p>
      </a></li>`;
    }).join("");
    showView("home");
  }

  function renderMatchCard(container, category, helpers, requestTitle) {
    if (!helpers || helpers.length === 0) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }
    container.innerHTML = `<h3>🕯️ These neighbours might help you</h3>
      <p>For “${escapeHtml(requestTitle)}” (${escapeHtml(CATEGORY_LABELS[category] || category)}), these neighbours have offered a hand before:</p>
      <ul>${helpers.map((h) => `<li><strong>${escapeHtml(h.author)}</strong> — <a href="#/post/${escapeHtml(h.postId)}">${escapeHtml(h.title)}</a></li>`).join("")}</ul>
      <p>How this works: the board lists neighbours who posted an offer in the same category — one entry per neighbour, newest offer first. Requests never match requests. All matching happens on your device — nothing was sent anywhere.</p>`;
    container.hidden = false;
  }

  function renderBoard(boardId) {
    const board = boardById(boardId);
    if (!board) { renderHome(); return; }
    currentBoardId = boardId;
    currentPostId = null;
    $("#board-heading").textContent = `${board.icon} ${board.name}`;
    $("#board-tagline").textContent = board.tagline;
    $("#seance-help").hidden = boardId !== "seance-circle";
    $("#seance-fields").hidden = boardId !== "seance-circle";
    if (lastMatch && lastMatch.boardId === boardId) {
      renderMatchCard($("#match-card"), lastMatch.category, lastMatch.helpers, lastMatch.title);
    } else {
      $("#match-card").hidden = true;
      $("#match-card").innerHTML = "";
    }
    const posts = postsForBoard(boardId);
    const page = paginate(posts, currentPage, PER_PAGE);
    currentPage = page.page;
    const ul = $("#post-list");
    ul.innerHTML = page.pageItems.map((p) => `
      <li class="post-item">
        <h4><a href="#/post/${escapeHtml(p.id)}">${escapeHtml(p.title)}</a>${p.kind ? `<span class="post-kind">${p.kind === "offer" ? "🕯️ offer" : "🙏 request"} · ${escapeHtml(CATEGORY_LABELS[p.category] || "")}</span>` : ""}</h4>
        <p class="post-snippet">${escapeHtml(snippet(p.body))}</p>
        <p class="post-meta">${escapeHtml(p.author)} · ${escapeHtml(fmtDate(p.createdAt))} · <span class="candles">🕯️ ${p.candles || 0}</span> · 💬 ${(p.replies || []).length} repl${(p.replies || []).length === 1 ? "y" : "ies"}</p>
      </li>`).join("");
    $("#empty-board").hidden = posts.length !== 0;
    $("#page-info").textContent = posts.length === 0 ? "No pages yet" : `Page ${page.page} of ${page.totalPages} — ${plural(page.total, "note", "notes")}`;
    $("#page-prev").disabled = !page.hasPrev;
    $("#page-next").disabled = !page.hasNext;
    $("#end-of-board").hidden = !(posts.length > 0 && !page.hasNext);
    showView("board");
  }

  function renderPost(postId) {
    const post = postById(postId);
    if (!post) { renderHome(); return; }
    currentPostId = postId;
    const board = boardById(post.boardId);
    $("#post-back-link").href = `#/board/${post.boardId}`;
    $("#post-back-link").textContent = `← Back to ${board ? board.name : "the board"}`;
    $("#post-detail-title").textContent = post.title;
    $("#post-detail-author").textContent = post.author;
    $("#post-detail-time").textContent = fmtDate(post.createdAt);
    $("#post-detail-time").setAttribute("datetime", post.createdAt);
    $("#post-detail-body").textContent = post.body;
    const cat = $("#post-detail-category");
    if (post.kind && post.category) {
      cat.hidden = false;
      cat.textContent = `${post.kind === "offer" ? "🕯️ Offer" : "🙏 Request"} · ${CATEGORY_LABELS[post.category]}`;
    } else { cat.hidden = true; cat.textContent = ""; }
    const btn = $("#candle-btn");
    btn.setAttribute("aria-pressed", lit[post.id] ? "true" : "false");
    $("#candle-count").textContent = String(post.candles || 0);
    btn.setAttribute("aria-label", lit[post.id]
      ? `Take back your candle for “${post.title}” (${post.candles || 0} lit)`
      : `Light a candle for “${post.title}” (${post.candles || 0} lit)`);
    // Séance helpers on a request's own page.
    let helperBox = $("#post-helper-box");
    if (!helperBox) {
      helperBox = document.createElement("div");
      helperBox.id = "post-helper-box";
      helperBox.className = "match-card";
      $("#post-detail").appendChild(helperBox);
    }
    if (post.kind === "request" && post.category) {
      renderMatchCard(helperBox, post.category, findHelpers(state.posts, post.category, post.id), post.title);
    } else { helperBox.hidden = true; helperBox.innerHTML = ""; }
    const replies = post.replies || [];
    $("#reply-list").innerHTML = replies.map((r) => `
      <li class="post-item">
        <p class="post-body">${escapeHtml(r.body)}</p>
        <p class="post-meta">${escapeHtml(r.author)} · ${escapeHtml(fmtDate(r.createdAt))}</p>
      </li>`).join("");
    $("#empty-replies").hidden = replies.length !== 0;
    showView("post");
  }

  function renderDigest() {
    const d = buildDigest(state.posts, new Date());
    $("#digest-date").textContent = `${d.dateLabel} · ${community.name}`;
    const item = (p) => `<li class="post-item">
        <h4><a href="#/post/${escapeHtml(p.id)}">${escapeHtml(p.title)}</a>${p.kind ? `<span class="post-kind">${p.kind === "offer" ? "🕯️ offer" : "🙏 request"} · ${escapeHtml(CATEGORY_LABELS[p.category] || "")}</span>` : ""}</h4>
        <p class="post-snippet">${escapeHtml(snippet(p.body))}</p>
        <p class="post-meta">${escapeHtml(p.author)} · ${escapeHtml(fmtDate(p.createdAt))} · <span class="candles">🕯️ ${p.candles || 0}</span> · 💬 ${(p.replies || []).length} repl${(p.replies || []).length === 1 ? "y" : "ies"}</p>
      </li>`;
    $("#digest-today-list").innerHTML = d.today.map(item).join("");
    $("#digest-empty-today").hidden = d.today.length !== 0;
    $("#digest-unanswered-list").innerHTML = d.unanswered.map(item).join("");
    $("#digest-empty-unanswered").hidden = d.unanswered.length !== 0;
    $("#digest-warmed-list").innerHTML = d.warmed.map(item).join("");
    $("#digest-empty-warmed").hidden = d.warmed.length !== 0;
    showView("digest");
  }

  function route() {
    const hash = location.hash || "#/";
    const boardMatch = hash.match(/^#\/board\/([\w-]+)$/);
    const postMatch = hash.match(/^#\/post\/([\w-]+)$/);
    if (postMatch) renderPost(postMatch[1]);
    else if (boardMatch) { currentPage = 1; renderBoard(boardMatch[1]); }
    else if (hash === "#/digest") renderDigest();
    else renderHome();
    updateRestUI();
  }

  // ---------- dial-up intro (visual log + WebAudio, no audio files) ----------
  const DIALUP_LINES = [
    "ATZ",
    "OK",
    "ATDT 555-0199",
    "RINGING…",
    "CARRIER DETECTED",
    "NEGOTIATING 14400 BAUD…",
    "CONNECT 14400",
    "WELCOME TO HOLLOW CREEK",
    "5 BOARDS · 0 ADS · 0 ALGORITHMS",
  ];
  let dialupTimer = null;
  function playHandshakeSound() {
    if (!settings.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      const notes = [1400, 2250, 1400, 2250, 1200, 1800, 1400, 2250];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.16 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.16);
        osc.stop(now + i * 0.16 + 0.16);
      });
      // A short burst of static, like line noise.
      const len = Math.floor(ctx.sampleRate * 0.5);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.05;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(now + notes.length * 0.16);
      setTimeout(() => { try { ctx.close(); } catch { /* already closed */ } }, 2500);
    } catch { /* audio unavailable: the visual log still tells the story */ }
  }
  function closeDialup() {
    clearTimeout(dialupTimer);
    $("#dialup").hidden = true;
    try { sessionStorage.setItem("afterlife-intro-seen", "1"); } catch { /* ignore */ }
    $("#main").focus({ preventScroll: true });
  }
  function openDialup() {
    const overlay = $("#dialup");
    const log = $("#dialup-log");
    const status = $("#dialup-status");
    log.innerHTML = "";
    status.textContent = "Press DIAL IN to connect.";
    overlay.hidden = false;
    $("#dialup-connect").focus();
  }
  function runDialup(withSound) {
    clearTimeout(dialupTimer); // a second Dial-in click restarts cleanly
    const log = $("#dialup-log");
    const status = $("#dialup-status");
    log.innerHTML = "";
    status.textContent = "Dialling…";
    if (withSound) playHandshakeSound();
    const step = settings.reduceMotion ? 40 : 320;
    let i = 0;
    const showNext = () => {
      if (i < DIALUP_LINES.length) {
        const li = document.createElement("li");
        li.textContent = DIALUP_LINES[i];
        log.appendChild(li);
        i += 1;
        dialupTimer = setTimeout(showNext, step);
      } else {
        status.textContent = "Connected at 14400 baud — welcome, neighbour.";
        dialupTimer = setTimeout(closeDialup, settings.reduceMotion ? 150 : 1100);
      }
    };
    showNext();
  }

  // ---------- export / import ----------
  function doExport() {
    const blob = new Blob([exportState(state, community)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afterlife-bbs-${community.id}-export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Board exported — your whole board, in one JSON file.");
  }
  function doImport(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseImportedState(String(reader.result));
        // A file carrying another community opens that community: a
        // builtin demo if the id matches one, otherwise a board of yours.
        if (imported.community && imported.community.id !== community.id) {
          const builtin = BUILTIN_COMMUNITIES.find((c) => c.id === imported.community.id);
          if (builtin) {
            community = builtin;
          } else {
            const record = { id: imported.community.id, name: imported.community.name, tagline: imported.community.tagline, boards: imported.boards };
            const idx = userCommunities.findIndex((c) => c.id === record.id);
            if (idx >= 0) userCommunities[idx] = record;
            else userCommunities.push(record);
            saveUserCommunities();
            community = record;
          }
          saveActiveCommunityId();
        }
        state = { version: imported.version, boards: imported.boards, posts: imported.posts };
        saveState();
        applyCommunityIdentity();
        lastMatch = null;
        currentPage = 1;
        route();
        toast(`Import complete — ${plural(imported.posts.length, "note", "notes")} on ${plural(imported.boards.length, "board", "boards")} in ${community.name}.`);
      } catch (err) {
        toast(`Import failed: ${err.message}`);
      }
    };
    reader.onerror = () => toast("Import failed: could not read that file.");
    reader.readAsText(file);
  }

  // ---------- wire up ----------
  function init() {
    loadSettings();
    loadLit();
    applySettings();
    runTypewriter();

    // Settings toggles.
    $("#set-reduce-motion").addEventListener("change", (e) => { settings.reduceMotion = e.target.checked; saveSettings(); applySettings(); });
    $("#set-high-contrast").addEventListener("change", (e) => { settings.highContrast = e.target.checked; saveSettings(); applySettings(); });
    $("#set-sound").addEventListener("change", (e) => { settings.sound = e.target.checked; saveSettings(); });
    $("#set-typewriter").addEventListener("change", (e) => { settings.typewriter = e.target.checked; saveSettings(); runTypewriter(); });

    // Dial-up overlay.
    $("#dialup-connect").addEventListener("click", () => runDialup(true));
    $("#dialup-quiet").addEventListener("click", () => runDialup(false));
    $("#dialup-skip").addEventListener("click", closeDialup);
    $("#replay-dialup").addEventListener("click", openDialup);
    let seen = null;
    try { seen = sessionStorage.getItem("afterlife-intro-seen"); } catch { /* ignore */ }
    // REQ-37: the intro plays by itself (quiet — sound needs a gesture)
    // and closes on its own, so a first visit is never gated on a click.
    // Skip is always there, and the footer replays it with sound.
    if (!seen) { openDialup(); runDialup(false); }

    // Routing & pagination.
    window.addEventListener("hashchange", () => { lastMatch = null; route(); });
    $("#page-prev").addEventListener("click", () => { if (currentPage > 1) { currentPage -= 1; renderBoard(currentBoardId); } });
    $("#page-next").addEventListener("click", () => { currentPage += 1; renderBoard(currentBoardId); });

    // New post.
    $("#post-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (isRestingAt(new Date())) { toast("The board is resting until 6am. Your note is safe in the form — try again in the morning."); return; }
      const title = $("#post-title").value;
      const body = $("#post-body").value;
      const author = $("#post-author").value;
      const { ok, errors } = validatePost({ title, body, author });
      const errBox = $("#post-errors");
      if (!ok) { errBox.textContent = errors.join(" "); errBox.hidden = false; return; }
      errBox.hidden = true;
      const isSeance = currentBoardId === "seance-circle";
      const kind = isSeance ? $("#post-kind").value : null;
      const category = isSeance ? $("#post-category").value : null;
      const post = createPost({ boardId: currentBoardId, title, body, author, kind, category });
      state.posts.push(post);
      saveState();
      lastMatch = null;
      if (kind === "request" && category) {
        const helpers = findHelpers(state.posts, category, post.id);
        lastMatch = { boardId: currentBoardId, category, helpers, title: post.title };
      }
      e.target.reset();
      renderBoard(currentBoardId);
      if (lastMatch && lastMatch.helpers.length > 0) {
        toast("Note pinned. The board found neighbours who might help — see the card above the list.");
      } else if (lastMatch) {
        toast("Note pinned. No neighbours have offered that kind of help yet — your note is up for all to see.");
      } else {
        toast("Note pinned to the board.");
      }
    });

    // Reply.
    $("#reply-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (isRestingAt(new Date())) { toast("The board is resting until 6am. Replies open again in the morning."); return; }
      const body = $("#reply-body").value;
      const author = $("#reply-author").value;
      const { ok, errors } = validatePost({ title: "reply", body, author });
      const errBox = $("#reply-errors");
      if (!ok) { errBox.textContent = errors.join(" "); errBox.hidden = false; return; }
      errBox.hidden = true;
      state.posts = addReplyToPost(state.posts, currentPostId, { author, body });
      saveState();
      e.target.reset();
      renderPost(currentPostId);
      toast("Reply posted.");
    });

    // Candle.
    $("#candle-btn").addEventListener("click", () => {
      const result = toggleCandle(state.posts, lit, currentPostId);
      state.posts = result.posts;
      lit = result.lit;
      saveState();
      saveLit();
      renderPost(currentPostId);
      toast(result.litNow ? "🕯️ Candle lit." : "Candle taken back.");
    });

    // Export / import / reset.
    $("#nav-export").addEventListener("click", doExport);
    $("#nav-import").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) doImport(e.target.files[0]);
      e.target.value = "";
    });
    // Reset (REQ-36): a visible in-page confirmation, not a native
    // dialog — automation auto-dismisses window.confirm, so the red team
    // saw nothing at all. The modal names the community and the cost,
    // and the success toast reports the restored count.
    let resetReturnFocus = null;
    const openResetModal = () => {
      const total = state.posts.length;
      const replies = state.posts.reduce((s, p) => s + (p.replies || []).length, 0);
      $("#reset-modal-community").textContent = community.name;
      $("#reset-modal-body").textContent = `This deletes all ${plural(total, "note", "notes")} and ${plural(replies, "reply", "replies")} on this board, then restores the original seed notes. Export first if you want to keep anything.`;
      $("#reset-modal").hidden = false;
      resetReturnFocus = document.activeElement;
      $("#reset-confirm").focus();
    };
    const closeResetModal = () => {
      $("#reset-modal").hidden = true;
      if (resetReturnFocus && typeof resetReturnFocus.focus === "function") resetReturnFocus.focus();
    };
    $("#reset-board").addEventListener("click", openResetModal);
    $("#reset-cancel").addEventListener("click", closeResetModal);
    $("#reset-modal").addEventListener("click", (e) => { if (e.target.id === "reset-modal") closeResetModal(); });
    $("#reset-modal").addEventListener("keydown", (e) => { if (e.key === "Escape") closeResetModal(); });
    $("#reset-confirm").addEventListener("click", () => {
      closeResetModal();
      try { localStorage.removeItem(communityDataKey(community.id)); } catch { /* ignore */ }
      lit = {};
      saveLit();
      lastMatch = null;
      loadCommunityState(community).then(() => {
        currentPage = 1; route();
        toast(`Board reset — ${community.name} is back to its ${plural(state.posts.length, "original note", "original notes")}.`);
      }).catch((err) => toast(`Reset failed: ${err.message}`));
    });

    // Kit: open your own board in five minutes.
    $("#kit-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      const name = $("#kit-name").value;
      const tagline = $("#kit-tagline").value;
      const boardIds = [...form.querySelectorAll('input[name="kit-boards"]:checked')].map((c) => c.value);
      const errBox = $("#kit-errors");
      let made;
      try {
        made = createCommunity({ name, tagline, boardIds });
      } catch (err) {
        errBox.textContent = err.message;
        errBox.hidden = false;
        return;
      }
      errBox.hidden = true;
      if (userCommunities.some((c) => c.id === made.community.id) || BUILTIN_COMMUNITIES.some((c) => c.id === made.community.id)) {
        errBox.textContent = `A board called “${made.community.name}” already exists here. Pick a different name to open a second one.`;
        errBox.hidden = false;
        return;
      }
      const record = { id: made.community.id, name: made.community.name, tagline: made.community.tagline, boards: made.boards };
      userCommunities.push(record);
      saveUserCommunities();
      community = record;
      state = { version: 2, boards: made.boards, posts: made.posts };
      saveState();
      saveActiveCommunityId();
      lastMatch = null;
      currentPage = 1;
      form.reset();
      applyCommunityIdentity();
      renderHome();
      toast(`Your board “${record.name}” is open. Use Export to share it as one file.`);
    });

    // Curfew clock.
    updateRestUI();
    setInterval(updateRestUI, 60000);

    // PWA: offline cache for this site's own static files only.
    // REQ-35: updateViaCache "none" makes the browser always fetch a
    // fresh sw.js on its update check, so a new release is actually
    // discovered; when a new worker installs while this page is open,
    // offer a reload instead of silently serving old code.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
        .then((reg) => {
          const offerUpdate = () => {
            const banner = $("#update-banner");
            if (banner) banner.hidden = false;
          };
          if (reg.waiting && navigator.serviceWorker.controller) offerUpdate();
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate();
            });
          });
          reg.update().catch(() => { /* update check is best-effort */ });
        })
        .catch(() => { /* offline support is a bonus, not a blocker */ });
    }
    const updateReload = $("#update-reload");
    if (updateReload) updateReload.addEventListener("click", () => window.location.reload());
    const updateDismiss = $("#update-dismiss");
    if (updateDismiss) updateDismiss.addEventListener("click", () => { $("#update-banner").hidden = true; });

    // Communities first: which board are we on?
    loadUserCommunities();
    try {
      const savedCommunityId = localStorage.getItem(COMMUNITY_KEY);
      if (savedCommunityId) {
        const found = findCommunity(savedCommunityId);
        if (found) community = found;
      }
    } catch { /* ignore */ }
    applyCommunityIdentity();

    // Load data, then render.
    loadCommunityState(community)
      .then(() => { route(); })
      .catch((err) => {
        $("#board-list").innerHTML = "";
        document.querySelector("#view-home .lede").textContent =
          `The board could not load its notes: ${err.message} Serve this folder with a local web server (python3 -m http.server) and reload.`;
        showView("home");
      });
  }

  init();
}
