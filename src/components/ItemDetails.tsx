import React, { useState, useEffect } from "react";
import { OSRSItem, HistoricalPricePoint, TradingAlgoId } from "../types";
import { gradeOSRSDeal, calculateOSTax, calculateTimeseriesStats } from "../utils/algo";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Shield, TrendingUp, AlertTriangle, Calculator, Sparkles, Scale, DollarSign, Activity, HelpCircle } from "lucide-react";

interface ItemDetailsProps {
  item: OSRSItem | null;
  onAddToPortfolio: (itemId: number, name: string, price: number, quantity: number, target: number) => void;
  activeAlgoId?: TradingAlgoId;
  customWeights?: Record<string, number>;
}

export default function ItemDetails({ item, onAddToPortfolio, activeAlgoId = "momentum", customWeights }: ItemDetailsProps) {
  const [timestep, setTimestep] = useState<"5m" | "1h" | "6h" | "24h">("1h");
  const [history, setHistory] = useState<HistoricalPricePoint[]>([]);
  const [stats, setStats] = useState<{ momentum: number; volatility: number; ratio30d: number } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Profit Calculator state
  const [inputQuantity, setInputQuantity] = useState<number>(0);
  const [inputBuyPrice, setInputBuyPrice] = useState<number>(0);
  const [inputSellPrice, setInputSellPrice] = useState<number>(0);

  // Gemini AI advice state
  const [advice, setAdvice] = useState<string>("");
  const [generatingAdvice, setGeneratingAdvice] = useState(false);

  // Sync state whenever an item selection changes
  useEffect(() => {
    if (item) {
      setInputQuantity(item.limit || 100);
      setInputBuyPrice(item.low || 0);
      setInputSellPrice(item.high || 0);
      setAdvice(""); // Reset previous item AI advice
      fetchHistory();
    }
  }, [item, timestep]);

  const fetchHistory = async () => {
    if (!item) return;
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/ge/timeseries?id=${item.id}&timestep=${timestep}`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setHistory(result.data);
        const calculatedStats = calculateTimeseriesStats(result.data);
        setStats(calculatedStats);
      } else {
        setHistory([]);
        setStats(null);
      }
    } catch (e) {
      console.error("Failed to load historical charts:", e);
      setHistory([]);
      setStats(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFetchAIAdvice = async () => {
    if (!item) return;
    setGeneratingAdvice(true);
    setAdvice("");
    try {
      const response = await fetch("/api/gemini/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item }),
      });
      const data = await response.json();
      if (data.success) {
        setAdvice(data.advice);
      } else {
        setAdvice("Failed to summon the Wise Merchant Advisor. Please check network connections.");
      }
    } catch (err) {
      setAdvice("Error compiling market advice. Verify server states.");
    } finally {
      setGeneratingAdvice(false);
    }
  };

  // Human-readable GP numbers
  const formatGP = (val: number): string => {
    if (val >= 1000000000) return (val / 1000000000).toFixed(2) + "B";
    if (val >= 1000000) return (val / 1000000).toFixed(2) + "M";
    if (val >= 1000) return (val / 1000).toFixed(1) + "k";
    return val.toLocaleString();
  };

  if (!item) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[500px]">
        <HelpCircle className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-display">No Item Selected</h3>
        <p className="text-xs text-slate-500 max-w-[280px] mt-2 leading-relaxed">
          Click on any item in the Live Market Scanner on the left to pull real-time charts, calculations, and expert AI strategies.
        </p>
      </div>
    );
  }

  // Live scoring based on calculated parameters
  const deal = gradeOSRSDeal(item, stats || undefined, activeAlgoId, customWeights);
  const score = deal.scoreBreakdown.total;

  const algoName = {
    momentum: "Momentum",
    reversion: "Mean Reversion",
    volume: "Volume Surge",
    seasonal: "Seasonal Cycle",
    lurker: "Lurker Margin",
    arbitrage: "Alchemist Gap",
    ensemble: "Ensemble Consensus"
  }[activeAlgoId] || "Momentum";

  // Real-time calculation math
  const grossProfitPerUnit = Math.max(0, inputSellPrice - inputBuyPrice);
  const taxPerUnit = calculateOSTax(inputSellPrice);
  const netProfitPerUnit = Math.max(0, grossProfitPerUnit - taxPerUnit);
  const totalInvestmentNeeded = inputBuyPrice * inputQuantity;
  const totalGrossProfit = grossProfitPerUnit * inputQuantity;
  const totalTax = taxPerUnit * inputQuantity;
  const totalNetProfit = netProfitPerUnit * inputQuantity;
  const netMarginPercent = inputBuyPrice > 0 ? (netProfitPerUnit / inputBuyPrice) * 100 : 0;

  // Custom regex-based Markdown text renderer for safe clean rendering
  const parseMarkdown = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let content = line;
      // Bold items
      content = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Bullet lists
      if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-300 mt-1" dangerouslySetInnerHTML={{ __html: content.substring(2) }} />
        );
      }
      return (
        <p key={idx} className="text-slate-300 mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
      );
    });
  };

  // Risk Rating Colors & descriptions
  let riskColor = "bg-emerald-500";
  let riskBackground = "bg-emerald-500/10 border-emerald-500/20";
  let riskLabel = "Low Risk (Highly Liquid)";
  let riskDescription = "Extremely safe to trade. High volumes suggest fast listings fills and near-zero stagnation danger.";

  if (deal.riskScore >= 75) {
    riskColor = "bg-rose-500";
    riskBackground = "bg-rose-500/10 border-rose-500/20";
    riskLabel = "High Risk (Highly Illiquid)";
    riskDescription = "Massive margin potential, but trades extremely slowly. Prone to severe price swings and stagnation.";
  } else if (deal.riskScore >= 40) {
    riskColor = "bg-amber-500";
    riskBackground = "bg-amber-500/10 border-amber-500/20";
    riskLabel = "Medium Risk (Moderate Liquid)";
    riskDescription = "Decent velocity with modest profit potential. Monitor closely to avoid undercutting competition.";
  }

  // Prepare chart data format
  const chartData = history.map((p) => {
    const d = new Date(p.timestamp * 1000);
    let timeStr = "";
    if (timestep === "5m" || timestep === "1h") {
      timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      timeStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    return {
      name: timeStr,
      "Instant Buy": p.avgLowPrice,
      "Instant Sell": p.avgHighPrice,
    };
  }).filter(pt => pt["Instant Buy"] !== null && pt["Instant Sell"] !== null);

  const formatWikiIconUrl = (iconName: string) => {
    return `https://oldschool.runescape.wiki/images/${iconName.replace(/\s+/g, "_")}`;
  };

  return (
    <div id="item-details-panel" className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-lg p-5 flex flex-col gap-5 overflow-y-auto h-full scrollbar-thin">
      {/* Item Basic Details Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center p-1.5 font-bold shadow-inner relative overflow-hidden">
            {item.icon ? (
              <img
                src={formatWikiIconUrl(item.icon)}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 object-contain"
                onError={(e) => { (e.target as any).style.display = "none"; }}
              />
            ) : null}
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 leading-tight">
              {item.name}
            </h1>
            <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>ItemID: #{item.id}</span>
              <span>•</span>
              <span className={item.members ? "text-amber-500 px-1 rounded-sm bg-amber-950/20" : "text-slate-400"}>
                {item.members ? "Members Only" : "Free-to-Play Only"}
              </span>
            </span>
          </div>
        </div>

        {/* Big Combined Score Gauge */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{algoName} Score</span>
            <span className="text-[9px] text-slate-600">Algorithmic Grade</span>
          </div>
          <div className="relative flex items-center justify-center h-14 w-14 rounded-xl bg-slate-950 border border-slate-800 shadow-md">
            <span className="text-xl font-extrabold text-amber-500 leading-none">
              {score}
            </span>
            <div className={`absolute bottom-0 inset-x-0 h-1 rounded-b-xl ${
              score >= 70 ? "bg-emerald-500 animate-pulse" : score >= 55 ? "bg-amber-500" : "bg-rose-500"
            }`} />
          </div>
        </div>
      </div>

      {/* HISTORICAL CHART CONTAINER */}
      <div className="flex flex-col gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Historical Price Charts
          </span>
          {/* Timestep selector switches */}
          <div className="flex rounded-md bg-slate-900 border border-slate-800 p-0.5 text-[10px] font-medium text-slate-400">
            {["5m" as const, "1h" as const, "6h" as const, "24h" as const].map((step) => (
              <button
                key={step}
                onClick={() => setTimestep(step)}
                className={`px-2 py-1 rounded transition-colors ${
                  timestep === step ? "bg-slate-800 text-white font-bold" : "hover:text-white"
                }`}
              >
                {step === "5m" ? "5 Min" : step === "1h" ? "1 Hr" : step === "6h" ? "6 Hr" : "Daily"}
              </button>
            ))}
          </div>
        </div>

        {loadingHistory ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-500">
            <span className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mr-2" />
            Syncing OSRS Exchange timelines...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-600">
            No transaction cycles available for this interval scope.
          </div>
        ) : (
          <div className="h-48 w-full text-[10px] text-slate-500 font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSell" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#101a30" />
                <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  tickFormatter={(val) => formatGP(val)}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} GP`, ""]}
                />
                <Area type="monotone" dataKey="Instant Sell" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorSell)" />
                <Area type="monotone" dataKey="Instant Buy" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorBuy)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* CORE STATS BENTO BARS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Instant Sell (High)</span>
          <span className="text-sm font-bold text-amber-500 font-mono mt-0.5">
            {item.high ? item.high.toLocaleString() : "—"}{" "}
            <span className="text-[10px] text-slate-400 font-normal">GP</span>
          </span>
          <span className="text-[9px] text-slate-600 mt-1">Wait Sell Target</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Instant Buy (Low)</span>
          <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
            {item.low ? item.low.toLocaleString() : "—"}{" "}
            <span className="text-[10px] text-slate-400 font-normal">GP</span>
          </span>
          <span className="text-[9px] text-slate-600 mt-1">Buy Order Entry</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Full 1% GE Tax</span>
          <span className="text-sm font-bold text-rose-400 font-mono mt-0.5 text-rose-500">
            -{item.high ? calculateOSTax(item.high).toLocaleString() : "—"}{" "}
            <span className="text-[10px] text-slate-400 font-normal">GP</span>
          </span>
          <span className="text-[9px] text-slate-600 mt-1">Capped at 5M MAX</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Buy Limit (4h)</span>
          <span className="text-sm font-bold text-white font-mono mt-0.5">
            {item.limit ? item.limit.toLocaleString() : "—"}{" "}
            <span className="text-[10px] text-slate-500 font-normal">Qty</span>
          </span>
          <span className="text-[9px] text-slate-600 mt-1">OSRS mechanical cap</span>
        </div>
      </div>

      {/* METERS: SCORE BREAKDOWN & RISK meter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Margin score breakdown slider bars */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between text-xs gap-3.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 leading-none">
            <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
            Algo Score Grading Breakdown
          </span>

          <div className="flex flex-col gap-2.5">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 font-medium mb-1">
                <span>Profit Margin Capacity</span>
                <span className="text-white font-semibold">{deal.scoreBreakdown.margin} / 30</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(deal.scoreBreakdown.margin / 30) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 font-medium mb-1">
                <span>Trading Velocity</span>
                <span className="text-white font-semibold">{deal.scoreBreakdown.volume} / 25</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(deal.scoreBreakdown.volume / 25) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 font-medium mb-1">
                <span>Technical Price Momentum</span>
                <span className="text-white font-semibold">{deal.scoreBreakdown.momentum} / 25</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(deal.scoreBreakdown.momentum / 25) * 100}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-0.5">
              <div className="p-2 border border-slate-900 rounded bg-slate-900/40 text-[10px]">
                <span className="text-slate-500">Volatility Safety:</span>{" "}
                <span className="text-amber-400 font-extrabold">{deal.scoreBreakdown.risk} / 10</span>
              </div>
              <div className="p-2 border border-slate-900 rounded bg-slate-900/40 text-[10px]">
                <span className="text-slate-500">Buy Opportunity:</span>{" "}
                <span className="text-amber-400 font-extrabold">{deal.scoreBreakdown.opportunity} / 10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk meter indicator */}
        <div className={`p-4 rounded-xl border flex flex-col gap-2 ${riskBackground}`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Shield className="w-4 h-4 text-amber-500" />
            Market Risk Assessment Rating
          </div>
          <p className="text-xs font-bold text-white tracking-wide">{riskLabel}</p>
          <div className="w-full bg-slate-900/60 h-2.5 rounded-full overflow-hidden border border-slate-800 relative mt-1">
            <div className={`h-full rounded-full ${riskColor}`} style={{ width: `${deal.riskScore}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{riskDescription}</p>
        </div>
      </div>

      {/* PORTFOLIO TRANSACTION PLACEMENT & FLIPPING CALCULATOR */}
      <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 border-b border-slate-900 pb-2">
          <Calculator className="w-4 h-4 text-amber-500" />
          Interactive Flip Calculator & Portfolio Integration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs text-slate-400">
          <div>
            <label className="block text-[11px] font-medium mb-1.5">Desired Qty to trade:</label>
            <input
              type="number"
              value={inputQuantity}
              onChange={(e) => setInputQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1.5">My Buy Limit Offer (GP):</label>
            <input
              type="number"
              value={inputBuyPrice}
              onChange={(e) => setInputBuyPrice(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1.5">My Target Sale Price (GP):</label>
            <input
              type="number"
              value={inputSellPrice}
              onChange={(e) => setInputSellPrice(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Dynamic calculation outcome display */}
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-850 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px]">Total Invest Capital Needed</span>
            <span className="font-bold font-mono text-slate-200 mt-0.5">{totalInvestmentNeeded.toLocaleString()} GP</span>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px]">Gross Profit (After sell-buy)</span>
            <span className="font-bold font-mono text-slate-400 mt-0.5">+{totalGrossProfit.toLocaleString()} GP</span>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">Sales Tax Deducted</span>
            <span className="font-bold font-mono text-rose-400 mt-0.5">-{totalTax.toLocaleString()} GP</span>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] text-emerald-400">Projected Net Yield (P/L)</span>
            <span className="font-extrabold font-mono text-emerald-400 text-sm mt-0.5">+{totalNetProfit.toLocaleString()} GP ({netMarginPercent.toFixed(1)}%)</span>
          </div>
        </div>

        {/* Check to notify about the 5M GE tax cap limit */}
        {taxPerUnit === 5000000 && (
          <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded flex items-center gap-1.5 text-[10px] text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>OSRS Authenticated: 1% GE Tax Limit capped at 5 Million GP has been reached for this high-value trade!</span>
          </div>
        )}

        {/* Integration action buttons */}
        <div className="flex gap-2 justify-end text-xs">
          <button
            onClick={() => onAddToPortfolio(item.id, item.name, inputBuyPrice, inputQuantity, inputSellPrice)}
            className="px-4 py-2 bg-amber-500 rounded font-bold text-slate-950 hover:bg-amber-400 flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
          >
            <DollarSign className="w-4 h-4" />
            Establish Active Portfolio Flip
          </button>
        </div>
      </div>

      {/* EXPANDABLE SMART GEMINI ADVISOR PANEL */}
      <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5 leading-none">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            Wise Merchant Smart Advisor (v1.5)
          </span>
          <button
            onClick={handleFetchAIAdvice}
            disabled={generatingAdvice}
            className="text-[10px] font-semibold bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/50 hover:border-purple-700 text-purple-300 px-3 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1 leading-none"
          >
            {generatingAdvice ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-purple-400 border-t-transparent animate-spin mr-1" />
                Channeling market meta...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Analyze meta demand
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-lg min-h-[100px] text-xs">
          {generatingAdvice ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-1.5">
              <span className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              <span>Analyzing skilling, combat utility, and market updates...</span>
            </div>
          ) : advice ? (
            <div className="prose prose-invert max-w-none text-slate-300 text-xs">
              {parseMarkdown(advice)}
            </div>
          ) : (
            <p className="text-slate-500 italic text-center py-4">
              Click the button above to launch an AI simulation that studies current player demand, PvM bosses, PvP items, and optimal buy limits for {item.name}!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
