import React, { useState } from "react";
import { Coins, Calculator, Scale, Percent, Clock } from "lucide-react";
import { calculateOSTax } from "../utils/algo";

export default function QuickCalculators() {
  // High Alch States
  const [alchItemCost, setAlchItemCost] = useState<number>(12000);
  const [alchValue, setAlchValue] = useState<number>(15000);
  const [natRuneCost, setNatRuneCost] = useState<number>(92);
  const [fireRuneCost, setFireRuneCost] = useState<number>(0); // 0 by default (uses Fire staff!)
  const [alchQuantity, setAlchQuantity] = useState<number>(1000);

  // Tax Estimator States
  const [taxSalePrice, setTaxSalePrice] = useState<number>(12000000); // 12M default

  // limit Cycle Estimator States
  const [cycleTargetQty, setCycleTargetQty] = useState<number>(10000);
  const [cycleBuyLimit, setCycleBuyLimit] = useState<number>(1000);

  // Alch Calculations
  const totalAlchCostPerUnit = alchItemCost + natRuneCost + fireRuneCost;
  const netAlchProfitPerUnit = alchValue - totalAlchCostPerUnit;
  const totalAlchProfit = netAlchProfitPerUnit * alchQuantity;

  // Tax Cap calculations
  const calculatedTax = calculateOSTax(taxSalePrice);
  const postTaxRevenue = taxSalePrice - calculatedTax;

  // Cycle Estimates (Each Grand Exchange buy limit resets every exactly 4 hours)
  const totalCyclesRequired = Math.ceil(cycleTargetQty / (cycleBuyLimit || 1));
  const totalHoursRequired = (totalCyclesRequired - 1) * 4; // first buy is instant
  const totalDaysRequired = (totalHoursRequired / 24).toFixed(1);

  return (
    <div id="quick-calculators-panel" className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-6 h-full overflow-y-auto scrollbar-thin">
      <div className="border-b border-slate-800/80 pb-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
          <Calculator className="w-4 h-4 text-amber-500 animate-pulse" />
          OSRS Mathematical Toolbox
        </h2>
        <span className="text-[10px] text-slate-500">Standalone calculators incorporating real game mechanical laws.</span>
      </div>

      {/* 1. HIGH ALCH PROFIT ESTIMATOR */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 border-b border-slate-900 pb-1.5 uppercase tracking-wider">
          <Coins className="w-4 h-4" />
          High Alch Profit Calculator
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
          <div>
            <label className="block text-[10px] uppercase font-semibold mb-1">Item Buy Price (GP):</label>
            <input
              type="number"
              value={alchItemCost}
              onChange={(e) => setAlchItemCost(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold mb-1">High Alch Output (GP):</label>
            <input
              type="number"
              value={alchValue}
              onChange={(e) => setAlchValue(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold mb-1">Nature Rune Cost (GP):</label>
            <input
              type="number"
              value={natRuneCost}
              onChange={(e) => setNatRuneCost(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold mb-1">Fire Rune Cost (GP):</label>
            <input
              type="number"
              value={fireRuneCost}
              onChange={(e) => setFireRuneCost(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-white font-mono focus:outline-none focus:border-amber-500"
              placeholder="0 with Staff"
            />
          </div>
        </div>

        <div className="mt-1">
          <label className="block text-[10px] uppercase  text-slate-500 font-semibold mb-1">Batch Alchemy Quantity:</label>
          <input
            type="number"
            value={alchQuantity}
            onChange={(e) => setAlchQuantity(Math.max(1, Number(e.target.value)))}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Alch Calculation Result Display */}
        <div className="p-3 bg-slate-900 rounded border border-slate-850 flex items-center justify-between text-xs mt-1">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500">Net Profit per High Alch Cast</span>
            <span className={`font-bold font-mono text-sm mt-0.5 ${
              netAlchProfitPerUnit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {netAlchProfitPerUnit >= 0 ? "+" : ""}{netAlchProfitPerUnit.toLocaleString()} GP
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500">Total Projected Profit</span>
            <span className={`font-extrabold font-mono text-base mt-0.5 ${
              totalAlchProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {totalAlchProfit >= 0 ? "+" : ""}{totalAlchProfit.toLocaleString()} GP
            </span>
          </div>
        </div>
      </div>

      {/* 2. OSRS TAX CALCULATOR AND CAP INDICATOR */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 border-b border-slate-900 pb-1.5 uppercase tracking-wider">
          <Scale className="w-4 h-4" />
          GE Sales Tax Capping Tool
        </h3>

        <div className="text-xs text-slate-400">
          <label className="block text-[10px] uppercase font-semibold mb-1">GE Sale Offer Price (GP):</label>
          <input
            type="number"
            value={taxSalePrice}
            onChange={(e) => setTaxSalePrice(Math.max(0, Number(e.target.value)))}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Real-time tax caps display */}
        <div className="p-3 bg-slate-900 rounded border border-slate-850 grid grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500">Gross Deducted Sales Tax</span>
            <span className="font-extrabold font-mono text-rose-500 text-sm mt-0.5">
              -{calculatedTax.toLocaleString()} GP
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500">Net Sales Profit Revenue</span>
            <span className="font-extrabold font-mono text-slate-200 text-sm mt-0.5">
              {postTaxRevenue.toLocaleString()} GP
            </span>
          </div>
        </div>

        {/* Verification indicator */}
        <p className="text-[10px] text-slate-500 italic text-center">
          *OSRS deducts exactly 1.0% tax. Any items under 100 GP are exempt. The tax cuts cap out at exactly 5,000,000 GP maximum.
        </p>
      </div>

      {/* 3. MERCH BUY LIMIT CYCLE ESTIMATOR */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-blue-400 flex items-center gap-1.5 border-b border-slate-900 pb-1.5 uppercase tracking-wider">
          <Clock className="w-4 h-4" />
          Buy Limit Cycle Estimator
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
          <div>
            <label className="block text-[10px] uppercase font-semibold mb-1">Target Quantity To Hoard:</label>
            <input
              type="number"
              value={cycleTargetQty}
              onChange={(e) => setCycleTargetQty(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold mb-1">4h Item Buy Limit:</label>
            <input
              type="number"
              value={cycleBuyLimit}
              onChange={(e) => setCycleBuyLimit(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-900 rounded border border-slate-850 grid grid-cols-3 gap-1.5 text-xs text-center">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500">Total Cycles</span>
            <span className="font-bold font-mono text-slate-200 mt-0.5">{totalCyclesRequired}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500">Active Hours</span>
            <span className="font-bold font-mono text-slate-200 mt-0.5">{totalHoursRequired}h</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500">Days Needed</span>
            <span className="font-bold font-mono text-blue-400 mt-0.5">{totalDaysRequired}d</span>
          </div>
        </div>
      </div>
    </div>
  );
}
