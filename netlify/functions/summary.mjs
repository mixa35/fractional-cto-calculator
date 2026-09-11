// POST /api/summary — rewrites the calculator's summary with a free
// OpenRouter model. The page works without this: any non-200 response makes
// the client keep its built-in summary. See docs/design.md for the contract.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemma-4-31b-it:free";
const FALLBACK_MODEL = "openrouter/free";
const UPSTREAM_TIMEOUT_MS = 7000; // the page gives up at 8 s
const MAX_BODY_CHARS = 2000;
// Sites allowed to call this function cross-origin (the page embedded on
// prommer.net while this function runs on a separate Netlify site). Never "*".
const ALLOWED_ORIGINS = new Set(["https://prommer.net", "https://www.prommer.net"]);

const HOURS_PER_WEEK_FULL_TIME = 40;
const WEEKS_PER_YEAR = 52;
const TIERS = {
  advisory: { name: "Strategic Advisory", low: 10, high: 15 },
  active: { name: "Active Leadership", low: 15, high: 20 },
};
const STAGES = {
  startup: "a startup",
  scaleup: "a scale-up",
  pe: "a PE portfolio company",
  established: "an established company",
};
const NEEDS = {
  strategy: "tech strategy and a roadmap",
  team: "someone to build and lead the engineering team",
  ai: "AI strategy and adoption",
  initiative: "help with one specific initiative",
};

const env = (name) => globalThis.Netlify?.env.get(name) ?? process.env[name];

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const json = (status, body, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders },
  });

// Echoes the Origin back only when it is allowlisted; otherwise adds nothing,
// so same-origin requests (and disallowed sites) get exactly the old headers.
const corsHeaders = (req) => {
  const origin = req.headers.get("Origin");
  return origin && ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};
};

const preflight = (req) =>
  new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(req),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });

// Accepts only known enum values and clamped numbers. Costs and the best-fit
// tier are recomputed here rather than trusted from the client.
export function parseInput(body) {
  if (!body || typeof body !== "object") return null;
  const stage = Object.hasOwn(STAGES, body.stage) ? body.stage : null;
  const need = Object.hasOwn(NEEDS, body.need) ? body.need : null;
  const teamSize = clamp(body.teamSize, 0, 100);
  const fullTimeCost = clamp(body.fullTimeCost, 150000, 1000000);
  const rate = clamp(body.rate, 50, 1000);
  if (!stage || !need || teamSize === null || fullTimeCost === null || rate === null) return null;

  const cost = (tier) => ({
    low: tier.low * rate * WEEKS_PER_YEAR,
    high: tier.high * rate * WEEKS_PER_YEAR,
  });
  const bestFit = need === "initiative" ? "project" : need === "team" || teamSize > 15 ? "active" : "advisory";

  return {
    stage,
    need,
    teamSize,
    fullTimeCost,
    rate,
    fteRate: Math.round(fullTimeCost / (HOURS_PER_WEEK_FULL_TIME * WEEKS_PER_YEAR)),
    advisory: cost(TIERS.advisory),
    active: cost(TIERS.active),
    bestFit,
  };
}

const usd = (n) => "$" + n.toLocaleString("en-US");

export function buildMessages(s) {
  const best = s.bestFit === "project" ? "Project-Based (scoped per initiative, no yearly figure)" : TIERS[s.bestFit].name;
  const facts = [
    `Visitor: ${STAGES[s.stage]} with ${s.teamSize >= 100 ? "100+" : s.teamSize} engineers that needs ${NEEDS[s.need]}.`,
    `Full-time CTO all-in cost (visitor's figure): ${usd(s.fullTimeCost)} a year.`,
    `Fractional hourly rate (visitor's figure): ${usd(s.rate)}/hr.`,
    `Strategic Advisory, 10–15 hrs a week: ${usd(s.advisory.low)}–${usd(s.advisory.high)} a year.`,
    `Active Leadership, 15–20 hrs a week: ${usd(s.active.low)}–${usd(s.active.high)} a year.`,
    `Project-Based: scoped per initiative, no yearly figure.`,
    `Rule-based best fit: ${best}.`,
    `Yearly costs assume 52 weeks.`,
  ].join("\n");

  return [
    {
      role: "system",
      content:
        "You write the summary for a fractional-CTO cost calculator. " +
        "Use only the facts provided. Never invent prices, rates, clients, credentials, or guarantees. " +
        "Write 3 or 4 plain sentences, under 90 words, addressed to the visitor as 'you'. " +
        "No markdown, no bullet points, no headings. " +
        "Explain which option fits and why, compare its cost with the full-time hire, " +
        "and end by suggesting a discovery call to get a real number.",
    },
    { role: "user", content: facts },
  ];
}

export default async (req) => {
  if (req.method === "OPTIONS") return preflight(req);
  if (req.method !== "POST") return json(405, { error: "Use POST." });

  const cors = corsHeaders(req);
  const reply = (status, body) => json(status, body, cors);

  const apiKey = env("OPENROUTER_API_KEY");
  if (!apiKey) return reply(503, { error: "AI is not configured." });

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return reply(413, { error: "Request too large." });

  let input;
  try {
    input = parseInput(JSON.parse(raw));
  } catch {
    input = null;
  }
  if (!input) return reply(400, { error: "Invalid calculator input." });

  const primary = env("OPENROUTER_MODEL") || DEFAULT_MODEL;
  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Fractional CTO Cost Calculator",
      },
      body: JSON.stringify({
        models: [primary, FALLBACK_MODEL],
        messages: buildMessages(input),
        max_tokens: 300,
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstream.ok) return reply(502, { error: `Model provider returned ${upstream.status}.` });

    const data = await upstream.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return reply(502, { error: "Model returned no text." });

    const summary = text.replace(/[*_#`]/g, "").replace(/\s+/g, " ").trim().slice(0, 900);
    return reply(200, { summary, model: data.model || primary });
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return reply(timedOut ? 504 : 502, { error: timedOut ? "Model timed out." : "Model request failed." });
  }
};

export const config = { path: "/api/summary" };
