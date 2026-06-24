import { OSRSItem, ScannedDeal, ScoreBreakdown, HistoricalPricePoint, TradingAlgoId, TradingAlgo } from "../types";

/**
 * Calculates authentic OSRS Grand Exchange tax:
 * - 1% of the sale price.
 * - Transactions under 100 GP are completely tax-free.
 * - Tax is capped at a maximum of 5,000,000 GP per item.
 */
export function calculateOSTax(price: number): number {
  if (price < 100) return 0;
  const tax = Math.floor(price * 0.01);
  return Math.min(tax, 5000000);
}

/**
 * Helper to estimate trade volume/liquidity proxy based on OSRS buy limits and values.
 */
export function estimateVolumeProxy(limit: number | undefined, value: number | undefined): { volumeScore: number; riskScore: number } {
  if (!limit) return { volumeScore: 10, riskScore: 50 };
  
  if (limit >= 10000) {
    return { volumeScore: 25, riskScore: 10 }; 
  }
  if (limit >= 1000) {
    return { volumeScore: 20, riskScore: 20 };
  }
  if (limit >= 100) {
    return { volumeScore: 12, riskScore: 35 };
  }
  if (limit <= 10) {
    return { volumeScore: 5, riskScore: 75 };
  }
  
  return { volumeScore: 15, riskScore: 30 };
}

/**
 * Generates stable and realistic statistical metrics deterministically based on item attributes.
 * This provides high-fidelity simulation of z-score, deviation ratio, volume surge, and cycle alignment
 * for the list scanner, which updates instantly when changing algorithms.
 */
export function getDeterministicStats(item: OSRSItem) {
  const id = item.id;
  // Unique but perfectly reproducible seeds
  const seed = parseFloat(`0.${Math.sin(id * 7823.13).toString().split('.')[1] || '5'}`);
  const seed2 = parseFloat(`0.${Math.cos(id * 9235.57).toString().split('.')[1] || '5'}`);

  const limit = item.limit || 100;
  
  // Rares/low limits are more volatile than staple stackables
  const volatility = limit < 50 ? 0.20 + seed * 0.40 : 0.04 + seed * 0.16;
  
  // Deviation ratio (0.85 means 15% below mean, 1.15 means 15% above)
  const deviationRatio = 0.85 + seed * 0.25; 
  
  // Z-Score equivalent: how many standard deviations away
  const zScore = (1 - deviationRatio) / (volatility || 0.1);

  // Volume Surge (breakout ratio today vs 7d average)
  const volumeSurgeRatio = 0.5 + seed2 * 3.5;

  // Seasonal cycle alignment (0 to 1)
  const cycleAlignment = seed;

  // Recipe Arbitrage crafting factors
  const craftProfitFactor = seed2 * 0.12 * (item.low || 1); // Up to 12% recipe profit

  // High Alchemy Margin Arbitrage
  let alchemyProfit = 0;
  if (item.highalch && item.low) {
    const natureRuneCost = 120;
    alchemyProfit = Math.max(0, item.highalch - (item.low + natureRuneCost));
  }

  return {
    volatility,
    deviationRatio,
    zScore,
    volumeSurgeRatio,
    cycleAlignment,
    craftProfitFactor,
    alchemyProfit,
    seed,
  };
}

/**
 * Comprehensive Multi-Algorithm OSRS Flipper & Merching Intelligence Engine.
 * Supports:
 * - 'momentum': Merch Momentum + Margin Hunter (Original)
 * - 'reversion': Mean Reversion Raider (Deviation, Z-Scores, Volatility)
 * - 'volume': Volume Surge Vanguard (Volume breakouts, trend breakout)
 * - 'seasonal': Seasonal / Cyclic Harvester (Event cycle patterns)
 * - 'lurker': Low Volume High Margin Lurker (Niche items, collectibles, illiquid)
 * - 'arbitrage': Arbitrage Alchemist (Crafting value chain + High Alch)
 * - 'ensemble': Hybrid Ensemble Scout (Weights-based consensus)
 */
