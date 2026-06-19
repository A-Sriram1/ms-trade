import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { GoogleGenAI } from "@google/genai";
import { MarketDataService } from "./server/MarketDataService";

type MarketSnapshot = Awaited<ReturnType<MarketDataService["stream_market_data"]>>;

const ASSISTANT_SUPPORTED_SYMBOLS = [
  "NIFTY",
  "BANKNIFTY",
  "SENSEX",
  "RELIANCE",
  "HDFCBANK",
  "TCS",
] as const;

function normalizeQueryValue(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getInstrumentForAssistant(symbol: string, snapshot: MarketSnapshot) {
  switch (symbol) {
    case "NIFTY":
      return snapshot.nifty || null;
    case "BANKNIFTY":
      return snapshot.banknifty || null;
    case "SENSEX":
      return snapshot.sensex || null;
    default:
      return snapshot.stocks.find((stock) => normalizeQueryValue(stock.symbol || "") === symbol) || null;
  }
}

function getSignalForAssistant(symbol: string, snapshot: MarketSnapshot) {
  return snapshot.signals.find((signal) => normalizeQueryValue(signal.symbol) === symbol) || null;
}

function getRelevantSymbols(message: string) {
  const normalizedMessage = normalizeQueryValue(message);
  const symbols = ASSISTANT_SUPPORTED_SYMBOLS.filter((symbol) => normalizedMessage.includes(symbol));

  if (symbols.length > 0) {
    return symbols;
  }

  if (normalizedMessage.includes("BANKNIFTY")) {
    return ["BANKNIFTY"];
  }

  if (normalizedMessage.includes("NIFTY")) {
    return ["NIFTY"];
  }

  if (normalizedMessage.includes("SENSEX")) {
    return ["SENSEX"];
  }

  if (normalizedMessage.includes("RELIANCE")) {
    return ["RELIANCE"];
  }

  return [];
}

function getRelevantNews(symbols: string[], snapshot: MarketSnapshot) {
  const related: typeof snapshot.news.market = [];
  const seen = new Set<string>();
  const symbolSet = new Set(symbols);

  const maybePush = (item: (typeof snapshot.news.market)[number]) => {
    if (!seen.has(item.id)) {
      related.push(item);
      seen.add(item.id);
    }
  };

  snapshot.news.market.forEach(maybePush);

  if (symbolSet.has("NIFTY") || symbolSet.has("BANKNIFTY") || symbolSet.has("SENSEX")) {
    snapshot.news.sector.forEach(maybePush);
  }

  if (symbolSet.has("RELIANCE") || symbolSet.has("HDFCBANK") || symbolSet.has("TCS")) {
    snapshot.news.company.forEach(maybePush);
  }

  return related
    .sort((left, right) => (right.impactScore + right.sentimentScore) - (left.impactScore + left.sentimentScore))
    .slice(0, 6);
}

function summarizeNewsSentiment(news: ReturnType<typeof getRelevantNews>) {
  if (news.length === 0) {
    return {
      tone: "NEUTRAL",
      averageSentiment: 50,
      averageImpact: 50,
    };
  }

  const averageSentiment = Math.round(
    news.reduce((sum, item) => sum + item.sentimentScore, 0) / news.length
  );
  const averageImpact = Math.round(
    news.reduce((sum, item) => sum + item.impactScore, 0) / news.length
  );

  if (averageSentiment >= 58) {
    return { tone: "BULLISH", averageSentiment, averageImpact };
  }

  if (averageSentiment <= 42) {
    return { tone: "BEARISH", averageSentiment, averageImpact };
  }

  return { tone: "NEUTRAL", averageSentiment, averageImpact };
}

function buildAssistantContext(message: string, snapshot: MarketSnapshot) {
  const relevantSymbols = getRelevantSymbols(message);
  const focusSymbols = relevantSymbols.length > 0 ? relevantSymbols : ["NIFTY", "BANKNIFTY", "RELIANCE"];
  const focusedInstruments = focusSymbols
    .map((symbol) => {
      const instrument = getInstrumentForAssistant(symbol, snapshot);
      const signal = getSignalForAssistant(symbol, snapshot);

      return {
        symbol,
        marketData: instrument
          ? {
              ltp: instrument.ltp,
              open: instrument.open,
              high: instrument.high,
              low: instrument.low,
              close: instrument.close,
              change: instrument.change,
              changePercent: "change_pct" in instrument ? instrument.change_pct : instrument.changePercent,
              volume: instrument.volume || 0,
            }
          : null,
        signal: signal
          ? {
              action: signal.action,
              confidence: signal.confidence,
              entry: signal.entry,
              stopLoss: signal.stopLoss,
              targets: [signal.target1, signal.target2, signal.target3],
              explanation: signal.explanation,
              reasons: signal.reason,
              indicators: signal.indicators,
              timestamp: signal.timestamp,
            }
          : null,
      };
    })
    .filter((item) => item.marketData || item.signal);

  const topBullishSignals = snapshot.signals
    .filter((signal) => signal.action === "BUY")
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 3)
    .map((signal) => ({
      symbol: signal.symbol,
      confidence: signal.confidence,
      entry: signal.entry,
      explanation: signal.explanation,
      indicators: signal.indicators,
    }));

  const relevantNews = getRelevantNews(focusSymbols, snapshot);
  const sentimentSummary = summarizeNewsSentiment(relevantNews);

  return {
    query: message,
    marketStatus: snapshot.status,
    serverTime: snapshot.serverTime,
    signalUpdatedAt: snapshot.signalUpdatedAt,
    focusSymbols,
    indices: {
      nifty: snapshot.nifty,
      banknifty: snapshot.banknifty,
      sensex: snapshot.sensex,
      vix: snapshot.vix,
    },
    trackedStocks: snapshot.stocks,
    focusedInstruments,
    topBullishSignals,
    newsSentiment: {
      ...sentimentSummary,
      topHeadlines: relevantNews.map((item) => ({
        entity: item.entity,
        headline: item.headline,
        sentiment: item.sentiment,
        sentimentScore: item.sentimentScore,
        impactScore: item.impactScore,
        summary: item.aiSummary,
      })),
    },
  };
}

