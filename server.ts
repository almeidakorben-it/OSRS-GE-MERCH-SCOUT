import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory caches to avoid spamming the OSRS Wiki APIs and to ensure fast responses
let mappingCache: any[] | null = null;
let mappingCacheTime = 0;

let latestCache: any = null;
let latestCacheTime = 0;

const USER_AGENT = "GE Merch Scout - AI Studio App - Contact: KJmexican@gmail.com";

// Helper to fetch from OSRS Wiki API with proper headers
async function fetchWikiAPI(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Encoding": "gzip",
    },
  });
  if (!response.ok) {
    throw new Error(`OSRS Price API returned standard status ${response.status}`);
  }
  return response.json();
}

// Get and cache item mappings (stale after 12 hours)
async function getItemMapping() {
  const now = Date.now();
  if (mappingCache && now - mappingCacheTime < 12 * 60 * 60 * 1000) {
    return mappingCache;
  }
  try {
    console.log("Fetching fresh OSRS item mappings...");
    const items = await fetchWikiAPI("https://prices.runescape.wiki/api/v1/osrs/mapping");
    if (Array.isArray(items)) {
      mappingCache = items;
      mappingCacheTime = now;
      return mappingCache;
    }
    throw new Error("Invalid mapping structure returned");
  } catch (err) {
    console.error("Failed to fetch OSRS item mappings:", err);
    if (mappingCache) return mappingCache; // Serve stale cache on failure
    throw err;
  }
}

// Get and cache latest prices (stale after 30 seconds)
async function getLatestPrices() {
  const now = Date.now();
  if (latestCache && now - latestCacheTime < 30 * 1000) {
    return latestCache;
  }
  try {
    console.log("Fetching fresh OSRS latest prices...");
    const prices = await fetchWikiAPI("https://prices.runescape.wiki/api/v1/osrs/latest");
    if (prices && prices.data) {
      latestCache = prices.data;
      latestCacheTime = now;
      return latestCache;
    }
    throw new Error("Invalid latest price structure returned");
  } catch (err) {
    console.error("Failed to fetch OSRS latest prices:", err);
    if (latestCache) return latestCache; // Serve stale cache on failure
    throw err;
  }
}

// API Endpoints
app.get("/api/ge/items", async (req, res) => {
  try {
    const [mapping, latest] = await Promise.all([
      getItemMapping(),
      getLatestPrices(),
    ]);

    // Merge mapping details with latest prices to send a single consolidated stream
    const merged = mapping.map((item: any) => {
      const priceData = latest[item.id] || {};
      return {
        id: item.id,
        name: item.name,
        limit: item.limit,
        value: item.value,
        highalch: item.highalch,
        members: item.members,
        icon: item.icon,
        high: priceData.high ?? null,
        low: priceData.low ?? null,
        highTime: priceData.highTime ?? null,
        lowTime: priceData.lowTime ?? null,
      };
    }).filter(item => item.high !== null || item.low !== null); // Only items with actual trade activity

    res.json({ success: true, items: merged });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/ge/timeseries", async (req, res) => {
  const { id, timestep } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, error: "Missing item ID parameter 'id'." });
  }
  const step = timestep || "1h"; // default 1 hour intervals
  try {
    const data = await fetchWikiAPI(`https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=${step}&id=${id}`);
    res.json({ success: true, data: data.data || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Server-side AI Advisor endpoint
app.post("/api/gemini/advisor", async (req, res) => {
  const { item, portfolio, generalQuestion, activeAlgoId } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.json({
      success: true,
      advice: "⚠️ **AI Offline Mode**\n\nThe Gemini API Key is currently missing. Please set your `GEMINI_API_KEY` in the **Settings > Secrets** panel in the AI Studio developer workspace to enable the smart OSRS Market Advisor!\n\n*Quick Trading Tip:* Focus on high-volume liquid items like Death Runes or Rune Arrows for safe 5-10% margins during active hours.",
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const algoDescription = {
      momentum: "Momentum & Margin Hunter (looking at short-term price trend velocity and healthy margins)",
      reversion: "Mean Reversion Raider (looking for items that are severely underpriced relative to their historical 30-day/90-day averages, predicting a price rebound to the mean)",
      volume: "Volume Surge Vanguard (focusing on extreme breakout volume spikes where trading activity is 3x or higher than normal, predicting massive item demand shifts)",
      seasonal: "Seasonal/Cyclic Harvester (playing the weekly cycles, weekend demand peaks, update preparations, or long-term seasonal event structures)",
      lurker: "Low Volume High Margin Lurker (targeting rare collectibles/uniques with low trading velocity but massive absolute profit margin spreads, avoiding active competition)",
      arbitrage: "Arbitrage Alchemist (looking for mathematical profit gaps in item combinations, processing recipes, or High Alchemy values compared to active market pricing)"
    }[activeAlgoId as string] || "";

    let prompt = "";
    if (generalQuestion) {
      prompt = `You are the expert wise OSRS Grand Exchange merchant and master flipper. 
The user is currently active with the following trading strategy: ${algoDescription || "General Flipping"}.
A merchant asks you this trading question: "${generalQuestion}".
Provide direct, highly tactical, experienced advice tailored to their strategy, utilizing realistic knowledge of the game (such as tax caps, buy limits resetting every 4 hours, and common high-volume staples vs heavy gear). Be concise, clear, and style the output in readable markdown.`;
    } else if (item) {
      const tax = Math.floor(item.high * 0.01);
      const margin = item.high - item.low - tax;
      prompt = `You are the expert OSRS Grand Exchange merchant and master flipper.
Analyze this item for merchanting / flipping viability:
- Name: ${item.name}
- Buy Limit: ${item.limit || "Unknown"}
- Current Instant Buy (Low): ${item.low} GP
- Current Instant Sell (High): ${item.high} GP
- Approximate Tax (1%): ${tax} GP
- Net Profit Margin: ${margin} GP

The user is currently evaluating this item under the following strategy: ${algoDescription || "General Flipping/Scouting"}.
Provide a direct, tactical flipping recommendation tailored to this specific strategy (Buy price target, sell target, risk assessment, holding time, volume dynamics, common uses in skilling or PvM). Be concise, clear, and style with beautiful, readable markdown. Limit the response to 200 words.`;
    } else if (portfolio) {
      prompt = `You are the expert OSRS Grand Exchange merchant advisor.
Analyze the user's active flipping portfolio:
${JSON.stringify(portfolio)}

Give tactical instructions on whether to Hold, undercut to Sell, Panic Sell, or cash out. Give a quick market momentum rating for their overall strategy. Be concise and write in rich markdown. Limit response to 250 words.`;
    } else {
      prompt = "Give a short, helpful master-merchant OSRS general flipping advice quote!";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ success: true, advice: response.text });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vite Middleware & Static Serves
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GE Merch Scout server running on http://localhost:${PORT}`);
  });
}

start();
