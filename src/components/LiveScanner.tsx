import React, { useState, useMemo } from "react";
import { OSRSItem, ScannedDeal } from "../types";
import { gradeOSRSDeal } from "../utils/algo";
import { Search, SlidersHorizontal, ArrowUpDown, Shield, Flame, Star, Coins, Info } from "lucide-react";

interface LiveScannerProps {
  items: OSRSItem[];
  onSelectItem: (item: OSRSItem) => void;
  selectedItemId: number | null;
  starredIds: number[];
  onToggleStar: (itemId: number) => void;
}

export default function LiveScanner({
  items,
  onSelectItem,
  selectedItemId,
  starredIds,
  onToggleStar,
}: LiveScannerProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "staples" | "skilling" | "rares" | "starred">("all");
  const [minScore, setMinScore] = useState<number>(40);
  const [maxPrice, setMaxPrice] = useState<number>(50000000); // 50M max default
  const [membersFilter, setMembersFilter] = useState<"all" | "members" | "free">("all");
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<"score" | "netMargin" | "marginPercent" | "limit" | "name">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Format GP numbers to human-readable form like "10k", "5.2M", "2.1B"
  const formatGP = (value: number): string => {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + "B";
    if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
    if (value >= 1000) return (value / 1000).toFixed(1) + "k";
    return value.toLocaleString();
  };

  // Grade the items and filter them
  const deals = useMemo(() => {
    return items
      .map((item) => gradeOSRSDeal(item))
      .filter((deal) => {
        // 1. Search term
        const nameMatch = deal.item.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!nameMatch) return false;

        // 2. Score threshold
        if (deal.scoreBreakdown.total < minScore) return false;

        // 3. Price limit (on high buy price)
        const buyPrice = deal.item.low || 0;
        if (buyPrice > maxPrice) return false;

        // 4. Membership
        if (membersFilter === "members" && !deal.item.members) return false;
        if (membersFilter === "free" && deal.item.members) return false;

        // 5. Category preset filter
        const limit = deal.item.limit || 0;
        if (activeCategory === "starred") {
          return starredIds.includes(deal.item.id);
        }
        if (activeCategory === "staples") {
          return limit >= 10000;
        }
        if (activeCategory === "skilling") {
          return limit >= 1000 && limit < 10000;
        }
        if (activeCategory === "rares") {
          return limit < 100;
        }

        return true;
      });
  }, [items, searchTerm, activeCategory, minScore, maxPrice, membersFilter, starredIds]);

  // Sort deals
  const sortedDeals = useMemo(() => {
    const sorted = [...deals];
    sorted.sort((a, b) => {
      let valueA: any, valueB: any;
      if (sortBy === "score") {
        valueA = a.scoreBreakdown.total;
        valueB = b.scoreBreakdown.total;
      } else if (sortBy === "netMargin") {
        valueA = a.netMargin;
        valueB = b.netMargin;
      } else if (sortBy === "marginPercent") {
        valueA = a.marginPercent;
        valueB = b.marginPercent;
      } else if (sortBy === "limit") {
        valueA = a.item.limit || 0;
        valueB = b.item.limit || 0;
      } else {
        valueA = a.item.name;
        valueB = b.item.name;
      }

      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [deals, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const currentCategoryLabel = {
    all: "All Scanned Items",
    staples: "High-Volume Staples (Runes, Ammo)",
    skilling: "Skilling / PvM Supplies",
    rares: "High-Tier Rarities / Uniques",
    starred: "My Starred Targets",
  }[activeCategory];

  return (
    <div id="live-scanner-panel" className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-lg p-5 flex flex-col h-full">
      {/* Search and Category Toggle Header */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            Live Market Scanner
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-lg border transition-all cursor-pointer ${
              showFilters
                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                : "bg-slate-800/80 border-slate-700 hover:bg-slate-700/80 text-slate-300"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Adjust Filters
          </button>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex gap-1 overflow-x-auto pb-1.5 border-b border-slate-800/80 scrollbar-thin">
          {[
            { id: "all", label: "All Opportunities" },
            { id: "staples", label: "🔑 Staples" },
            { id: "skilling", label: "🧪 Skilling/PvM" },
            { id: "rares", label: "⚔️ Rarities" },
            { id: "starred", label: "⭐ Starred Targets" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? "bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Expanded Filters panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800 border-dashed text-xs">
            {/* Min score filter */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px] flex justify-between">
                <span>Min Deal Score:</span>
                <span className="text-amber-500">{minScore} / 100</span>
              </label>
              <input
                type="range"
                min="0"
                max="90"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Max investment price filter */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px] flex justify-between">
                <span>Max Buy Budget:</span>
                <span className="text-amber-500">{formatGP(maxPrice)} GP</span>
              </label>
              <select
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="10000">Below 10k GP</option>
                <option value="100000">Below 100k GP</option>
                <option value="1000000">Below 1M GP</option>
                <option value="10000000">Below 10M GP</option>
                <option value="50000000">Below 50M GP</option>
                <option value="500000000">Below 500M GP</option>
                <option value="5000000000">No Limit</option>
              </select>
            </div>

            {/* Member vs F2P filter */}
            <div className="flex flex-col gap-2">
              <span className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">World Restriction:</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: "all", label: "All" },
                  { id: "members", label: "P2P" },
                  { id: "free", label: "F2P" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setMembersFilter(opt.id as any)}
                    className={`px-2 py-1 rounded border text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                      membersFilter === opt.id
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-400 font-bold"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-705"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search input bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search thousands of OSRS items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg pl-9 pr-4 py-2.5 placeholder-slate-600 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Scanned opportunities status indicators */}
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 px-1">
        <span>{currentCategoryLabel} ({sortedDeals.length} results)</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live updates every 30s
        </span>
      </div>

      {/* Scanner Opportunity Table */}
      <div className="flex-1 overflow-y-auto min-h-[400px] border border-slate-800 rounded-lg bg-slate-950 scrollbar-thin">
        {sortedDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
            <Info className="w-8 h-8 text-slate-700 mb-2 animate-bounce" />
            <p className="text-sm font-medium text-slate-400">No opportunities detected</p>
            <p className="text-xs text-slate-600 mt-1">Try relaxing your scores or price budget filters.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Star</th>
                <th className="py-2.5 px-2 cursor-pointer hover:bg-slate-850 hover:text-white select-none" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1">
                    Item
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-2 cursor-pointer hover:bg-slate-850 hover:text-white select-none text-right" onClick={() => handleSort("score")}>
                  <div className="flex items-center justify-end gap-1">
                    Score
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-2 cursor-pointer hover:bg-slate-850 hover:text-white select-none text-right" onClick={() => handleSort("netMargin")}>
                  <div className="flex items-center justify-end gap-1">
                    Net Margin
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-2 cursor-pointer hover:bg-slate-850 hover:text-white select-none text-right" onClick={() => handleSort("marginPercent")}>
                  <div className="flex items-center justify-end gap-1">
                    Margin % 
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:bg-slate-850 hover:text-white select-none text-right" onClick={() => handleSort("limit")}>
                  <div className="flex items-center justify-end gap-1">
                    Limit
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {sortedDeals.map((deal) => {
                const isSelected = selectedItemId === deal.item.id;
                const isStarred = starredIds.includes(deal.item.id);
                const isMember = deal.item.members;
                const score = deal.scoreBreakdown.total;

                // Color themes based on algorithm score
                let scoreColor = "bg-rose-950/40 text-rose-400 border border-rose-800/50";
                if (score >= 70) {
                  scoreColor = "bg-emerald-950/40 text-emerald-400 border border-emerald-800/50";
                } else if (score >= 55) {
                  scoreColor = "bg-amber-950/40 text-amber-400 border border-amber-800/50";
                }

                // Custom icon path helper from osrs wiki
                const formatWikiIconUrl = (iconName: string) => {
                  return `https://oldschool.runescape.wiki/images/${iconName.replace(/\s+/g, "_")}`;
                };

                return (
                  <tr
                    key={deal.item.id}
                    onClick={() => onSelectItem(deal.item)}
                    className={`hover:bg-slate-800/40 cursor-pointer border-l-2 transition-all duration-150 ${
                      isSelected
                        ? "bg-amber-500/5 border-l-amber-500 shadow-inner"
                        : "border-l-transparent"
                    }`}
                  >
                    {/* Favorite toggle trigger */}
                    <td className="py-3 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleStar(deal.item.id)}
                        className="text-slate-600 hover:text-amber-500 transition-colors"
                      >
                        <Star
                          className={`w-4 h-4 ${isStarred ? "text-amber-500 fill-amber-500" : ""}`}
                        />
                      </button>
                    </td>

                    {/* Image and name */}
                    <td className="py-3 px-2 flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-slate-900 border border-slate-800 rounded flex items-center justify-center relative overflow-hidden shrink-0">
                        {deal.item.icon ? (
                          <img
                            src={formatWikiIconUrl(deal.item.icon)}
                            alt={deal.item.name}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              // If wiki icon fetch fails, render first character of name
                              (e.target as any).style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-slate-100 truncate hover:text-amber-400 transition-colors">
                          {deal.item.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isMember ? (
                            <span className="bg-amber-950/50 text-[9px] text-amber-500 font-semibold px-1 rounded-sm border border-amber-800/30">
                              P2P
                            </span>
                          ) : (
                            <span className="bg-slate-850 text-[9px] text-slate-400 px-1 rounded-sm">
                              F2P
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            Buy: {formatGP(deal.item.low || 0)} GP
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Score Badge */}
                    <td className="py-2 px-2 text-right">
                      <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>
                        {score}
                      </span>
                    </td>

                    {/* Net Margin (GP) */}
                    <td className="py-2 px-2 text-right font-medium text-emerald-400 font-mono">
                      +{formatGP(deal.netMargin)}
                    </td>

                    {/* Margin Percent */}
                    <td className="py-2 px-2 text-right font-semibold font-mono text-slate-400">
                      {deal.marginPercent.toFixed(1)}%
                    </td>

                    {/* Buy Limit */}
                    <td className="py-2 px-3 text-right text-slate-400 font-mono">
                      {deal.item.limit ? deal.item.limit.toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
