# Fractional CTO vs Full-Time CTO — Cost Calculator

A small interactive calculator built for [prommer.net](https://prommer.net) as a work-sample test.

**Live:** _link added after the first Netlify deploy_

## Why this

The Tech & AI advisory side of prommer.net has lots of guides and a "Schedule Discovery Call" button, but nothing interactive in between. (The training side, by contrast, has 15+ calculators.) This calculator fills that gap. A company visitor compares the yearly cost of a full-time CTO hire with a fractional engagement, sees which option fits their situation, and lands on the site's existing "Schedule Discovery Call" button.

## Where the numbers come from

Every number on the page is either **published by prommer.net** or **set by the visitor**:

- Full-time CTO: starts at **$400K/yr**, the figure on [prommer.net's Fractional CTO page](https://prommer.net/en/tech/services/fractional-cto/) (*"without the $400K+ annual cost of a full-time hire"*).
- Engagement models from the same page: **10–15 hrs/week** (Strategic Advisory), **15–20 hrs/week** (Active Leadership), **Project-Based**.
- prommer.net doesn't publish a fractional rate, so the visitor sets it. The slider starts at the full-time equivalent rate ($400K ÷ 2,080 hrs = $192/hr), so even the starting value comes from the site's own figure.
- Yearly cost = hours per week × rate × 52 weeks.

## The AI part

The page always writes a built-in summary of the result with no network call. **Rewrite with AI** sends the validated inputs to a small Netlify function (`netlify/functions/summary.mjs`), which asks a free [OpenRouter](https://openrouter.ai) model (Gemma 4 31B, with OpenRouter's free router as backup) to rewrite it. If the AI is slow, rate-limited or not configured, the built-in summary simply stays on screen. The page never shows an error box or a hanging spinner.

The function only accepts known values and clamped numbers, recomputes all costs itself, and uses a fixed prompt, so the model only ever sees validated figures.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole calculator: one self-contained file, no build step |
| `netlify/functions/summary.mjs` | The AI rewrite endpoint (`POST /api/summary`) |
| `tests/summary.test.mjs` | Unit tests for the function (`node --test "tests/*.test.mjs"`) |
| `netlify.toml` | Netlify config: publish the repo root, plus the function |
| `CLAUDE.md` | The brief every AI session in this repo works from: why the project exists |
| `docs/design.md` | Engineering decisions, calculation rules, and the function contract |

## Dropping it into prommer.net

`index.html` works on its own anywhere, with all the calculator logic inside it. The only external piece is the AI rewrite: it calls `/api/summary`, which is set by the `AI_ENDPOINT` constant at the top of the script. Without that endpoint, the page works fully and just keeps the built-in summary.

## Deploying

1. On Netlify: **Add new project → Import an existing project → GitHub →** pick this repo → **Deploy**. No build settings needed; `netlify.toml` covers it. The calculator is live at this point.
2. Optional, to turn on the AI rewrite: create a free key at [openrouter.ai](https://openrouter.ai/keys), then add it in Netlify under **Project configuration → Environment variables** as `OPENROUTER_API_KEY`, and redeploy. `OPENROUTER_MODEL` can override the default model.

## How it was built

Built AI-first with [Claude Code](https://claude.com/claude-code) in a single working session: site research, idea selection, design, build, browser testing and tests. `CLAUDE.md` and `docs/design.md` are the shared briefs the AI sessions worked from.

---

*Independent work sample by Mikheil Gongadze. Not affiliated with or endorsed by Thomas Prommer or prommer.net.*