function describeInstrument(symbol: string, snapshot: MarketSnapshot) {
  const instrument = getInstrumentForAssistant(symbol, snapshot);
  const signal = getSignalForAssistant(symbol, snapshot);

  if (!instrument && !signal) {
    return `${symbol}: live market data is not currently available in the tracked universe.`;
  }

  const lines: string[] = [`${symbol}`];

  if (instrument) {
    const changePercent = "change_pct" in instrument ? instrument.change_pct : instrument.changePercent;
    lines.push(
      `- Price: ${instrument.ltp.toFixed(2)} | Change: ${instrument.change.toFixed(2)} (${changePercent.toFixed(2)}%)`
    );
    lines.push(
      `- Session range: ${instrument.low.toFixed(2)} - ${instrument.high.toFixed(2)} | Open: ${instrument.open.toFixed(2)} | Prev close: ${instrument.close.toFixed(2)}`
    );
    lines.push(`- Volume: ${(instrument.volume || 0).toLocaleString("en-IN")}`);
  }

  if (signal) {
    lines.push(`- Signal engine: ${signal.action} with ${signal.confidence}% confidence`);
    lines.push(
      `- Technicals: EMA9 ${signal.indicators.ema9}, EMA21 ${signal.indicators.ema21}, EMA50 ${signal.indicators.ema50}, RSI ${signal.indicators.rsi}, MACD ${signal.indicators.macd}/${signal.indicators.macdSignal}, VWAP ${signal.indicators.vwap}`
    );
    lines.push(`- Signal rationale: ${signal.reason.join(" ")}`);
  }

  return lines.join("\n");
}

