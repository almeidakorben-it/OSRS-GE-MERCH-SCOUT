Site: https://osrs-ge-merch-scout-459718744467.us-west2.run.app
Purpose and use case: 

Key Features

Live Market Scanner: Filters thousands of items by criteria like margin %, daily volume, volatility, buy/sell ratio, and trade limits.
Trend Analyzer: Detects items with stable or upward price patterns (e.g., W-shaped graphs indicating recovery) and flags crashes or spikes.
Profit Calculator: Estimates GP/hour after GE tax (typically ~1-5% depending on item value), buy limits, and holding time.
Risk Meter: Scores items on liquidity (high volume = safer), competition, and manipulation risk.
Alerts: Notifications for sudden dips, high margins, or volume surges (e.g., post-update demand for new content items).
Portfolio Tracker: Logs your active flips, tracks P/L, and suggests when to cash out.
Categories: High-volume staples (runes, arrows, food), mid-tier (hides, potions, skilling supplies), and low-volume/high-margin (boss uniques, ornament kits).

Popular Flip Categories (as of mid-2026): Ammo (arrows/darts/bolts), runes, hides, bones, potions (e.g., Bones to Peaches), ornament kits, and high-demand skilling/PvM supplies. Always verify current margins on sites like GE Tracker, Flipping.gg, or prices.runescape.wiki.
Made-Up Trading Algorithm: "Merch Momentum + Margin Hunter" (v1.0)
This is a fictional but plausible algo you could implement in Python (using APIs like prices.runescape.wiki or weirdgloop.org for historical data). It combines technical analysis (momentum/trends), fundamental (volume & utility), and arbitrage logic.
Core Logic (Pseudo-Code Style)

Data Ingestion:

   * Fetch latest high/low prices, 24h/7d/30d history, and volume for all (or filtered) items.
   * Compute: Current margin % = ((Instant Sell Price - Instant Buy Price) / Instant Buy Price) * 100. Adjust for GE tax.

Scoring System (total score 0-100; threshold > 65 for "good deal"):

   * Margin Score (0-30): Higher % = better. Bonus for >5-15% on liquid items. Penalty for <2%.
   * Volume Score (0-25): High daily volume (>10k-100k+ trades) for fast turnover. Low volume only if margin is exceptional.
   * Momentum Score (0-25):
     * Check recent price trend (e.g., 7-day moving average slope positive or recovering from dip).
     * Detect "W" patterns or steady upward drift (good for flipping/investing).
     * Bonus for post-update demand spikes (e.g., new boss drops or meta shifts).
   * Liquidity & Risk Score (0-10): Buy limit compatibility, price stability (low volatility), and demand drivers (PvM, skilling, PvP use).
   * Opportunity Score (0-10): Compare to 30-day average price. Flag items trading below historical mean with rising volume.

Deal Ranking & Filtering:

   * Sort by combined score, then by projected GP/hour.
   * Filters:
     * Min volume threshold (e.g., avoid dead items with "?" uncertainty).
     * Max holding time (e.g., prefer <48h flips for beginners).
     * Diversification: Max 20-30% of capital per item.
   * Recipe/Combo Bonus: Detect profitable crafting/repair flips (e.g., buy broken items, repair, sell).

Execution Rules:

   * Buy at or below calculated "safe buy" (low price + small buffer).
   * Sell at "target sell" (high price - buffer for speed).
   * Auto-recommend undercutting by 1-5% based on order book if data available.
   * Stop-loss: Sell if price drops >8-10% unexpectedly.
   * Daily refresh: Re-scan every 15-60 mins during active hours.
Example Output for a Hypothetical Scan

Top Pick: Rune Arrows – Margin 8%, High volume, Steady demand from PvM/PvP. Projected 5-10M GP/day with good capital.
Emerging: Specific ornament kit showing upward momentum after a meta shift.
Warning: Low-volume rare with huge margin but high risk of stagnation. 1. Official / Best Real-Time API (Recommended)

  * Endpoint: https://prices.runescape.wiki/api/v1/osrs
  * Source: OSRS Wiki + RuneLite partnership (very reliable, updated frequently).
  Key Endpoints:
  * Latest prices: https://prices.runescape.wiki/api/v1/osrs/latest Returns current high/low prices and timestamps for many items.
  * Mapping (item list): https://prices.runescape.wiki/api/v1/osrs/mapping Gets all item IDs, names, limits, etc.
  * Time series / History for a specific item: https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=5m&id=ITEM_ID (Common timesteps: 5m, 1h, 6h, 24h, etc.)
  Example (curl or browser):
  text
   &nbsp;&nbsp;https://prices.runescape.wiki/api/v1/osrs/latest &nbsp;&nbsp;
  Or for a specific item (e.g., Rune Scimitar ID 1289):
  text
   &nbsp;&nbsp;https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=1h&id=1289 &nbsp;&nbsp;
  2. Weird Gloop API (Great for Historical Data)
  * Base: https://api.weirdgloop.org/
  * Example: https://api.weirdgloop.org/exchange/history/osrs/all?id=ITEM_ID Good for longer price/volume history.
  3. Official Jagex GE Page (Daily data)
  * https://secure.runescape.com/m=itemdb_oldschool/ Top risers/fallers, most traded, etc. (Less developer-friendly but useful for quick checks).
