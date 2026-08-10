const dbConnect = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const Profile = require('../models/Profile');
const Holding = require('../models/Holding');
const Position = require('../models/Position');
let ValuationSnapshot = null;
try { ValuationSnapshot = require('../models/ValuationSnapshot'); } catch(e) {}
let LiquidityEvent = null;
try { LiquidityEvent = require('../models/LiquidityEvent'); } catch(e) {}

// Lazy fill engine — reuses buy.js logic
let fillPendingOrders = null;
try { fillPendingOrders = require('./buy').fillPendingOrders; } catch(e) { /* ignore */ }

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

const PUBLIC_TICKER_MAP = {
  TESLA:'TSLA', AAPL:'AAPL', MSFT:'MSFT', GOOGL:'GOOGL', AMZN:'AMZN',
  META:'META',  NVDA:'NVDA', V:'V',       NXPI:'NXPI',   UBS:'UBS',
  JPM:'JPM',    BAC:'BAC',   NFLX:'NFLX', PLTR:'PLTR',
};
const CRYPTO_TICKER_MAP = {
  BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT',
  SOL: 'BINANCE:SOLUSDT', XRP: 'BINANCE:XRPUSDT',
  BNB: 'BINANCE:BNBUSDT', ADA: 'BINANCE:ADAUSDT',
};