function buildLocalAssistantReply(message: string, snapshot: MarketSnapshot) {
  const relevantSymbols = getRelevantSymbols(message);
  const focusSymbols = relevantSymbols.length > 0 ? relevantSymbols : ["NIFTY"];
  const relevantNews = getRelevantNews(focusSymbols, snapshot);
  const sentimentSummary = summarizeNewsSentiment(relevantNews);
  const bullishSignals = snapshot.signals
    .filter((signal) => signal.action === "BUY")
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 3);

  const sections: string[] = [];
  sections.push(`TradeMind AI Analysis`);
  sections.push(`Market status: ${snapshot.status} | Server time: ${snapshot.serverTime || "Unavailable"}`);

  if (/best|bullish|strong/i.test(message)) {
    if (bullishSignals.length === 0) {
      sections.push(`No high-conviction bullish signals are active in the current tracked universe.`);
    } else {
      sections.push(`Best bullish setups today:`);
      bullishSignals.forEach((signal, index) => {
        sections.push(
          `${index + 1}. ${signal.symbol} | BUY | Confidence ${signal.confidence}% | RSI ${signal.indicators.rsi} | EMA9 ${signal.indicators.ema9} vs EMA21 ${signal.indicators.ema21} | ${signal.explanation}`
        );
      });
    }
  } else {
    focusSymbols.forEach((symbol) => {
      sections.push(describeInstrument(symbol, snapshot));
    });
  }

  sections.push(
    `News sentiment: ${sentimentSummary.tone} | Avg sentiment score ${sentimentSummary.averageSentiment}/100 | Avg impact ${sentimentSummary.averageImpact}/100`
  );

  if (relevantNews.length > 0) {
    sections.push(`Top headlines:`);
    relevantNews.slice(0, 3).forEach((item, index) => {
      sections.push(
        `${index + 1}. ${item.headline} | ${item.sentiment} | Impact ${item.impactScore}/100 | ${item.aiSummary}`
      );
    });
  }

  sections.push(
    `Takeaway: Use the live Yahoo Finance snapshot, indicator stack, signal engine, and current news tone together. If price is weak, EMA alignment is bearish, RSI is soft, and news sentiment is negative, favor defensive positioning. If the engine shows BUY with strong EMA alignment and supportive sentiment, bullish continuation is more credible.`
  );

  return sections.join("\n\n");
}

async function generateAssistantReply(
  ai: GoogleGenAI | null,
  marketService: MarketDataService,
  message: string
) {
  const snapshot = await marketService.stream_market_data();
  const context = buildAssistantContext(message, snapshot);

  if (!ai) {
    return buildLocalAssistantReply(message, snapshot);
  }

  const prompt = [
    "You are TradeMind AI, an Indian market analysis assistant.",
    "Use only the provided context.",
    "Your response must explicitly use: Yahoo Finance price snapshot, technical indicators, signal engine output, and news sentiment.",
    "Generate a detailed analysis with short sections: Market Snapshot, Technical Setup, Signal Engine View, News Sentiment, and Takeaway.",
    "If the user asks for best bullish stocks, rank up to 3 current BUY setups by confidence with reasons.",
    "If the user asks why an index is falling, explain using price action, technicals, signals, and relevant negative or neutral news tone from the provided context.",
    "If data for a symbol is unavailable, say that clearly and do not invent it.",
    "Context JSON:",
    JSON.stringify(context, null, 2),
  ].join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\nUser query: ${message}` }] }],
    });

    return response.text || buildLocalAssistantReply(message, snapshot);
  } catch (error) {
    console.error("AI assistant generation failed:", error);
    return buildLocalAssistantReply(message, snapshot);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Services
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
  const marketService = new MarketDataService(ai);

  // --- API Routes ---
  
  // Health check
  app.get("/system/health", (req, res) => {
    const health = marketService.healthStatus;
    res.json({
        provider: "Yahoo Finance",
        status: health.apiConnected ? "connected" : "disconnected",
        last_update: health.lastTickTime || "Never",
        tracked_symbols: Object.keys(marketService.getLatestData()).length
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/options/:symbol", async (req, res) => {
    const symbol = req.params.symbol;
    try {
        const result = await marketService.get_options_data(symbol);
        res.json(result);
    } catch(e: any) {
        res.status(400).json({ error: e.message || "Options data unsupported" });
    }
  });

  // AI Assistant endpoint
  app.post("/api/chat", async (req, res) => {
     try {
         const { message } = req.body;
         if (typeof message !== "string" || !message.trim()) {
             return res.status(400).json({ reply: "Please enter a market question to analyze." });
         }

         const reply = await generateAssistantReply(ai, marketService, message.trim());
         res.json({ reply });
     } catch (e) {
         console.error(e);
         res.status(500).json({ reply: "TradeMind AI could not complete the analysis right now." });
     }
  });

  // Vite middleware for development
  let vite;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // --- WebSocket Server for Live Market Data ---
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
      console.log("Client connected to live market feed");
      
      const interval = setInterval(async () => {
          const data = await marketService.stream_market_data();
          ws.send(JSON.stringify(data));
      }, 30000); // Poll Yahoo Finance API every 30 seconds

      ws.on("close", () => {
          clearInterval(interval);
          console.log("Client disconnected");
      });
  });
}

startServer();
