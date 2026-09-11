# Design — Fractional vs Full-Time CTO Calculator

Engineering decisions for the project described in [`CLAUDE.md`](../CLAUDE.md). Read that first for the *why*; this file is the *how*. Every session works from this file, so change it (and say so in the commit) before building something different.

## Decisions (made by Mikheil, 2026-09-11)

| Topic | Decision |
|---|---|
| Stack | One self-contained `index.html` (inline CSS + vanilla JS, no build step, no framework) |
| Hosting | Netlify, Mikheil's own account, auto-deploys from this GitHub repo |
| Interaction | One screen: inputs left, results right, results update live as inputs change |
| Fractional price | Set by the visitor. prommer.net publishes no rate, so we don't invent one |
| AI | Live AI rewrite of the summary through an OpenRouter **free** model, via one Netlify function. Goal: *show how it would work*, at zero cost |

## Calculation rules

Only two kinds of number may appear: **published by prommer.net** or **set by the visitor**. Anything derived is shown with its formula.

- **Full-time CTO all-in cost** — input, default **$400,000/yr** (prommer.net: *"$400K+ annual cost"*).
- **Full-time equivalent hourly rate** = full-time cost ÷ (40 hrs × 52 wks). At $400K that's ≈ **$192/hr**.
- **Fractional hourly rate** — slider, **starts at the full-time equivalent rate** and is labeled *"Starts at the full-time equivalent rate — set your own"*. That way the starting value is derived from the site's own number, not invented. The visitor moves it to their real quote.
- **Fractional annual cost** = hrs/week × rate × **52 weeks** (state "52 weeks" visibly next to results).
  - Strategic Advisory: **10–15 hrs/week** → shown as a **range** (low–high)
  - Active Leadership: **15–20 hrs/week** → shown as a **range**
  - Project-Based: **no number** — shown as "Scoped per initiative", links to the call
- **Savings** vs full-time, as $ and %, per tier (ranges).

### Best-fit tier (rule-based guide, labeled as a guide)

Inputs: company type — Startup · Scale-up · PE portfolio company · Established company (the four "Ideal For" groups on prommer.net's Fractional CTO page), engineering team size (slider 0–100+), primary need (Tech strategy & roadmap · Build & lead the team · AI strategy & adoption · One specific initiative).

- Need = one specific initiative → **Project-Based**
- Need = build & lead the team, **or** team > 15 → **Active Leadership**
- Otherwise → **Strategic Advisory**
- Team > 50 → add an honest note: "At this size a full-time CTO may be the right call — a fractional CTO can help you hire one."

## Summary text

- **Local summary (default, always on).** Written in JS from a template, re-rendered on every input change, with no network call. The page must be complete and correct with only this.
- **AI rewrite (on demand).** Button *"Rewrite with AI"* → calls the function → replaces the text, labeled *"AI-generated · illustration only"*.
- **Failure = quiet.** Non-200, timeout (hard client abort at **8 s**), or no key configured → keep the local text and show a small muted note ("AI unavailable right now — showing the built-in summary"). Never a red error, never an empty box, never an endless spinner.

## Function contract

`POST /api/summary` → `netlify/functions/summary.mjs` (redirect in `netlify.toml`)

Request (JSON):
```json
{
  "stage": "startup | scaleup | pe | established",
  "teamSize": 12,
  "need": "strategy | team | ai | initiative",
  "fullTimeCost": 400000,
  "rate": 192,
  "bestFit": "advisory | active | project",
  "advisory": { "low": 99840, "high": 149760 },
  "active":   { "low": 149760, "high": 199680 }
}
```

Response: `200 { "summary": "…", "model": "…" }` · anything else = failure (client falls back).

Function rules:
- Validate and clamp every field (enums whitelisted, numbers clamped). **Never forward free text.**
- `advisory`, `active` and `bestFit` are **recomputed server-side** from the validated inputs, not trusted from the client.
- Prompt is a fixed server-side template; the model only gets the validated numbers.
- `max_tokens` ≈ 300. Server-side timeout < client timeout.
- Env vars: `OPENROUTER_API_KEY` (required, set only in the Netlify UI — never in the repo or chat), `OPENROUTER_MODEL` (optional).
- Models: `[$OPENROUTER_MODEL || "google/gemma-4-31b-it:free", "openrouter/free"]` using OpenRouter's `models` fallback list. Verified available via `https://openrouter.ai/api/v1/models` on 2026-09-11.
- No key configured → return 503 immediately (client falls back).

## Page content

- Look: match prommer.net — minimal, navy/neutral, data-forward.
- Results: side-by-side cost bars (CSS only, no chart library), savings, best-fit card, summary, CTA.
- CTA: **"Schedule Discovery Call"** (same label as the site's own button) linking to `https://prommer.net/en/tech/services/fractional-cto/`.
- Footer: *"Independent work sample by Mikheil Gongadze — not affiliated with prommer.net."* + *"Built with Claude Code."*
- The AI endpoint URL is one constant at the top of the script, so the file can be dropped into prommer.net and pointed elsewhere.

## Build order (every step leaves something shippable)

1. ✅ Repo + `CLAUDE.md` + this design
2. ✅ `index.html`: inputs, calculation, local summary, CTA, styling. Verified in a browser (desktop + mobile) against hand-checked cases, plus AI-unavailable fallback.
3. ✅ `netlify/functions/summary.mjs` + `netlify.toml`. Unit tests: `node --test "tests/*.test.mjs"` (OpenRouter is mocked; no key or network needed).
4. Mikheil: `netlify login` (own account) → link repo → add `OPENROUTER_API_KEY` (free OpenRouter account) in Netlify UI.
5. Verify the live URL **with and without** the key.
6. README: live link, drop-in note, one-paragraph submission note.

## Parallel sessions

The interface between the page and the function is the **function contract** above. With that fixed:
- Session A owns `index.html`.
- Session B owns `netlify/functions/`, `netlify.toml`, and deployment.
- Session C owns `README.md` and the submission note.

Don't edit another session's files. If the contract must change, update this file first.
