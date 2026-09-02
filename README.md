# Gold & Silver Geopolitical Risk Signal

An applied research project testing whether market-wide risk sentiment (proxied by the CBOE VIX) is historically associated with gold and silver returns, and an interactive tool that scores a news headline or scenario for geopolitical risk and shows the matching historical context.

**This is a research and backtesting project, not a trading system.** It does not predict future prices. See Limitations below.

## Motivation

Gold is widely described as a "safe-haven" asset that appreciates during periods of geopolitical stress and market fear. This project tests that claim directly and quantitatively using 36 years of data, and asks whether silver — often treated as gold's more volatile, more industrially-linked cousin — shows the same pattern.

## Data

- **Gold and silver prices**: World Bank Commodity Markets ("Pink Sheet"), monthly, USD/troy oz, 1990–2026 (sourced via the [`datasets/gold-prices`](https://github.com/datasets/gold-prices) package, which mirrors the official World Bank series).
- **VIX**: CBOE Volatility Index, daily open/high/low/close, 1990–2026 (sourced via [`datasets/finance-vix`](https://github.com/datasets/finance-vix)), aggregated to a monthly average and month-end value.
- Merged into a single monthly panel, n = 438 months (1990–2026), after dropping months with missing data.

## Method

1. **Contemporaneous regression**: monthly gold/silver return regressed on the monthly percentage change in VIX (month-end), with heteroskedasticity-robust (HC1) standard errors.
2. **Regime-conditional analysis**: months are split into VIX-level quartiles (using both the concurrent VIX level and the prior month's VIX level, to check both contemporaneous association and simple predictive lag). Mean and median monthly returns are computed within each quartile for both metals.
3. **Gold/silver ratio**: tracked over time and checked for correlation with VIX level.

## Key findings

| | Gold | Silver |
|---|---|---|
| Correlation with monthly VIX change | 0.10 | 0.01 |
| Regression β (return on VIX % change) | 0.017 (p = 0.02) | 0.002 (p = 0.91) |
| R² | 1.1% | 0.0% |

- Gold shows a **small but statistically significant** positive relationship with rising VIX — consistent with the safe-haven narrative, but the effect size is modest: VIX changes explain only about 1% of the variance in monthly gold returns.
- Silver shows **no statistically significant relationship** with VIX changes. This is consistent with silver's dual character as a monetary and industrial metal — its industrial-demand sensitivity appears to dilute any pure safe-haven effect.
- Regime-conditional returns for both metals are **not cleanly monotonic** across VIX quartiles — the highest average returns for both gold and silver occur in the "above-average" rather than the "high" risk quartile, which cautions against reading crisis-level fear as the best time to expect metal-price gains.

Full regression output and regime tables: `analysis_results.json`. Charts: `chart_prices.png`, `chart_scatter_gold_vix.png`, `chart_regime_returns.png`, `chart_gs_ratio.png`.

## Interactive tool

`gold_silver_risk_signal.jsx` — a scenario-scoring tool that sends a pasted headline or scenario description to the Claude API, receives a 0–100 geopolitical risk score, maps it to the closest historical VIX-quartile regime from this analysis, and displays the historical mean return for gold and silver in that regime — framed explicitly as historical context, not a prediction. Includes an honest confidence caveat (R² and significance) directly in the UI, and a keyword-based local fallback if the API call fails.

## Limitations

- **Correlation, not causation.** The regression and regime analysis document historical association, not a causal or reliably predictive relationship.
- **VIX is a US equity-market fear gauge**, not a direct geopolitical risk index. It is a widely used proxy in the academic literature, but it also reflects non-geopolitical sources of volatility (earnings shocks, monetary policy, liquidity events).
- **Effect sizes are small.** Even where statistically significant, VIX changes explain a small share of monthly gold return variance; this is not a tradeable signal on its own.
- **No causality direction is established** — the analysis does not distinguish whether risk sentiment moves metals prices, or whether both respond to a common underlying shock.
- **Monthly frequency** smooths over intraday/daily dynamics that a live trading application would need to consider.

## Possible extensions

- Replace/complement VIX with the Caldara–Iacoviello Geopolitical Risk (GPR) Index, a purpose-built geopolitical risk measure (not used here due to data-access constraints in this build).
- Add USD index (DXY) as a control, since gold is priced in USD and has a well-documented inverse relationship with dollar strength.
- Extend to daily frequency and test lead-lag relationships more formally (Granger causality, VAR).
- Add copper as an industrial-metal counterpoint to sharpen the safe-haven vs. industrial-demand distinction.

## Files

```
merged_monthly.csv          # final analysis dataset
analysis_results.json       # full regression + regime output
build_analysis.py           # analysis script (reproducible)
chart_prices.png
chart_scatter_gold_vix.png
chart_regime_returns.png
chart_gs_ratio.png
gold_silver_risk_signal.jsx # interactive tool
README.md
```
