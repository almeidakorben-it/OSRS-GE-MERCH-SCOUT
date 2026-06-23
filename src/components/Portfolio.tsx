import React, { useState, useMemo } from "react";
import { PortfolioItem, OSRSItem } from "../types";
import { calculateOSTax } from "../utils/algo";
import { Sparkles, Trash2, TrendingUp, TrendingDown, Coins, Briefcase, RefreshCw, CheckCircle, Clock } from "lucide-react";

interface PortfolioProps {
  portfolio: PortfolioItem[];
  itemsList: OSRSItem[]; // passed to match against latest prices
  onUpdateStatus: (id: string, newStatus: PortfolioItem["status"]) => void;
  onDeleteTransaction: (id: string) => void;
  onClearHistory: () => void;
}

export default function Portfolio({
  portfolio,
  itemsList,
  onUpdateStatus,
  onDeleteTransaction,
  onClearHistory,
}: PortfolioProps) {
  const [aiReview, setAIReview] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  // Group items list for fast lookup
  const itemsMap = useMemo(() => {
    const map = new Map<number, OSRSItem>();
    itemsList.forEach((item) => map.set(item.id, item));
    return map;
  }, [itemsList]);

  // Calculations for overall active portfolio (not liquidated yet)
  const stats = useMemo(() => {
    let deployedCapital = 0;
    let liveProfitLoss = 0;
    let totalTaxDeductions = 0;
    let completedTradeCount = 0;

    portfolio.forEach((trans) => {
      const liveItem = itemsMap.get(trans.itemId);
      const buyVal = trans.buyPrice * trans.quantity;
      
      if (trans.status !== "liquidated") {
        deployedCapital += buyVal;
        
        if (liveItem) {
          // If selling, estimate sell value from transaction target or current instant-sell (high)
          const curSellPrice = liveItem.high || trans.targetPrice || trans.buyPrice;
          const sellVal = curSellPrice * trans.quantity;
          const tax = calculateOSTax(curSellPrice) * trans.quantity;
          
          liveProfitLoss += (sellVal - buyVal - tax);
          totalTaxDeductions += tax;
        }
      } else {
        completedTradeCount++;
        // If liquidated, use actual sell price or fall back to target
        const actualSell = trans.actualSellPrice || trans.targetPrice;
        const sellVal = actualSell * trans.quantity;
        const tax = calculateOSTax(actualSell) * trans.quantity;
        liveProfitLoss += (sellVal - buyVal - tax);
        totalTaxDeductions += tax;
      }
    });

    return {
      deployedCapital,
      liveProfitLoss,
      totalTaxDeductions,
      completedTradeCount,
    };
  }, [portfolio, itemsMap]);

  const handleFetchAIReview = async () => {
    if (portfolio.length === 0) return;
    setLoadingAI(true);
    setAIReview("");
    try {
      const response = await fetch("/api/gemini/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio }),
      });
      const data = await response.json();
      if (data.success) {
        setAIReview(data.advice);
      } else {
        setAIReview("The advisor was unable to review your portfolio at this moment.");
      }
    } catch (e) {
      setAIReview("Error connecting to Advisor. Please verify endpoint caches.");
    } finally {
      setLoadingAI(false);
    }
  };

  const formatGP = (value: number): string => {
    const isNeg = value < 0;
    const absVal = Math.abs(value);
    let out = "";
    if (absVal >= 1000000000) out = (absVal / 1000000000).toFixed(2) + "B";
    else if (absVal >= 1000000) out = (absVal / 1000000).toFixed(2) + "M";
    else if (absVal >= 1000) out = (absVal / 1000).toFixed(1) + "k";
    else out = absVal.toLocaleString();
    return (isNeg ? "-" : "+") + out;
  };

  const parseMarkdown = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let content = line;
      content = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
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

  return (
    <div id="portfolio-panel" className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-5 h-full overflow-y-auto scrollbar-thin">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-805/85 pb-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
          <Briefcase className="w-4 h-4 text-amber-500 animate-pulse" />
          Active Flipping Portfolio
        </h2>
        {portfolio.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 cursor-pointer transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      {portfolio.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
          <Clock className="w-10 h-10 text-slate-700 mb-2 animate-bounce" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ledger is Empty</h3>
          <p className="text-xs text-slate-600 max-w-[280px] mt-2">
            Setup your flip prices inside the Calculator panel on the right and click "Establish Active Portfolio Flip" to track listings.
          </p>
        </div>
      ) : (
        <>
          {/* LEDGER STATS COINS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Active Capital Invested</span>
              <span className="text-lg font-extrabold text-white font-mono mt-1">
                {stats.deployedCapital.toLocaleString()} <span className="text-xs text-amber-500 font-normal">GP</span>
              </span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Portfolio Net Gain P/L</span>
              <span className={`text-lg font-extrabold font-mono mt-1 flex items-center gap-1 ${
                stats.liveProfitLoss >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                {stats.liveProfitLoss >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
                {formatGP(stats.liveProfitLoss)}
              </span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">GE Sales Tax Loss</span>
              <span className="text-lg font-extrabold text-rose-500 font-mono mt-1">
                -{stats.totalTaxDeductions.toLocaleString()} <span className="text-xs text-rose-900 font-normal">GP</span>
              </span>
            </div>
          </div>

          {/* ACTIVE TRANSACTIONS TABLE */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950 text-xs shadow-inner">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Active Item</th>
                    <th className="py-2.5 px-2 text-right">Offer (Buy)</th>
                    <th className="py-2.5 px-2 text-right">Target (Sell)</th>
                    <th className="py-2.5 px-2 text-right">Qty</th>
                    <th className="py-2.5 px-2 text-right">Net Margin</th>
                    <th className="py-2.5 px-2">Flow Stage</th>
                    <th className="py-2.5 px-3 text-right">Trash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {portfolio.map((trans) => {
                    const liveItem = itemsMap.get(trans.itemId);
                    const gross = trans.targetPrice - trans.buyPrice;
                    const tax = calculateOSTax(trans.targetPrice);
                    const netUnit = gross - tax;
                    const netTotal = netUnit * trans.quantity;

                    // Match dynamic values
                    return (
                      <tr key={trans.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-100">{trans.name}</span>
                            <span className="text-[9px] text-slate-500">{trans.dateAdded}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-400">
                          {trans.buyPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-400">
                          {trans.targetPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-200">
                          {trans.quantity.toLocaleString()}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono font-bold ${
                          netTotal >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {netTotal >= 0 ? "+" : ""}{netTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-2">
                          {/* Stages option selector */}
                          <select
                            value={trans.status}
                            onChange={(e) => onUpdateStatus(trans.id, e.target.value as any)}
                            className={`text-[10px] font-semibold rounded px-1.5 py-1 focus:outline-none bg-slate-900 border ${
                              trans.status === "buying"
                                ? "text-amber-400 border-amber-800"
                                : trans.status === "completed"
                                ? "text-emerald-400 border-emerald-800"
                                : trans.status === "selling"
                                ? "text-blue-400 border-blue-800"
                                : "text-slate-400 border-slate-700"
                            }`}
                          >
                            <option value="buying">🛒 Buying</option>
                            <option value="completed">📦 Bought</option>
                            <option value="selling">🚀 Selling</option>
                            <option value="liquidated">💰 Sold</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => onDeleteTransaction(trans.id)}
                            className="text-slate-600 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI PORTFOLIO AUDITOR */}
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                Wise Merchant Portfolio Audit (AI)
              </span>
              <button
                onClick={handleFetchAIReview}
                disabled={loadingAI}
                className="text-[10px] font-semibold bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/50 hover:border-purple-700 text-purple-300 px-3 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1.5 leading-none"
              >
                {loadingAI ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-purple-450 border-t-transparent animate-spin mr-1" />
                    Auditing logs...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Audit portfolio holdings
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-lg min-h-[80px] text-xs">
              {loadingAI ? (
                <div className="flex flex-col items-center justify-center py-4 text-slate-500 gap-1.5">
                  <span className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <span>Auditing diversifications, gross risks, and liquidation suggestions...</span>
                </div>
              ) : aiReview ? (
                <div className="prose prose-invert max-w-none text-slate-300 text-xs text-left">
                  {parseMarkdown(aiReview)}
                </div>
              ) : (
                <p className="text-slate-500 italic text-center py-2">
                  Have the expert OSRS merchant review your entire active holdings. AI will check your capital diversification, alert you to crash threats, and suggest when to cut losses or take profits!
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
