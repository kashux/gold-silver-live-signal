import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Search, TrendingUp, TrendingDown, Minus, AlertTriangle, Loader2 } from "lucide-react";

const REGIME_DATA = [
  { key: "Low", label: "Low risk", range: "VIX < 13.8", scoreMin: 0, scoreMax: 25, gold: 0.082, silver: 0.114, goldN: 110, silverN: 110 },
  { key: "BelowAvg", label: "Below-average risk", range: "VIX 13.8\u201317.5", scoreMin: 25, scoreMax: 50, gold: 0.436, silver: 1.011, goldN: 108, silverN: 108 },
  { key: "AboveAvg", label: "Above-average risk", range: "VIX 17.5\u201323.4", scoreMin: 50, scoreMax: 75, gold: 1.155, silver: 1.256, goldN: 110, silverN: 110 },
  { key: "High", label: "High risk", range: "VIX > 23.4", scoreMin: 75, scoreMax: 100, gold: 0.681, silver: 0.746, goldN: 110, silverN: 110 },
];

const SCENARIOS = [
  { label: "Middle East escalation", text: "Reports of a significant military escalation in the Middle East, with regional powers mobilizing forces and oil shipping routes under threat." },
  { label: "Surprise Fed rate cut", text: "The Federal Reserve unexpectedly cuts interest rates by 50 basis points, citing concerns about slowing growth, with markets caught off guard." },
  { label: "US-China trade dispute", text: "The US announces new tariffs on Chinese technology exports; China responds with retaliatory measures targeting agricultural imports." },
  { label: "Global recession fears", text: "Leading economic indicators point to a synchronized global slowdown, with recession warnings from multiple central banks and falling manufacturing PMIs." },
];

function leanFor(pct) {
  if (pct >= 0.9) return { label: "Bullish", tone: "positive" };
  if (pct >= 0.35) return { label: "Slightly bullish", tone: "positive" };
  if (pct > -0.35) return { label: "Neutral", tone: "neutral" };
  if (pct > -0.9) return { label: "Slightly bearish", tone: "negative" };
  return { label: "Bearish", tone: "negative" };
}

function regimeForScore(score) {
  return REGIME_DATA.find((r) => score >= r.scoreMin && score <= r.scoreMax) || REGIME_DATA[0];
}