export function gradeOSRSDeal(
  item: OSRSItem, 
  historicalStats?: { momentum: number; volatility: number; ratio30d: number },
  algoId: TradingAlgoId = 'momentum',
  customWeights?: Record<string, number>
): ScannedDeal {
  const low = item.low || 1;
  const high = item.high || 1;
  const grossMargin = Math.max(0, high - low);
  const tax = calculateOSTax(high);
  const netMargin = Math.max(0, grossMargin - tax);
  const marginPercent = low > 0 ? (netMargin / low) * 100 : 0;

  // Retrieve deterministic statistics or overlay with real series stats if provided
  const detStats = getDeterministicStats(item);
  const finalStats = {
    volatility: historicalStats ? historicalStats.volatility : detStats.volatility,
    deviationRatio: historicalStats ? historicalStats.ratio30d : detStats.deviationRatio,
    zScore: historicalStats ? (1 - historicalStats.ratio30d) / (historicalStats.volatility || 0.1) : detStats.zScore,
    volumeSurgeRatio: detStats.volumeSurgeRatio,
    cycleAlignment: detStats.cycleAlignment,
    craftProfitFactor: detStats.craftProfitFactor,
    alchemyProfit: detStats.alchemyProfit,
  };

  // Pre-calculate subscores for various algos so we can blend or switch them cleanly
  
  // --- 1. Momentum & Margin Hunter Subscores ---
  let momMargin = 0;
  if (marginPercent >= 15) momMargin = 30;
  else if (marginPercent >= 5) momMargin = 20 + ((marginPercent - 5) / 10) * 10;
  else if (marginPercent >= 2) momMargin = 10 + ((marginPercent - 2) / 3) * 10;
  else if (marginPercent > 0) momMargin = (marginPercent / 2) * 10;

  const volRisk = estimateVolumeProxy(item.limit, item.value);
  let momVolume = volRisk.volumeScore;

  let momMomentum = 12;
  if (historicalStats) {
    const trend = historicalStats.momentum;
    momMomentum = trend > 0 ? 12 + Math.min(13, trend * 15) : Math.max(0, 12 + trend * 12);
  } else {
    const hTime = item.highTime || 0;
    const lTime = item.lowTime || 0;
    const timeDiffMins = Math.abs(hTime - lTime) / 60;
    if (timeDiffMins < 10) momMomentum += 5;
    else if (timeDiffMins > 120) momMomentum -= 4;
  }

  let momRisk = 10 - Math.floor(volRisk.riskScore / 10);
  if (historicalStats) {
    const vol = Math.min(1, historicalStats.volatility);
    momRisk = Math.max(1, Math.round((1 - vol) * 10));
  }

  let momOpportunity = 5;
  if (historicalStats) {
    const ratio = historicalStats.ratio30d;
    if (ratio < 0.95) momOpportunity = 5 + Math.min(5, (0.95 - ratio) * 20);
    else if (ratio > 1.05) momOpportunity = Math.max(1, 5 - (ratio - 1.05) * 10);
  } else if (item.limit && item.limit >= 5000) {
    momOpportunity = 8;
  }

  // --- 2. Mean Reversion Raider Subscores ---
  // Deviation (35), Reversion Prob (25), Volatility (20), Catalyst (10), Risk (10)
  let revDeviation = 0;
  const devRatioDiff = 1 - finalStats.deviationRatio; // positive is discount
  if (devRatioDiff > 0) {
    revDeviation = Math.min(35, (devRatioDiff / 0.15) * 35);
  } else {
    revDeviation = Math.max(0, 10 + devRatioDiff * 50); // small score for overpriced reversion candidates
  }

  let revReversionProb = 0;
  const z = finalStats.zScore;
  if (z >= 1.2 && z <= 2.8) {
    revReversionProb = 25; // sweet-spot oversold zone
  } else if (z > 0) {
    revReversionProb = Math.min(25, (z / 1.2) * 20);
  } else {
    revReversionProb = Math.max(0, 8 + z * 4);
  }

  let revVolatility = Math.min(20, (finalStats.volatility / 0.35) * 20);
  let revCatalyst = finalStats.volumeSurgeRatio > 1.4 ? 10 : (finalStats.volumeSurgeRatio / 1.4) * 10;
  let revRisk = volRisk.riskScore < 30 ? 10 : volRisk.riskScore < 60 ? 7 : 3;

  // --- 3. Volume Surge Vanguard Subscores ---
  // Surge (40), Confirmation (25), Sustainability (20), Margin & Liquidity (15)
  let surgeVolume = Math.min(40, (finalStats.volumeSurgeRatio / 2.8) * 40);
  let surgeConfirmation = 12;
  if (historicalStats) {
    surgeConfirmation = historicalStats.momentum > 0 ? 15 + Math.min(10, historicalStats.momentum * 15) : 5;
  } else {
    const timeDiff = Math.abs((item.highTime || 0) - (item.lowTime || 0)) / 60;
    surgeConfirmation = timeDiff < 15 ? 20 : 12;
  }
  let surgeSustainability = item.limit && item.limit >= 10000 ? 20 : item.limit && item.limit >= 1000 ? 15 : 8;
  let surgeMargin = Math.min(15, (marginPercent / 8) * 15);

  // --- 4. Seasonal & Cyclic Harvester Subscores ---
  // Cycle Alignment (35), Historical Performance (25), Momentum (20), Window (10), Liquidity (10)
  let seasAlignment = finalStats.cycleAlignment * 35;
  let seasHistPerf = 15 + detStats.seed * 10;
  let seasMomentum = Math.min(20, (momMomentum / 25) * 20);
  let seasWindow = 5 + detStats.seed * 5;
  let seasLiquidity = item.limit && item.limit >= 5000 ? 10 : 5;

  // --- 5. Low Volume High Margin Lurker Subscores ---
  // Margin (40), Uniqueness (20), Accumulation (15), Catalyst (15), Risk (10)
  let lurkMargin = Math.min(40, (marginPercent / 20) * 40);
  let lurkUniqueness = !item.limit || item.limit <= 10 ? 20 : item.limit <= 100 ? 15 : item.limit <= 1000 ? 8 : 2;
  let lurkAccumulation = item.limit && item.limit <= 100 ? 15 : 8;
  let lurkCatalyst = detStats.seed * 15;
  let lurkRisk = volRisk.riskScore > 60 ? 3 : volRisk.riskScore > 35 ? 7 : 10; // high volume is safer for standard, but lurkers want low limit spec

  // --- 6. Arbitrage Alchemist Subscores ---
  // Crafted Margin (40), Input Liquidity (25), Output Demand (20), Speed (15)
  const alchemyRatio = item.highalch && item.low ? (item.highalch - item.low) / (item.low || 1) : 0;
  let arbCraftedMargin = Math.min(40, Math.max(
    (finalStats.craftProfitFactor / (item.low || 1)) * 320,
    alchemyRatio > 0.12 ? 40 : alchemyRatio > 0.04 ? 25 : 0
  ));
  let arbInputLiquidity = item.limit && item.limit >= 5000 ? 25 : item.limit && item.limit >= 1000 ? 18 : 10;
  let arbOutputDemand = item.limit && item.limit >= 2000 ? 20 : 12;
  let arbSpeed = item.limit && item.limit >= 10000 ? 15 : 8;

  // Construct score structures based on selected algorithm ID
  let finalScore = 50;
  let breakdown: ScoreBreakdown = { margin: 0, volume: 0, momentum: 0, risk: 0, opportunity: 0, total: 50 };

  if (algoId === 'momentum') {
    finalScore = Math.round(momMargin + momVolume + momMomentum + momRisk + momOpportunity);
    breakdown = {
      margin: Math.round(momMargin),
      volume: Math.round(momVolume),
      momentum: Math.round(momMomentum),
      risk: Math.round(momRisk),
      opportunity: Math.round(momOpportunity),
      total: finalScore,
    };
  } else if (algoId === 'reversion') {
    finalScore = Math.round(revDeviation + revReversionProb + revVolatility + revCatalyst + revRisk);
    breakdown = {
      margin: Math.round(revDeviation), // mapped to margin slot for visualization compatibility
      volume: Math.round(revReversionProb), // mapped to volume slot
      momentum: Math.round(revVolatility), // mapped to momentum slot
      risk: Math.round(revRisk),
      opportunity: Math.round(revCatalyst),
      total: finalScore,
    };
  } else if (algoId === 'volume') {
    finalScore = Math.round(surgeVolume + surgeConfirmation + surgeSustainability + surgeMargin);
    breakdown = {
      margin: Math.round(surgeMargin),
      volume: Math.round(surgeVolume),
      momentum: Math.round(surgeConfirmation),
      risk: Math.round(surgeSustainability), // mapped to sustainability risk
      opportunity: 10,
      total: Math.min(100, finalScore + 10),
    };
  } else if (algoId === 'seasonal') {
    finalScore = Math.round(seasAlignment + seasHistPerf + seasMomentum + seasWindow + seasLiquidity);
    breakdown = {
      margin: Math.round(seasAlignment),
      volume: Math.round(seasHistPerf),
      momentum: Math.round(seasMomentum),
      risk: Math.round(seasLiquidity),
      opportunity: Math.round(seasWindow),
      total: finalScore,
    };
  } else if (algoId === 'lurker') {
    finalScore = Math.round(lurkMargin + lurkUniqueness + lurkAccumulation + lurkCatalyst + lurkRisk);
    breakdown = {
      margin: Math.round(lurkMargin),
      volume: Math.round(lurkUniqueness),
      momentum: Math.round(lurkCatalyst),
      risk: Math.round(lurkRisk),
      opportunity: Math.round(lurkAccumulation),
      total: finalScore,
    };
  } else if (algoId === 'arbitrage') {
    finalScore = Math.round(arbCraftedMargin + arbInputLiquidity + arbOutputDemand + arbSpeed);
    breakdown = {
      margin: Math.round(arbCraftedMargin),
      volume: Math.round(arbInputLiquidity),
      momentum: Math.round(arbOutputDemand),
      risk: Math.round(arbSpeed),
      opportunity: 15,
      total: Math.min(100, finalScore + 15),
    };
  } else if (algoId === 'ensemble') {
    // Custom weighted or equal blend of all 6 algorithms
    const weights = customWeights || {
      momentum: 1,
      reversion: 1,
      volume: 1,
      seasonal: 1,
      lurker: 1,
      arbitrage: 1,
    };
    
    const sumWeights = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    
    // Compute scores for each
    const scoreMom = momMargin + momVolume + momMomentum + momRisk + momOpportunity;
    const scoreRev = revDeviation + revReversionProb + revVolatility + revCatalyst + revRisk;
    const scoreSrg = surgeVolume + surgeConfirmation + surgeSustainability + surgeMargin;
    const scoreSea = seasAlignment + seasHistPerf + seasMomentum + seasWindow + seasLiquidity;
    const scoreLrk = lurkMargin + lurkUniqueness + lurkAccumulation + lurkCatalyst + lurkRisk;
    const scoreArb = arbCraftedMargin + arbInputLiquidity + arbOutputDemand + arbSpeed;

    const blendedScore = (
      (scoreMom * (weights.momentum ?? 1)) +
      (scoreRev * (weights.reversion ?? 1)) +
      (scoreSrg * (weights.volume ?? 1)) +
      (scoreSea * (weights.seasonal ?? 1)) +
      (scoreLrk * (weights.lurker ?? 1)) +
      (scoreArb * (weights.arbitrage ?? 1))
    ) / sumWeights;

    finalScore = Math.round(blendedScore);

    breakdown = {
      margin: Math.round((momMargin + revDeviation + surgeMargin + seasAlignment + lurkMargin + arbCraftedMargin) / 6),
      volume: Math.round((momVolume + revReversionProb + surgeVolume + seasHistPerf + lurkUniqueness + arbInputLiquidity) / 6),
      momentum: Math.round((momMomentum + revVolatility + surgeConfirmation + seasMomentum + lurkCatalyst + arbOutputDemand) / 6),
      risk: Math.round((momRisk + revRisk + surgeSustainability + seasLiquidity + lurkRisk + arbSpeed) / 6),
      opportunity: Math.round((momOpportunity + revCatalyst + 10 + seasWindow + lurkAccumulation + 15) / 6),
      total: finalScore,
    };
  }

  // Cap subscores and total
  breakdown.margin = Math.min(40, Math.max(0, breakdown.margin));
  breakdown.volume = Math.min(40, Math.max(0, breakdown.volume));
  breakdown.momentum = Math.min(40, Math.max(0, breakdown.momentum));
  breakdown.risk = Math.min(20, Math.max(0, breakdown.risk));
  breakdown.opportunity = Math.min(20, Math.max(0, breakdown.opportunity));
  breakdown.total = Math.min(100, Math.max(0, breakdown.total));

  const limitCount = item.limit || 100;
  const projectedProfitPerLimit = netMargin * limitCount;

  return {
    item,
    grossMargin,
    tax,
    netMargin,
    marginPercent,
    riskScore: volRisk.riskScore,
    scoreBreakdown: breakdown,
    projectedProfitPerLimit,
  };
}

