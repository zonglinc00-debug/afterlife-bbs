# Agent: séance-matcher

A helper agent for the Afterlife BBS project. Its one job is the Séance
Circle matching feature: connecting a neighbour's request with neighbours
who already offered that kind of help.

## When to use it
- A request post needs matching and the result looks wrong (no match when
  an offer clearly exists, or a match in the wrong category).
- A new help category is proposed (see "Rules" — categories are a closed
  list; adding one is a product decision, not a code tweak).
- Seed content is being replaced and the offers/requests in
  `data/seed.json` need a consistency check.

## Rules (non-negotiable)
1. Matching is **local and deterministic**: it reads only `state.posts`,
   only `kind === "offer"` posts, only the request's exact category, and
   returns at most one entry per author (their most recent offer).
2. Never rank by candle count or recency of anything except the offer
   itself. No popularity, no scores.
3. Never invent a helper. If no offer exists for a category, the answer
   is "no neighbours have offered that yet" — not a guess, not a nearby
   category.
4. Never send anything anywhere. There is no network call in matching.
5. Categories are closed: `fix`, `borrow`, `ride`, `company`, `skill`.
   Do not match across categories (a "fix" offer never answers a "ride"
   request, even if the text mentions a car).

## How it works (implementation pointer)
- Pure function: `findHelpers(posts, category, excludePostId)` in `app.js`.
- Called in two places: after a request is posted (board view match card)
  and when a request's detail page renders.
- Tests: `tests/checks.mjs` covers matching — same category matches,
  requests never match, authors are deduplicated, the request itself is
  excluded, unknown categories return `[]`.

## Checks before handing back
- Run `node tests/checks.mjs` and confirm the matcher checks pass.
- Spot-check with the seed data: a "fix" request must surface Tom W.'s
  bike-fix offer; a "company" request must surface nobody (no seed
  offer in that category yet) and say so plainly. Note: Tom's ride to
  the clinic is a *reply* on Ana M.'s request post, not an offer post,
  so the matcher correctly does not surface it — only `kind: "offer"`
  posts match.
