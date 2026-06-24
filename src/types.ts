export interface OSRSItem {
  id: number;
  name: string;
  limit?: number; // buy limit (quantity per 4 hours)
  value?: number; // store buy price
  highalch?: number; // high alch value
  members?: boolean; // P2P vs F2P item
  icon?: string; // relative icon path
  high: number | null; // instant-sell price
  low: number | null; // instant-buy price
  highTime: number | null;
  lowTime: number | null;
}

export type TradingAlgoId = 'momentum' | 'reversion' | 'volume' | 'seasonal' | 'lurker' | 'arbitrage' | 'ensemble';

export interface TradingAlgo {
  id: TradingAlgoId;
  name: string;
  emoji: string;
  style: string;
  description: string;
  targetItems: string;
  bestFor: string;
}

export interface ScoreBreakdown {
  margin: number;       // 0 - 30 max
  volume: number;       // 0 - 25 max
  momentum: number;     // 0 - 25 max
  risk: number;         // 0 - 10 max
  opportunity: number;  // 0 - 10 max
  total: number;        // Sum (0 - 100)
}

export interface ScannedDeal {
  item: OSRSItem;
  grossMargin: number; // high - low
  tax: number; // 1% tax capped at 5M GP
  netMargin: number; // grossMargin - tax
  marginPercent: number; // (netMargin / low) * 100
  riskScore: number; // 0 (low risk) to 100 (high risk)
  scoreBreakdown: ScoreBreakdown;
  projectedProfitPerLimit: number; // netMargin * buyLimit
}

export interface PortfolioItem {
  id: string; // unique transaction guid
  itemId: number;
  name: string;
  buyPrice: number;
  quantity: number;
  targetPrice: number;
  actualSellPrice?: number;
  status: 'buying' | 'completed' | 'selling' | 'liquidated';
  dateAdded: string;
  notes?: string;
}

export interface PriceAlert {
  id: string;
  itemId: number;
  itemName: string;
  type: 'high_above' | 'low_below' | 'margin_above';
  value: number;
  active: boolean;
  triggered?: boolean;
}

export interface HistoricalPricePoint {
  timestamp: number;
  avgHighPrice: number | null;
  avgLowPrice: number | null;
  highPriceVolume: number;
  lowPriceVolume: number;
}