function LeanBadge({ metal, pct }) {
  const lean = leanFor(pct);
  const toneClasses = {
    positive: "bg-emerald-50 text-emerald-800 border-emerald-200",
    neutral: "bg-stone-100 text-stone-700 border-stone-300",
    negative: "bg-rose-50 text-rose-800 border-rose-200",
  };
  const Icon = lean.tone === "positive" ? TrendingUp : lean.tone === "negative" ? TrendingDown : Minus;
  return (
    <div className="flex-1 rounded-lg border border-stone-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-stone-400 font-medium mb-2">{metal}</div>
      <div className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium ${toneClasses[lean.tone]}`}>
        <Icon size={14} />
        {lean.label}
      </div>
      <div className="mt-3 text-sm text-stone-500">
        Historical mean in this regime: <span className="font-mono text-stone-700">{pct >= 0 ? "+" : ""}{pct.toFixed(2)}%</span> / month
      </div>
    </div>
  );
}

export default function MetalsRiskSignal() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { score, rationale }

  const analyze = async (text) => {
    if (!text || !text.trim()) {
      setError("Paste a headline or scenario first.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          system:
            "You are a geopolitical risk scoring engine for a finance research tool. Given a news headline or scenario, output ONLY a JSON object, no preamble, no markdown fences, in the exact form: {\"risk_score\": <integer 0-100>, \"rationale\": \"<one sentence, under 25 words>\"}. The score reflects how much the scenario resembles historically elevated geopolitical/macro risk (war, conflict escalation, terrorism, major financial shocks, abrupt policy surprises) versus calm conditions. 0 = calm/low risk, 100 = severe crisis.",
          messages: [{ role: "user", content: text }],
        }),
      });
      const data = await response.json();
      const textBlock = (data.content || []).find((b) => b.type === "text");
      if (!textBlock) throw new Error("No response");
      const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const score = Math.max(0, Math.min(100, Math.round(parsed.risk_score)));
      setResult({ score, rationale: parsed.rationale || "" });
    } catch (e) {
      // Lightweight local fallback so the tool still works if the API call fails
      const t = text.toLowerCase();
      const highRisk = ["war", "invasion", "attack", "military", "conflict", "crisis", "collapse", "sanctions"];
      const medRisk = ["tariff", "tension", "dispute", "cut rates", "unexpected", "surprise", "slowdown"];
      let score = 20;
      if (highRisk.some((w) => t.includes(w))) score = 78;
      else if (medRisk.some((w) => t.includes(w))) score = 52;
      setResult({ score, rationale: "Estimated locally (API unavailable) using keyword matching \u2014 treat as a rough placeholder." });
      setError("Live scoring unavailable, showing a rough local estimate instead.");
    } finally {
      setLoading(false);
    }
  };

  const activeRegime = result ? regimeForScore(result.score) : null;
  const chartData = REGIME_DATA.map((r) => ({
    name: r.range,
    Gold: r.gold,
    Silver: r.silver,
    isActive: activeRegime && activeRegime.key === r.key,
  }));

  return (
    <div className="w-full max-w-3xl mx-auto bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="bg-stone-900 px-6 py-5">
        <h2 className="text-stone-50 text-xl" style={{ fontFamily: "Georgia, 'Iowan Old Style', serif" }}>
          Gold &amp; silver geopolitical risk signal
        </h2>
        <p className="text-stone-400 text-sm mt-1">
          Historical-context tool, not a price prediction &mdash; backtested on monthly data, 1990&ndash;2026
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Input */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Paste a headline or describe a scenario
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Central bank surprises markets with an emergency rate decision amid rising regional tensions..."
            className="w-full rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[84px]"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                onClick={() => setInput(s.text)}
                className="text-xs px-2.5 py-1 rounded-full border border-stone-300 bg-white text-stone-600 hover:bg-stone-100"
              >
                {s.label}
              </button>
            ))}
          </div>
          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
          <button
            onClick={() => analyze(input)}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-stone-900 text-stone-50 px-4 py-2 text-sm font-medium hover:bg-stone-800 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? "Scoring..." : "Analyze scenario"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-4 border-t border-stone-200 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-stone-400 font-medium">Geopolitical risk score</div>
                <div className="text-3xl font-mono text-stone-900 mt-1">{result.score}<span className="text-lg text-stone-400">/100</span></div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-stone-400 font-medium">Matched historical regime</div>
                <div className="text-sm font-medium text-stone-800 mt-1">{activeRegime.label}</div>
                <div className="text-xs text-stone-500 font-mono">{activeRegime.range}</div>
              </div>
            </div>
            <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${result.score}%` }}
              />
            </div>
            {result.rationale && (
              <p className="text-sm text-stone-600 italic">&ldquo;{result.rationale}&rdquo;</p>
            )}
            <div className="flex gap-3">
              <LeanBadge metal="Gold" pct={activeRegime.gold} />
              <LeanBadge metal="Silver" pct={activeRegime.silver} />
            </div>
          </div>
        )}

        {/* Historical chart */}
        <div className="border-t border-stone-200 pt-5">
          <div className="text-sm font-medium text-stone-700 mb-1">Mean monthly return by concurrent VIX regime</div>
          <div className="text-xs text-stone-500 mb-3">1990\u20132026, n = 438 months</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#78716c" }} />
                <YAxis tick={{ fontSize: 11, fill: "#78716c" }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v.toFixed(2)}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <ReferenceLine y={0} stroke="#a8a29e" />
                <Bar dataKey="Gold" fill="#b8860b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Silver" fill="#9ca3af" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Methodology / disclaimer */}
        <div className="border-t border-stone-200 pt-4 text-xs text-stone-500 leading-relaxed space-y-1.5">
          <p>
            <span className="font-medium text-stone-600">Data:</span> World Bank Commodity Markets (gold, silver, monthly, 1990\u20132026) and CBOE VIX (daily, aggregated to monthly). Regimes are VIX-level quartiles; regime returns are historical monthly averages, not forecasts.
          </p>
          <p>
            <span className="font-medium text-stone-600">Explanatory power:</span> gold's return has a statistically significant but small relationship with VIX changes (r&sup2; = 1.1%, p = 0.02); silver shows no statistically significant relationship (p = 0.91). Treat both leans as weak historical associations, not reliable signals.
          </p>
          <p>
            This tool provides historical context only. It is not financial advice and does not predict future prices.
          </p>
        </div>
      </div>
    </div>
  );
}
