"""
Reproducible analysis script: Gold & Silver vs. VIX regime backtest, 1990-2026.
Data sources:
  - Gold/silver: World Bank Commodity Markets (via datasets/gold-prices GitHub package)
  - VIX: CBOE Volatility Index (via datasets/finance-vix GitHub package)
Run after placing gold_silver_monthly.csv (metals) and vix-daily.csv (VIX) in the working directory.
"""
import pandas as pd
import numpy as np
import statsmodels.api as sm
import json

# --- Load & merge ---
metals = pd.read_csv('gold_silver_monthly.csv', parse_dates=['date'])
metals['gold_usd_oz'] = pd.to_numeric(metals['gold_usd_oz'], errors='coerce')
metals['silver_usd_oz'] = pd.to_numeric(metals['silver_usd_oz'], errors='coerce')

vix = pd.read_csv('vix-daily.csv')
vix.columns = [c.strip() for c in vix.columns]
vix['DATE'] = pd.to_datetime(vix['DATE'])
vix['month'] = vix['DATE'].values.astype('datetime64[M]')
vix_m = vix.groupby('month').agg(vix_avg=('CLOSE', 'mean'), vix_eom=('CLOSE', 'last')).reset_index()
vix_m.rename(columns={'month': 'date'}, inplace=True)

df = pd.merge(metals, vix_m, on='date', how='inner').sort_values('date').reset_index(drop=True)
df = df.dropna(subset=['gold_usd_oz', 'silver_usd_oz', 'vix_avg'])

df['gold_ret'] = df['gold_usd_oz'].pct_change()
df['silver_ret'] = df['silver_usd_oz'].pct_change()
df['vix_chg'] = df['vix_eom'].pct_change()
df['vix_level_lag'] = df['vix_eom'].shift(1)
df.to_csv('merged_monthly.csv', index=False)

# --- Regression: metal return ~ VIX % change ---
results = {}
d = df.dropna(subset=['gold_ret', 'silver_ret', 'vix_chg']).copy()

for metal in ['gold', 'silver']:
    results[f'{metal}_corr_vix_chg'] = round(d[f'{metal}_ret'].corr(d['vix_chg']), 4)
    X = sm.add_constant(d['vix_chg'])
    y = d[f'{metal}_ret']
    model = sm.OLS(y, X).fit(cov_type='HC1')
    results[f'{metal}_reg'] = {
        'const': round(model.params['const'], 5),
        'beta_vix_chg': round(model.params['vix_chg'], 5),
        'p_beta': round(model.pvalues['vix_chg'], 5),
        'r2': round(model.rsquared, 4),
        'n': int(model.nobs),
    }

# --- Regime-conditional returns (contemporaneous VIX quartiles) ---
qc = d['vix_eom'].quantile([0.25, 0.5, 0.75]).to_dict()
def regime(v):
    if v < qc[0.25]: return 'Low Risk (Q1)'
    if v < qc[0.5]: return 'Below-Avg Risk (Q2)'
    if v < qc[0.75]: return 'Above-Avg Risk (Q3)'
    return 'High Risk (Q4)'
d['regime'] = d['vix_eom'].apply(regime)

regime_order = ['Low Risk (Q1)', 'Below-Avg Risk (Q2)', 'Above-Avg Risk (Q3)', 'High Risk (Q4)']
regime_stats = {}
for metal in ['gold', 'silver']:
    regime_stats[metal] = {
        r: {
            'mean_monthly_ret_pct': round(d[d['regime'] == r][f'{metal}_ret'].mean() * 100, 3),
            'n': int((d['regime'] == r).sum()),
        }
        for r in regime_order
    }
results['contemporaneous_regime_returns'] = regime_stats
results['regime_thresholds'] = {k: round(v, 2) for k, v in qc.items()}

with open('analysis_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print(json.dumps(results, indent=2))
