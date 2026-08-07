const dbConnect = require('./_lib/db');
const Company = require('../models/Company');

// In-memory caches
const quoteCache = new Map();
const metricsCache = new Map();
const candlesCache = new Map();
const QUOTE_TTL = 30 * 1000;
const METRICS_TTL = 10 * 60 * 1000;   // 10 min
const CANDLES_TTL = 60 * 1000;        // 1 min

async function fetchQuote(symbol, apiKey) {
  const key = symbol.toUpperCase();
  const cached = quoteCache.get(key);
  const now = Date.now();
  if (cached && (now - cached.ts) < QUOTE_TTL) return cached.data;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(key)}&token=${apiKey}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Finnhub ${r.status}`);
    const j = await r.json();
    if (!j || typeof j.c !== 'number' || j.c === 0) {
      return { symbol: key, error: 'no-data' };
    }
    const mid = j.c;
    const volatility = (j.h && j.l && mid) ? Math.min(0.005, (j.h - j.l) / mid * 0.15) : 0;
    const spreadPct = 0.0005 + volatility;
    const bid = +(mid * (1 - spreadPct)).toFixed(4);
    const ask = +(mid * (1 + spreadPct)).toFixed(4);
    const data = {
      symbol: key, price: mid, bid, ask,
      spread: +(ask - bid).toFixed(4),
      spreadPct: +(spreadPct * 200).toFixed(3),
      change: j.d, changePercent: j.dp,
      high: j.h, low: j.l, open: j.o, prevClose: j.pc, t: j.t,
    };
    quoteCache.set(key, { ts: now, data });
    return data;
  } catch (e) {
    return { symbol: key, error: e.message };
  }
}

async function fetchMetrics(symbol, apiKey) {
  const key = symbol.toUpperCase();
  const cached = metricsCache.get(key);
  const now = Date.now();
  if (cached && (now - cached.ts) < METRICS_TTL) return cached.data;
  try {
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(key)}&metric=all&token=${apiKey}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Finnhub metric ${r.status}`);
    const j = await r.json();
    const m = j.metric || {};
    const data = {
      symbol: key,
      marketCap: m.marketCapitalization ? m.marketCapitalization * 1e6 : null, // Finnhub returns in millions
      peRatio: m.peBasicExclExtraTTM || m.peInclExtraTTM || m.peNormalizedAnnual || null,
      volume: m['10DayAverageTradingVolume'] ? m['10DayAverageTradingVolume'] * 1e6 : null,
      week52High: m['52WeekHigh'] || null,
      week52Low: m['52WeekLow'] || null,
      dividendYield: m.dividendYieldIndicatedAnnual || null,
      beta: m.beta || null,
    };
    metricsCache.set(key, { ts: now, data });
    return data;
  } catch (e) {
    return { symbol: key, error: e.message };
  }
}

async function fetchCandles(symbol, range, apiKey) {
  const key = `${symbol.toUpperCase()}-${range}`;
  const cached = candlesCache.get(key);
  const now = Date.now();
  if (cached && (now - cached.ts) < CANDLES_TTL) return cached.data;

  const nowSec = Math.floor(Date.now() / 1000);
  let from, resolution;
  switch (range) {
    case '1D': from = nowSec - 86400;      resolution = '5';  break;
    case '1W': from = nowSec - 7*86400;    resolution = '30'; break;
    case '1M': from = nowSec - 30*86400;   resolution = '60'; break;
    case '1Y': from = nowSec - 365*86400;  resolution = 'D';  break;
    case 'ALL':from = nowSec - 5*365*86400;resolution = 'W';  break;
    default:   from = nowSec - 86400;      resolution = '5';  break;
  }
  try {
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol.toUpperCase())}&resolution=${resolution}&from=${from}&to=${nowSec}&token=${apiKey}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Finnhub candle ${r.status}`);
    const j = await r.json();
    if (j.s !== 'ok' || !Array.isArray(j.c)) {
      return { symbol, range, points: [], error: 'no-data' };
    }
    const points = j.c.map((close, i) => ({
      t: j.t[i] * 1000,
      c: close,
    }));
    const data = { symbol, range, points };
    candlesCache.set(key, { ts: now, data });
    return data;
  } catch (e) {
    return { symbol, range, points: [], error: e.message };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  try {
    const apiKey = process.env.FINNHUB_API_KEY;

    // ---- LIVE QUOTES (?live=AAPL,TSLA) ----
    const live = (req.query.live || '').trim();
    if (live) {
      if (!apiKey) return res.status(500).json({ ok: false, error: 'FINNHUB_API_KEY not configured' });
      const symbols = live.split(',').map(s => s.trim()).filter(Boolean).slice(0, 25);
      if (!symbols.length) return res.status(400).json({ ok: false, error: 'No symbols provided' });
      res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
      const quotes = await Promise.all(symbols.map(s => fetchQuote(s, apiKey)));
      return res.status(200).json({ ok: true, quotes });
    }

    // ---- METRICS (?metrics=AAPL) ----
    const metrics = (req.query.metrics || '').trim();
    if (metrics) {
      if (!apiKey) return res.status(500).json({ ok: false, error: 'FINNHUB_API_KEY not configured' });
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      const data = await fetchMetrics(metrics, apiKey);
      return res.status(200).json({ ok: true, metrics: data });
    }

    // ---- CANDLES (?candles=AAPL&range=1D) ----
    const candles = (req.query.candles || '').trim();
    if (candles) {
      if (!apiKey) return res.status(500).json({ ok: false, error: 'FINNHUB_API_KEY not configured' });
      const range = (req.query.range || '1D').toUpperCase();
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=180');
      const data = await fetchCandles(candles, range, apiKey);
      return res.status(200).json({ ok: true, candles: data });
    }

    // ---- DB branch ----
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    await dbConnect();
    const ticker = (req.query.ticker || '').trim();
    if (ticker) {
      const company = await Company.findOne({ ticker: ticker.toUpperCase() }).lean();
      if (!company) return res.status(404).json({ ok: false, error: 'Company not found' });
      return res.status(200).json({ ok: true, company });
    }
    const companies = await Company.find({ status: { $ne: 'closed' } })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    return res.status(200).json({ ok: true, companies });
  } catch (e) {
    console.error('[api/companies]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
