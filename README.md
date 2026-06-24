# OSRS GE Merch Scout

**Old School RuneScape Grand Exchange item discovery and flipping assistant.**

**Live Demo:** https://osrs-ge-merch-scout-459718744467.us-west2.run.app/

---

## Purpose & Use Case

GE Merch Scout scans the Grand Exchange market in real-time to identify high-potential flipping and merchanting opportunities. It focuses on **buy low, sell high** strategies using live prices, historical data, volume, and margins from the OSRS Wiki / RuneLite API.

Perfect for active flippers, merchants tracking meta shifts, and data-driven players.

---

## Key Features

- **Live Market Scanner** — Filters thousands of items by margin %, volume, volatility, and trade limits.
- **Trend Analyzer** — Detects upward patterns, W-shaped recoveries, crashes, and spikes.
- **Profit Calculator** — Estimates GP/hour after GE tax, buy limits, and holding time.
- **Risk Meter** — Scores liquidity, competition, and manipulation risk.
- **Alerts** — Notifications for high margins, volume surges, and sudden dips.
- **Portfolio Tracker** — Logs flips, tracks P/L, and suggests cash-out timing.
- **Categorized Views** — High-volume staples, mid-tier, and high-margin rares.

### Popular Flip Categories (mid-2026)
Ammo (arrows/darts/bolts), runes, hides, bones, potions, ornament kits, and high-demand skilling/PvM supplies.

> **Always verify current margins** on [GE Tracker](https://www.ge-tracker.com/), [Flipping.gg](https://flipping.gg/), or [prices.runescape.wiki](https://prices.runescape.wiki/).

---

## 📊 Default Trading Algorithm: Merch Momentum + Margin Hunter (v1.0)

Combines momentum, margin hunting, and technical analysis.

*(Your original detailed description here – keep it as-is)*

---

## Alternative Trading Algorithms

In addition to the default **Merch Momentum + Margin Hunter**, the tool supports (or can be extended with) multiple complementary algorithms. All are implementable using the same `prices.runescape.wiki` API.

### 1. Mean Reversion Raider
**Style**: Statistical arbitrage / reversion to the mean.  
**Best for**: Volatile mid-tier items (hides, bones, potions, herbs, secondaries).

**Core Idea**: Items often overshoot on spikes or crashes. Buy significantly below historical average and sell on recovery.

**Scoring Highlights**:
- High weight on deviation from 30/90-day mean (Z-score)
- Volume confirmation on rebound
- Moderate volatility preferred

**Key Rules**:
- Requires ≥10% deviation below mean
- Tighter stop-loss (5-7%)
- Holding period: 24–72 hours

---

### 2. Volume Surge Vanguard
**Style**: Event-driven momentum / breakout.  
**Best for**: New content drops, boss uniques, and skilling supplies after updates.

**Core Idea**: Large volume increases often precede sustained price moves (new bosses, meta shifts, popular guides, etc.).

**Scoring Highlights**:
- Volume surge magnitude (up to 40 pts)
- Price confirmation + historical sustainability

**Key Rules**:
- Buy on surge or first pullback
- Trail stops or sell in tranches
- Short holds (hours to 2–3 days)

---

### 3. Seasonal / Cyclic Harvester
**Style**: Long-term pattern recognition.  
**Best for**: Holiday items, DXP supplies, and Leagues-relevant gear.

**Core Idea**: Exploit predictable seasonal and event-based cycles (Christmas, DXP, Leagues, etc.).

**Scoring Highlights**:
- Cycle alignment and historical performance in the same window
- Remaining time in current event/meta

---

### 4. Low Volume High Margin Lurker
**Style**: Contrarian / patient merchanting.  
**Best for**: Ornament kits, rare cosmetics, and low-supply uniques.

**Core Idea**: Target illiquid items with massive margins and low competition.

**Scoring Highlights**:
- Heavy emphasis on raw margin and uniqueness
- Catalyst detection (polls, quests, etc.)

**Key Rules**:
- Longer holds (days to weeks)
- Patient accumulation

---

### 5. Arbitrage Alchemist
**Style**: Multi-step value chain.  
**Best for**: Smithing, Crafting, Herblore, and Construction supplies.

**Core Idea**: Exploit inefficiencies in crafting, repair, processing, and transformation loops.

**Examples**:
- Broken gear → Repair → Sell
- Raw materials → Processed goods
- Herblore secondaries

**Scoring Highlights**:
- Crafted margin after fees/time (highest weight)
- Input liquidity & output demand

---

### 6. Hybrid Ensemble Scout *(Recommended for Advanced Users)*
**Style**: Multi-strategy ensemble.

**Core Idea**: Run multiple algorithms in parallel and blend scores dynamically based on current market conditions (e.g., Volume Surge after updates, Mean Reversion in quiet periods).

**Benefits**: Greater robustness and higher confidence recommendations.

---

## Implementation Tips

- Aggressively cache timeseries data
- Add a "Market Regime" detector (overall volatility & GE volume)
- Store historical performance per algorithm for backtesting
- Show confidence % on every recommendation
- Web app idea: Let users toggle algorithms or create custom weightings

---

## APIs & Data Sources

*(Keep your existing API section here)*

---

## Installation & Usage

```bash
git clone <your-repo>
cd osrs-ge-merch-scout
pip install -r requirements.txt
python ge_merch_scout.py
