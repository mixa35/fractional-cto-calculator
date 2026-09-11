# Submission — Fractional CTO Cost Calculator for prommer.net

Live: https://mixa35.github.io/fractional-cto-calculator/
Code: https://github.com/mixa35/fractional-cto-calculator

prommer.net's advisory side has long guides and a single "Schedule Discovery Call" button, but nothing interactive between reading and booking, while the training side already runs 15+ calculators. I built a Fractional CTO vs Full-Time CTO cost calculator to close that gap: a visitor sees full-time cost compared against the site's published fractional tiers (10–15 hrs/week Strategic Advisory, 15–20 hrs/week Active Leadership), gets a suggested best fit, and lands on the existing Schedule Discovery Call button. Every number comes from prommer.net's published $400K+ full-time figure and hours ranges, or from the visitor's own inputs. A free OpenRouter model rewrites the summary through a Netlify function, with a built-in summary as the always-on baseline so the page never breaks (on the static link above, the AI button falls back to that built-in summary). Built AI-first with Claude Code in one session, with CLAUDE.md as the shared brief.

Next I'd add:
- A shareable results link or PDF for the discovery call.
- Wiring the AI rewrite to prommer.net's existing "Ask AI Tom".
