# Fractional CTO vs Full-Time CTO — Cost Calculator

A small interactive calculator built for [prommer.net](https://prommer.net) as a work-sample test. A company visitor compares the yearly cost of a full-time CTO hire with a fractional engagement, sees which option fits their situation, and lands on the site's existing "Schedule Discovery Call" button. **Copy link to this comparison** saves the inputs in the URL, so a founder can send their exact scenario to a cofounder or board before booking.

**Live:** https://mixa35.github.io/fractional-cto-calculator/ (static host, so the AI rewrite falls back to the built-in summary; the Netlify deploy below turns it on)

## Why this

The Tech & AI advisory side of prommer.net is where the business makes money. It has lots of guides and a "Schedule Discovery Call" button, but no interactive tools between reading a guide and booking a call. (The training side, by contrast, has 15+ calculators.) This calculator fills that gap.

## Where the numbers come from

Every number on the page is either **published by prommer.net** or **set by the visitor**:

- **Full-time CTO:** starts at **$400K/yr**, the figure on [prommer.net's Fractional CTO page](https://prommer.net/en/tech/services/fractional-cto/) (*"without the $400K+ annual cost of a full-time hire"*).
- **Engagement models** from the same page: **10–15 hrs/week** (Strategic Advisory), **15–20 hrs/week** (Active Leadership), **Project-Based**.
- **Fractional rate:** prommer.net doesn't publish one, so the visitor sets it. The slider starts at the full-time equivalent rate ($400K ÷ 2,080 hrs = $192/hr), so even the starting value comes from the site's own figure.
- **Yearly cost** = hours per week × rate × 52 weeks.

## The AI part

The page always writes a built-in summary of the result, with no network call.

**Rewrite with AI** sends the validated inputs to a small Netlify function (`netlify/functions/summary.mjs`). It asks a free [OpenRouter](https://openrouter.ai) model (Gemma 4 31B, with OpenRouter's free router as backup) to rewrite the summary.

If the AI is slow, rate-limited or not configured, the built-in summary simply stays on screen. The page never shows an error box or a hanging spinner.

The function only accepts known values and clamped numbers, recomputes all costs itself, and uses a fixed prompt, so the model only ever sees validated figures.

## Testing

**Automated tests** in `tests/summary.test.mjs`. Run with `npm test` (or `node tests/summary.test.mjs`). OpenRouter is mocked, so no key or network is needed. They cover:

- input validation and clamping
- server-side cost recompute
- the best-fit rules
- a prompt that contains only validated facts
- the function's error paths: 503 with no key, 405/400 on bad requests, 502 when the provider fails
- CORS: preflight and POST allow only `https://prommer.net` and `https://www.prommer.net`; any other origin gets no `Access-Control-Allow-Origin`

**Live browser smoke test** on the deployed GitHub Pages site, at desktop width and at 390px mobile:

- two scenarios, with the numbers hand-checked (rate × hours × 52)
- the AI fallback confirmed graceful: no spinner, no error box
- the "Schedule Discovery Call" link confirmed
- no horizontal scroll on mobile

**Shareable link**, checked in a browser: a shared link restores every input and the same results, and a malformed link (negative numbers, text, `<script>`) is clamped to the slider limits or ignored.

**Independent code audit:**

- every dollar figure traces to the published $400K or to the visitor's own inputs
- costs are recomputed and clamped server-side
- there's no path for user text to reach `innerHTML`
- the API key stays server-side

## Files

| File | What it is |
|---|---|
| `index.html` | The whole calculator: one self-contained file, no build step |
| `netlify/functions/summary.mjs` | The AI rewrite endpoint (`POST /api/summary`) |
| `tests/summary.test.mjs` | Unit tests for the function (see [Testing](#testing)) |
| `netlify.toml` | Netlify config: publish the repo root, plus the function |
| `package.json` | Only there so `npm test` works; no dependencies |
| `CLAUDE.md` | The brief every AI session in this repo works from: why the project exists |
| `docs/design.md` | Engineering decisions, calculation rules, and the function contract |

## Dropping it into prommer.net

`index.html` works on its own anywhere, with all the calculator logic inside it.

The only external piece is the AI rewrite. It calls `/api/summary`, which is set by the `AI_ENDPOINT` constant at the top of the script. Without that endpoint, the page works fully and just keeps the built-in summary.

If the function is hosted on a different domain (for example a separate Netlify site), point `AI_ENDPOINT` at its full URL. The function already answers the browser's CORS preflight for prommer.net, and only for prommer.net.

## Deploying

1. **On Netlify:** **Add new project → Import an existing project → GitHub →** pick this repo → **Deploy**. No build settings needed; `netlify.toml` covers it. The calculator is live at this point.
2. **Optional, to turn on the AI rewrite:** create a free key at [openrouter.ai](https://openrouter.ai/keys), add it in Netlify under **Project configuration → Environment variables** as `OPENROUTER_API_KEY`, and redeploy. `OPENROUTER_MODEL` can override the default model.

## How it was built

Built AI-first with [Claude Code](https://claude.com/claude-code) in a single working session: site research, idea selection, design, build, browser testing and tests. `CLAUDE.md` and `docs/design.md` are the shared briefs the AI sessions worked from.

---

*Independent work sample by Mikheil Gongadze. Not affiliated with or endorsed by Thomas Prommer or prommer.net.*
