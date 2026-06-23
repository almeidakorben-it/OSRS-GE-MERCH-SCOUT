import { OSRSItem, ScannedDeal, ScoreBreakdown, HistoricalPricePoint } from "../types";

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
 * High limit = High trade volume (e.g. runes, ammunition).
 * Low limit = High-value raid drops or rare uniques with low trade volume.
 */
export function estimateVolumeProxy(limit: number | undefined, value: number | undefined): { volumeScore: number; riskScore: number } {
  if (!limit) return { volumeScore: 10, riskScore: 50 };
  
  // High volume staples
  if (limit >= 10000) {
    return { volumeScore: 25, riskScore: 10 }; 
  }
  // Mid-tier skilling items etc.
  if (limit >= 1000) {
    return { volumeScore: 20, riskScore: 20 };
  }
  // Standard gear or armor
  if (limit >= 100) {
    return { volumeScore: 12, riskScore: 35 };
  }
  // Rare high-tier drops (limits under 40)
  if (limit <= 10) {
    return { volumeScore: 5, riskScore: 75 };
  }
  
  return { volumeScore: 15, riskScore: 30 };
}

/**
 * Implements the "Merch Momentum + Margin Hunter (v1.0)" grading algorithm.
 * Rates merchandise deals on a scale of 0-100:
 * - Margin Score (0-30 points)
 * - Volume Score (0-25 points)
 * - Momentum Score (0-25 points)
 * - Liquidity/Risk Score (0-10 points)
 * - Opportunity Score (0-10 points)
 */
export function gradeOSRSDeal(item: OSRSItem, historicalStats?: { momentum: number; volatility: number; ratio30d: number }): ScannedDeal {
  const low = item.low || 1;
  const high = item.high || 1;
  const grossMargin = Math.max(0, high - low);
  const tax = calculateOSTax(high);
  const netMargin = Math.max(0, grossMargin - tax);
  const marginPercent = low > 0 ? (netMargin / low) * 100 : 0;

  // 1. Margin Score (0-30 points)
  // Higher percentage is better. Best at >5% to 15%. Penalty for <1.5%
  let marginPoints = 0;
  if (marginPercent >= 15) marginPoints = 30;
  else if (marginPercent >= 5) marginPoints = 20 + ((marginPercent - 5) / 10) * 10;
  else if (marginPercent >= 2) marginPoints = 10 + ((marginPercent - 2) / 3) * 10;
  else if (marginPercent > 0) marginPoints = (marginPercent / 2) * 10;

  // 2. Volume Score (0-25 points)
  const volumeRisk = estimateVolumeProxy(item.limit, item.value);
  let volumePoints = volumeRisk.volumeScore;

  // 3. Momentum Score (0-25 points)
  // If we have actual historical timeseries data, use the true trend. 
  // Otherwise, approximate a positive bias based on price spread
  let momentumPoints = 12; // neutral/stable baseline
  if (historicalStats) {
    // scale from -1 (downward) to +1 (upward) trend slope
    const trend = historicalStats.momentum;
    if (trend > 0) {
      momentumPoints = 12 + Math.min(13, trend * 15);
    } else {
      momentumPoints = Math.max(0, 12 + trend * 12);
    }
  } else {
    // Without series, items where high and low are actively moving (highTime / lowTime close to each other)
    // indicate solid real-time volatility & momentum
    const hTime = item.highTime || 0;
    const lTime = item.lowTime || 0;
    const timeDiffMins = Math.abs(hTime - lTime) / 60;
    if (timeDiffMins < 10) momentumPoints += 5; // highly active
    else if (timeDiffMins > 120) momentumPoints -= 4; // slow item
  }

  // 4. Risk Score (0-10 points based on safety, so lower risk = more points)
  // Liquidity is safety. Highly volatile rares are more risky (fewer points here)
  let riskPoints = 10 - Math.floor(volumeRisk.riskScore / 10);
  if (historicalStats) {
    // If high volatility is calculated, subtract points
    const vol = Math.min(1, historicalStats.volatility);
    riskPoints = Math.max(1, Math.round((1 - vol) * 10));
  }

  // 5. Opportunity Score (0-10 points)
  // Compares to typical values. If current Low is at a substantial discount compared to the value
  let opportunityPoints = 5; // standard mean-reversion expectation
  if (historicalStats) {
    const ratio = historicalStats.ratio30d; // current low / 30d mean
    if (ratio < 0.95) {
      // cheap compared to 30d average (good buying opportunity!)
      opportunityPoints = 5 + Math.min(5, (0.95 - ratio) * 20);
    } else if (ratio > 1.05) {
      // trading expensive (higher dump hazard)
      opportunityPoints = Math.max(1, 5 - (ratio - 1.05) * 10);
    }
  } else {
    // Quick heuristic: high buy-limit items are stable opportunities
    if (item.limit && item.limit >= 5000) opportunityPoints = 8;
  }

  // Cap points
  marginPoints = Math.min(30, Math.max(0, marginPoints));
  volumePoints = Math.min(25, Math.max(0, volumePoints));
  momentumPoints = Math.min(25, Math.max(0, momentumPoints));
  riskPoints = Math.min(10, Math.max(0, riskPoints));
  opportunityPoints = Math.min(10, Math.max(0, opportunityPoints));

  const totalScore = Math.round(marginPoints + volumePoints + momentumPoints + riskPoints + opportunityPoints);

  const breakdown: ScoreBreakdown = {
    margin: Math.round(marginPoints),
    volume: Math.round(volumePoints),
    momentum: Math.round(momentumPoints),
    risk: Math.round(riskPoints),
    opportunity: Math.round(opportunityPoints),
    total: totalScore,
  };

  // Profit per limit cap calculation (Limit of items bought per 4-hour cycle)
  const limitCount = item.limit || 100;
  const projectedProfitPerLimit = netMargin * limitCount;

  return {
    item,
    grossMargin,
    tax,
    netMargin,
    marginPercent,
    riskScore: volumeRisk.riskScore, // overall 0-100 hazard meter
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

  // 2. Volatility (Standard Deviation of price divided by average)
  const sqDiffs = lows.map(val => Math.pow(val - avgLow, 2));
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / lows.length;
  const stdDev = Math.sqrt(variance);
  const volatility = avgLow > 0 ? stdDev / avgLow : 0.1;

  // 3. Momentum (Slope of simple linear regression)
  // X is 1..N, Y is Low price.
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
  // Normalized momentum from -1 to 1 based on average price slope
  const momentum = avgLow > 0 ? (slope * n) / avgLow : 0;

  //4. Ratio of current low price to average of the timeseries (mean reversion)
  const currentLow = lows[lows.length - 1];
  const ratio30d = avgLow > 0 ? currentLow / avgLow : 1.0;

  return {
    momentum: Math.min(1, Math.max(-1, momentum)),
    volatility: Math.min(1, Math.max(0, volatility)),
    ratio30d,
  };
}
