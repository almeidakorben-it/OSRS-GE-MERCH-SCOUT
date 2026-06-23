import React, { useState, useEffect, useMemo } from "react";
import { OSRSItem, PortfolioItem, PriceAlert } from "./types";
import LiveScanner from "./components/LiveScanner";
import ItemDetails from "./components/ItemDetails";
import Portfolio from "./components/Portfolio";
import AdvisorChat from "./components/AdvisorChat";
import QuickCalculators from "./components/QuickCalculators";
import { Coins, Flame, Star, Bell, Briefcase, HelpCircle, Activity, Volume2, VolumeX, Menu, Command } from "lucide-react";

export default function App() {
  const [items, setItems] = useState<OSRSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorString, setErrorString] = useState<string | null>(null);

  // Active View Tab: 'scanner' | 'portfolio' | 'chat' | 'calcs'
  const [activeTab, setActiveTab] = useState<"scanner" | "portfolio" | "chat" | "calcs">("scanner");

  // Selection
  const [selectedItem, setSelectedItem] = useState<OSRSItem | null>(null);

  // Sound Toggle state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Persisted local storage entities
  const [starredIds, setStarredIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("ge_starred_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    try {
      const saved = localStorage.getItem("ge_portfolio_items");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem("ge_prices_alerts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("ge_starred_ids", JSON.stringify(starredIds));
  }, [starredIds]);

  useEffect(() => {
    localStorage.setItem("ge_portfolio_items", JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem("ge_prices_alerts", JSON.stringify(alerts));
  }, [alerts]);

  // Initial and periodic price fetching (30 second intervals)
  useEffect(() => {
    fetchItemsData();
    const interval = setInterval(fetchItemsData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchItemsData = async () => {
    try {
      const response = await fetch("/api/ge/items");
      const result = await response.json();
      if (result.success && Array.isArray(result.items)) {
        setItems(result.items);
        setErrorString(null);

        // Keep current selected item synced with latest fetched price points
        if (selectedItem) {
          const fresh = result.items.find((it: any) => it.id === selectedItem.id);
          if (fresh) setSelectedItem(fresh);
        }

        // Evaluate and trigger Alerts on new pricing payload
        evaluatePriceAlerts(result.items);
      } else {
        setErrorString(result.error || "Failed to load G.E. pricing indices.");
      }
    } catch (e: any) {
      console.error("G.E. price synchronization failed:", e);
      setErrorString("Connection lost. OSRS Wiki Prices API is momentarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  // Sound effect triggers using simple synthetically constructed Web Audio API synths (coin sound)
  const playRewardSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 coin
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5 coin
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.16); // D6 coin

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio Context unable to initiate on early clicks.");
    }
  };

  // Alert triggers sound (alarm chime)
  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  // Star / Star Toggle Action
  const handleToggleStar = (itemId: number) => {
    setStarredIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
    playRewardSound();
  };

  // Establish transaction in portfolio ledger
  const handleAddToPortfolio = (
    itemId: number,
    name: string,
    buyPrice: number,
    quantity: number,
    target: number
  ) => {
    const fresh: PortfolioItem = {
      id: "trans_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      itemId,
      name,
      buyPrice,
      quantity,
      targetPrice: target,
      status: "buying",
      dateAdded: new Date().toLocaleDateString(),
    };
    setPortfolio((prev) => [fresh, ...prev]);
    playRewardSound();
    setActiveTab("portfolio"); // switch view to active ledger on add!
  };

  const handleUpdateStatus = (id: string, newStatus: PortfolioItem["status"]) => {
    setPortfolio((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: newStatus } : it))
    );
    playRewardSound();
  };

  const handleDeleteTransaction = (id: string) => {
    setPortfolio((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you certain you wish to purge all portfolio logs?")) {
      setPortfolio([]);
    }
  };

  // Match and check custom alerts
  const evaluatePriceAlerts = (latestItems: OSRSItem[]) => {
    let triggeredAny = false;
    const itemsMap = new Map<number, OSRSItem>();
    latestItems.forEach((it) => itemsMap.set(it.id, it));

    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) => {
        if (!alert.active || alert.triggered) return alert;

        const live = itemsMap.get(alert.itemId);
        if (!live) return alert;

        let shouldTrigger = false;
        if (alert.type === "high_above" && live.high && live.high >= alert.value) {
          shouldTrigger = true;
        } else if (alert.type === "low_below" && live.low && live.low <= alert.value) {
          shouldTrigger = true;
        } else if (alert.type === "margin_above" && live.high && live.low) {
          const margin = live.high - live.low - Math.floor(live.high * 0.01);
          if (margin >= alert.value) shouldTrigger = true;
        }

        if (shouldTrigger) {
          triggeredAny = true;
          return { ...alert, triggered: true };
        }
        return alert;
      })
    );

    if (triggeredAny) {
      playAlertSound();
    }
  };

  // Computed dynamic wallet balance using original portfolio ledger
  const computedBalance = useMemo(() => {
    const base = 124500000; // 124.5M base
    let delta = 0;
    portfolio.forEach((trans) => {
      if (trans.status === "liquidated") {
        const actualSell = trans.actualSellPrice || trans.targetPrice;
        const buyVal = trans.buyPrice * trans.quantity;
        const sellVal = actualSell * trans.quantity;
        const tax = Math.min(5000000, Math.floor(actualSell * 0.01)) * trans.quantity;
        delta += (sellVal - buyVal - tax);
      }
    });
    return base + delta;
  }, [portfolio]);

  const formatBalanceGP = (value: number): string => {
    if (value >= 1000000000) return (value / 1000000000).toFixed(2) + "B";
    if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
    if (value >= 1000) return (value / 1000).toFixed(0) + "k";
    return value.toLocaleString();
  };

  return (
    <div id="root-theme-shuttle" className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col antialiased">
      {/* HEADER BAR */}
      <header className="bg-slate-900/60 border-b border-slate-800/80 sticky top-0 z-50 px-5 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand Logo Title resembling Bento Grid mockup */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] text-xl font-display">
              G
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white font-display leading-none">GE MERCH SCOUT</h1>
              <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold leading-none mt-1">Market Momentum v1.0 • Live</p>
            </div>
          </div>

          {/* Nav Tab Buttons */}
          <nav className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
            {[
              { id: "scanner", label: "📈 Live Scanner", icon: Activity },
              { id: "portfolio", label: "💼 Active Portfolio", icon: Briefcase },
              { id: "chat", label: "💬 Wise Merchant AI", icon: Flame },
              { id: "calcs", label: "🧮 Math Toolbox", icon: Command },
            ].map((cfg) => {
              const Icon = cfg.icon;
              const isActive = activeTab === cfg.id;
              return (
                <button
                  key={cfg.id}
                  onClick={() => {
                    setActiveTab(cfg.id as any);
                    playRewardSound();
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? "bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.25)] font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {cfg.label}
                </button>
              );
            })}
          </nav>

          {/* Sound toggle controls & Status Badges */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800/80 rounded-full px-3 py-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">API: OSRS WIKI (60ms)</span>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span className="text-[11px] text-amber-500 font-black tracking-tight font-mono">
                BAL: {formatBalanceGP(computedBalance)} GP
              </span>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border text-slate-400 hover:text-white transition-colors cursor-pointer ${
                soundEnabled ? "bg-slate-900 border-slate-800 text-amber-500" : "bg-slate-950 border-slate-800"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* CORE DISPLAY STAGE */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 overflow-hidden flex flex-col">
        {errorString && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-900/40 text-rose-300 text-xs rounded-xl flex items-center justify-between">
            <span className="font-semibold">{errorString}</span>
            <button
              onClick={fetchItemsData}
              className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-[10px] font-bold text-white rounded cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-24 text-center">
            <span className="w-9 h-9 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mb-4" />
            <h2 className="text-base font-semibold text-slate-200">Assembling Grand Exchange Indices</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-[320px]">
              Querying live merchant mappings and real-time orders from RuneList G.E. feed archives... Please wait.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            {/* Viewports mapping switcher */}
            {activeTab === "scanner" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full items-start">
                <div className="lg:col-span-7 h-[calc(100vh-210px)] min-h-[500px]">
                  <LiveScanner
                    items={items}
                    onSelectItem={(it) => setSelectedItem(it)}
                    selectedItemId={selectedItem ? selectedItem.id : null}
                    starredIds={starredIds}
                    onToggleStar={handleToggleStar}
                  />
                </div>
                <div className="lg:col-span-5 h-[calc(100vh-210px)] min-h-[500px]">
                  <ItemDetails item={selectedItem} onAddToPortfolio={handleAddToPortfolio} />
                </div>
              </div>
            )}

            {activeTab === "portfolio" && (
              <div className="h-[calc(100vh-210px)] min-h-[500px]">
                <Portfolio
                  portfolio={portfolio}
                  itemsList={items}
                  onUpdateStatus={handleUpdateStatus}
                  onDeleteTransaction={handleDeleteTransaction}
                  onClearHistory={handleClearHistory}
                />
              </div>
            )}

            {activeTab === "chat" && (
              <div className="h-[calc(100vh-210px)] min-h-[500px]">
                <AdvisorChat />
              </div>
            )}

            {activeTab === "calcs" && (
              <div className="h-[calc(100vh-210px)] min-h-[500px]">
                <QuickCalculators />
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER BAR */}
      <footer className="bg-slate-900/60 border-t border-slate-800 py-3.5 px-6 text-center text-[10px] text-slate-500 uppercase tracking-[0.2em] font-mono flex flex-col md:flex-row justify-between items-center gap-2">
        <span>© 2026 GE SCOUT ANALYTICS ENGINE</span>
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          SERVER STATUS: STABLE • GE TAX CALCULATOR V2.0 ACTIVE
        </span>
      </footer>
    </div>
  );
}