// Batch fetch live prices for a set of DB tickers
async function fetchLivePrices(tickers) {
  if (!FINNHUB_KEY || !tickers.length) return {};
  const finnhubSyms = tickers
    .map(t => ({ db: t.toUpperCase(), live: PUBLIC_TICKER_MAP[t.toUpperCase()] || CRYPTO_TICKER_MAP[t.toUpperCase()] }))
    .filter(x => x.live);
  if (!finnhubSyms.length) return {};
  const out = {};
  await Promise.all(finnhubSyms.map(async x => {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(x.live)}&token=${FINNHUB_KEY}`;
      const r = await fetch(url);
      const j = await r.json();
      if (j && typeof j.c === 'number' && j.c > 0) {
        out[x.db] = { price: j.c, changePercent: j.dp || 0, change: j.d || 0 };
      }
    } catch(e) { /* skip */ }
  }));
  return out;
}

// ─── POSITIONS BRANCH ───
async function handlePositions(req, res, user) {
  const status = (req.query.status || 'open').toLowerCase();
  const query = { userId: user._id };
  if (status === 'open' || status === 'closed') query.status = status;

  const positions = await Position.find(query).sort({ openedAt: -1 }).lean();
  if (!positions.length) {
    return res.status(200).json({
      ok: true,
      positions: [],
      summary: { totalCostBasis: 0, totalCurrentValue: 0, totalUnrealizedPnl: 0, totalUnrealizedPnlPct: 0, openCount: 0 },
    });
  }

  // Fetch live prices only for OPEN positions (closed use exitPrice)
  const openTickers = [...new Set(positions.filter(p => p.status === 'open').map(p => p.ticker))];
  const livePrices = await fetchLivePrices(openTickers);

  let totalCostBasis = 0;
  let totalCurrentValue = 0;
  let openCount = 0;

  const enriched = positions.map(p => {
    const live = livePrices[p.ticker];
    let currentPrice, currentValue, unrealizedPnl, unrealizedPnlPct, changePct;

    if (p.status === 'open') {
      currentPrice = live ? live.price : p.entryPrice;
      currentValue = currentPrice * p.quantity;
      unrealizedPnl = currentValue - p.costBasis;
      unrealizedPnlPct = p.costBasis > 0 ? (unrealizedPnl / p.costBasis) * 100 : 0;
      changePct = live ? live.changePercent : 0;
      totalCostBasis += p.costBasis;
      totalCurrentValue += currentValue;
      openCount++;
    } else {
      currentPrice = p.exitPrice;
      currentValue = p.exitPrice * p.quantity;
      unrealizedPnl = p.realizedPnl;
      unrealizedPnlPct = p.costBasis > 0 ? (p.realizedPnl / p.costBasis) * 100 : 0;
      changePct = 0;
    }

    return {
      id: p._id,
      ticker: p.ticker,
      assetType: p.assetType,
      side: p.side,
      quantity: p.quantity,
      entryPrice: p.entryPrice,
      costBasis: p.costBasis,
      currentPrice,
      currentValue,
      unrealizedPnl,
      unrealizedPnlPct,
      changePct,
      status: p.status,
      openedAt: p.openedAt,
      closedAt: p.closedAt,
      exitPrice: p.exitPrice,
      realizedPnl: p.realizedPnl,
      companyName: p.companyName || '',
      logoUrl: p.logoUrl || '',
      isLive: !!live,
    };
  });

  const totalUnrealizedPnl = totalCurrentValue - totalCostBasis;
  const totalUnrealizedPnlPct = totalCostBasis > 0 ? (totalUnrealizedPnl / totalCostBasis) * 100 : 0;

  return res.status(200).json({
    ok: true,
    positions: enriched,
    summary: {
      totalCostBasis,
      totalCurrentValue,
      totalUnrealizedPnl,
      totalUnrealizedPnlPct,
      openCount,
    },
    cashBalanceUSD: user.balanceUSD || 0,
  });
}

// ─── HOLDINGS BRANCH (original behavior) ───
async function handleHoldings(req, res, user) {
  const holdings = await Holding.find({ userId: user._id }).sort({ totalInvestedUSD: -1 }).lean();

  let totalInvestedUSD = 0;
  let totalCurrentValueUSD = 0;

  const enriched = holdings.map(h => {
    const currentValue = (h.currentPriceUSD || h.avgPriceUSD) * h.shares;
    const pnlUSD = currentValue - h.totalInvestedUSD;
    const pnlPercent = h.totalInvestedUSD > 0 ? (pnlUSD / h.totalInvestedUSD) * 100 : 0;
    totalInvestedUSD += h.totalInvestedUSD;
    totalCurrentValueUSD += currentValue;
    return {
      id: h._id,
      symbol: h.symbol,
      companyName: h.companyName,
      shares: h.shares,
      avgPriceUSD: h.avgPriceUSD,
      currentPriceUSD: h.currentPriceUSD || h.avgPriceUSD,
      totalInvestedUSD: h.totalInvestedUSD,
      currentValueUSD: currentValue,
      pnlUSD,
      pnlPercent,
      lastPurchaseAt: h.lastPurchaseAt,
    };
  });

  const totalPnlUSD = totalCurrentValueUSD - totalInvestedUSD;
  const totalPnlPercent = totalInvestedUSD > 0 ? (totalPnlUSD / totalInvestedUSD) * 100 : 0;

  return res.status(200).json({
    ok: true,
    portfolio: {
      cashBalanceUSD: user.balanceUSD || 0,
      totalInvestedUSD,
      totalCurrentValueUSD,
      totalPnlUSD,
      totalPnlPercent,
      totalEquityUSD: (user.balanceUSD || 0) + totalCurrentValueUSD,
      holdings: enriched,
    },
  });
}

// ─── ENTRY POINT ───
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await dbConnect();
    const user = await requireAuth(req, res, Profile);
    if (!user) return;

    // Lazy trigger: fill any pending limit/stop orders whose price has been hit
    if (fillPendingOrders) {
      try { await fillPendingOrders(user._id); } catch(e) { console.error('[lazy-fill]', e.message); }
    }
    const type = (req.query.type || 'holdings').toLowerCase();
    if (type === 'positions') return await handlePositions(req, res, user);
    if (type === 'events') return await handleUserEvents(req, res, user);
    if (type === 'history') return await handleHistory(req, res, user);
    return await handleHoldings(req, res, user);

  } catch (err) {
    console.error('[api/portfolio]', err);
    return res.status(500).json({ error: err.message });
  }
};
