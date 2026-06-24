# OSRS GE Merch Scout

**Your Old School RuneScape Grand Exchange item discovery and flipping assistant.**

**Live Demo:** https://osrs-ge-merch-scout-459718744467.us-west2.run.app/

---

## Purpose & Use Case

GE Merch Scout scans the Grand Exchange market in real-time (or via periodic pulls) to identify high-potential merchandising opportunities. It focuses on **flipping** (buy low, sell high within hours/days) and light **merchanting** (holding trending items for short-to-medium term gains).

Pulls live prices, historical data, volume, and margins from reliable sources like the [OSRS Wiki / RuneLite Real-Time Prices API](https://prices.runescape.wiki/).

Perfect for:
- Active flippers looking for quick margins
- Merchants tracking meta shifts and post-update demand
- Beginners wanting data-driven recommendations with risk scoring

---

## Key Features

- **Live Market Scanner** — Filters thousands of items by margin %, daily volume, volatility, buy/sell ratio, and trade limits.
- **Trend Analyzer** — Detects stable/upward price patterns (e.g., W-shaped recovery graphs) and flags crashes or spikes.
- **Profit Calculator** — Estimates GP/hour after GE tax (~1-5%), buy limits, and holding time.
- **Risk Meter** — Scores items on liquidity (high volume = safer), competition, and manipulation risk.
- **Alerts** — Notifications for sudden dips, high margins, or volume surges (e.g., new content demand).
- **Portfolio Tracker** — Logs active flips, tracks P/L, and suggests cash-out timing.
- **Categorized Views** — High-volume staples, mid-tier, low-volume/high-margin items.

### Popular Flip Categories (mid-2026)
**Ammo** (arrows/darts/bolts), **runes**, **hides**, **bones**, **potions** (e.g. Bones to Peaches), **ornament kits**, and high-demand skilling/PvM supplies.

> **Always verify current margins** on [GE Tracker](https://www.ge-tracker.com/), [Flipping.gg](https://flipping.gg/), or [prices.runescape.wiki](https://prices.runescape.wiki/).

---

## Trading Algorithm: "Merch Momentum + Margin Hunter" (v1.0)

A plausible, implementable algorithm combining technical analysis, fundamentals, and arbitrage logic. (See the included Python script for a working version.)

### Core Logic

**Data Ingestion**
- Fetch latest high/low prices, 24h/7d/30d history, and volume.
- Margin % = `((Sell Price - Buy Price) / Buy Price) * 100`, adjusted for GE tax.

**Scoring System** (Total 0-100; >65 = good deal)

| Component              | Weight | Description |
|------------------------|--------|-----------|
| **Margin Score**       | 0-30   | Higher % = better. Bonus for liquid items (5-15%+). |
| **Volume Score**       | 0-25   | Favors high daily volume for fast turnover. |
| **Momentum Score**     | 0-25   | 7-day MA slope, W-patterns, recovery, post-update spikes. |
| **Liquidity & Risk**   | 0-10   | Buy limits, stability, demand drivers (PvM/skilling/PvP). |
| **Opportunity Score**  | 0-10   | Below 30-day average with rising volume. |

**Deal Ranking & Filtering**
- Sort by total score → projected GP/hour.
- Min volume, max holding time (<48h for beginners), diversification (≤20-30% capital per item).
- Recipe/Combo bonuses for crafting/repair flips.

**Execution Rules**
- Buy at or below "safe buy" price.
- Sell at "target sell" with undercutting recommendations.
- Stop-loss: >8-10% drop.
- Re-scan every 15-60 minutes.

---

## Example Output (Hypothetical Scan)

- **Top Pick**: Rune Arrows — Margin 8%, High volume, Steady PvM/PvP demand. Projected **5-10M GP/day**.
- **Emerging**: Specific ornament kit with upward momentum after meta shift.
- **Warning**: Low-volume rare with huge margin but stagnation risk.

---

## 🛠️ APIs & Data Sources

### 1. Official / Best Real-Time API (Recommended)
- **Base**: `https://prices.runescape.wiki/api/v1/osrs`
- **Source**: OSRS Wiki + RuneLite partnership (highly reliable).

**Key Endpoints**:
- Latest prices: [`/latest`](https://prices.runescape.wiki/api/v1/osrs/latest)
- Item mapping: [`/mapping`](https://prices.runescape.wiki/api/v1/osrs/mapping)
- Timeseries: [`/timeseries?timestep=1h&id=1289`](https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=1h&id=1289)  
  (timesteps: `5m`, `1h`, `6h`, `24h`, etc.)

### 2. Weird Gloop API (Excellent historical data)
- Base: `https://api.weirdgloop.org/`
- Example: `https://api.weirdgloop.org/exchange/history/osrs/all?id=ITEM_ID`

### 3. Official Jagex GE Page
- [https://secure.runescape.com/m=itemdb_oldschool/](https://secure.runescape.com/m=itemdb_oldschool/) — Top risers/fallers, most traded.

---

## Installation & Usage

```bash
git clone https://github.com/yourusername/osrs-ge-merch-scout.git
cd osrs-ge-merch-scout
pip install -r requirements.txt
python ge_merch_scout.py