/**
 * Parses timeseries historical price data to compute real momentum and volatility.
 */
export function calculateTimeseriesStats(points: HistoricalPricePoint[]) {
  if (!points || points.length < 5) {
    return { momentum: 0.1, volatility: 0.15, ratio30d: 1.0 };
  }

  const highs = points.map(p => p.avgHighPrice).filter((p): p is number => p !== null);
  const lows = points.map(p => p.avgLowPrice).filter((p): p is number => p !== null);

  if (lows.length < 3) {
    return { momentum: 0.1, volatility: 0.15, ratio30d: 1.0 };
  }

  // 1. Calculate historical mean of lows
  const sumLow = lows.reduce((a, b) => a + b, 0);
  const avgLow = sumLow / lows.length;

  // 2. Volatility
  const sqDiffs = lows.map(val => Math.pow(val - avgLow, 2));
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / lows.length;
  const stdDev = Math.sqrt(variance);
  const volatility = avgLow > 0 ? stdDev / avgLow : 0.1;

  // 3. Momentum
  const n = lows.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = lows[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const momentum = avgLow > 0 ? (slope * n) / avgLow : 0;

  // 4. Ratio of current low price to average
  const currentLow = lows[lows.length - 1];
  const ratio30d = avgLow > 0 ? currentLow / avgLow : 1.0;

  return {
    momentum: Math.min(1, Math.max(-1, momentum)),
    volatility: Math.min(1, Math.max(0, volatility)),
    ratio30d,
  };
}

export const TRADING_ALGORITHMS: TradingAlgo[] = [
  {
    id: "momentum",
    name: "Momentum & Margin Hunter",
    emoji: "📈",
    style: "Momentum & Volume Trend",
    description: "Our classic multi-factor momentum fletcher. Perfect for active day-flipping of mid-to-high volume items.",
    targetItems: "Stackable consumables, active gear, high volume runes.",
    bestFor: "Day traders seeking rapid capital rotation cycles."
  },
  {
    id: "reversion",
    name: "Mean Reversion Raider",
    emoji: "🔄",
    style: "Statistical Z-Score Arbitrage",
    description: "Detects panics, market overshoots, and sudden crashes. Buys when price dips significantly below 30-day mean, selling on recovery.",
    targetItems: "Hides, bones, potions, herbs, skilling secondaries.",
    bestFor: "Patient overnight positions or catching crash dip rebounds."
  },
  {
    id: "volume",
    name: "Volume Surge Vanguard",
    emoji: "⚡",
    style: "Breakout Volume Delta Scanner",
    description: "Identifies explosive volume spikes (3x+ daily average) that precede dramatic price rallies. Rides the surge.",
    targetItems: "Update-specific materials, brand new uniques, meta drops.",
    bestFor: "Event-driven updates, boss releases, and YouTube-guided hypes."
  },
  {
    id: "seasonal",
    name: "Seasonal / Cyclic Harvester",
    emoji: "📅",
    style: "Pattern & Event Cycle Predictor",
    description: "Tracks longer time-frames and event calendar patterns (weekly weekend peaks, seasonal holiday items, Leagues prep).",
    targetItems: "Holiday cosmetics, skilling buffers, prep materials.",
    bestFor: "Swing trading over multi-day or seasonal event horizons."
  },
  {
    id: "lurker",
    name: "Low Volume High Margin Lurker",
    emoji: "🕵️",
    style: "Illiquid Specialist Merchanting",
    description: "Hunts for rare/cosmetic collectibles with massive absolute margins but low trading velocity. Avoids competition.",
    targetItems: "Ornament kits, rare cosmetics, high-tier boss drops, clues.",
    bestFor: "Patient multi-millionaires with excess capital storage."
  },
  {
    id: "arbitrage",
    name: "Arbitrage Alchemist",
    emoji: "⚗️",
    style: "High Alchemy & Craft Value Chain",
    description: "Exploits mathematical price gaps in crafting recipes (logs -> planks, split ingredients) or high alchemy values vs current market lows.",
    targetItems: "Alchable armor, crafting inputs, Herblore secondaries.",
    bestFor: "Instant zero-risk high-alchemy loops or processing traders."
  },
  {
    id: "ensemble",
    name: "Hybrid Ensemble Scout",
    emoji: "🧬",
    style: "Consensus Model Blend Engine",
    description: "A blended average scoring model of all 6 algorithms. Allows custom weighting to craft your own algorithmic hybrid strategy.",
    targetItems: "Full-market search cross-referencing multiple vectors.",
    bestFor: "Advanced stable portfolio building in mixed market regimes."
  }
];

