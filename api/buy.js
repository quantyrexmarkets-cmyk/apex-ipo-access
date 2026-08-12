const dbConnect = require('./_lib/db');
const { sendEmail } = require('./_lib/email');
const templates = require('./_lib/emailTemplates');
const readJson = require('./_lib/readJson');
const { requireAuth } = require('./_lib/auth');
const Profile = require('../models/Profile');
const Holding = require('../models/Holding');
const Position = require('../models/Position');
const Notification = require('../models/Notification');
const Order = require('../models/Order');

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// Ticker mapping for public stocks: DB ticker -> Finnhub symbol
const PUBLIC_TICKER_MAP = {
  TESLA:'TSLA', AAPL:'AAPL', MSFT:'MSFT', GOOGL:'GOOGL', AMZN:'AMZN',
  META:'META',  NVDA:'NVDA', V:'V',       NXPI:'NXPI',   UBS:'UBS',
  JPM:'JPM',    BAC:'BAC',   NFLX:'NFLX', PLTR:'PLTR',
};

// Crypto tickers: DB ticker -> Finnhub symbol (Binance format)
const CRYPTO_TICKER_MAP = {
  BTC: 'BINANCE:BTCUSDT',
  ETH: 'BINANCE:ETHUSDT',
  SOL: 'BINANCE:SOLUSDT',
  XRP: 'BINANCE:XRPUSDT',
  BNB: 'BINANCE:BNBUSDT',
  ADA: 'BINANCE:ADAUSDT',
};

async function fetchLivePrice(ticker) {
  const T = (ticker || '').toUpperCase();
  const finnhubSym = PUBLIC_TICKER_MAP[T] || CRYPTO_TICKER_MAP[T];
  if (!finnhubSym) throw new Error('Ticker is not tradeable (not public/crypto)');
  if (!FINNHUB_KEY) throw new Error('FINNHUB_API_KEY not configured');

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSym)}&token=${FINNHUB_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Finnhub ${r.status}`);
  const j = await r.json();
  if (!j || typeof j.c !== 'number' || j.c === 0) throw new Error('No price data');

  // Simulated bid/ask spread (0.05% base + volatility-based widening)
  const mid = j.c;
  const volatility = (j.h && j.l && mid) ? Math.min(0.005, (j.h - j.l) / mid * 0.15) : 0;
  const spreadPct = 0.0005 + volatility;
  const bid = +(mid * (1 - spreadPct)).toFixed(4);
  const ask = +(mid * (1 + spreadPct)).toFixed(4);

  return {
    price: mid, bid, ask,
    spreadPct: +(spreadPct * 200).toFixed(3),
    change: j.d, changePercent: j.dp,
    symbol: finnhubSym,
    assetType: CRYPTO_TICKER_MAP[T] ? 'crypto' : 'stock',
  };
}

// Apply market-order slippage: ±0.01–0.05% random deviation
function applySlippage(price, side) {
  const slipPct = (Math.random() * 0.0004) + 0.0001;  // 0.01% - 0.05%
  // Buys slip UP (worse), sells slip DOWN (worse)
  return side === 'buy' ? +(price * (1 + slipPct)).toFixed(4) : +(price * (1 - slipPct)).toFixed(4);
}

const _fmt = (n) => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

// ═══════════════════════════════════════════════════
// MODE: reserve  (pre-IPO holdings — original flow)
// ═══════════════════════════════════════════════════
async function handleReserve(req, res, user, body) {
  const symbol = (body.symbol || '').toUpperCase().trim();
  const companyName = body.companyName || '';
  const shares = Number(body.shares);
  const pricePerShare = Number(body.pricePerShare);

  if (!symbol) return res.status(400).json({ error: 'Symbol required' });
  if (!shares || shares <= 0) return res.status(400).json({ error: 'Invalid share quantity' });
  if (!pricePerShare || pricePerShare <= 0) return res.status(400).json({ error: 'Invalid price per share' });

  const totalCost = shares * pricePerShare;

  if (user.kycStatus !== 'approved') {
    return res.status(403).json({ error: 'KYC approval required before trading' });
  }
  if (totalCost > (user.balanceUSD || 0)) {
    return res.status(400).json({ error: 'Insufficient balance', required: totalCost, available: user.balanceUSD || 0 });
  }

  await Profile.updateOne({ _id: user._id }, { $inc: { balanceUSD: -totalCost } });

  const existing = await Holding.findOne({ userId: user._id, symbol });
  let holding;
  if (existing) {
    const newShares = existing.shares + shares;
    const newTotalInvested = existing.totalInvestedUSD + totalCost;
    const newAvgPrice = newTotalInvested / newShares;
    holding = await Holding.findOneAndUpdate(
      { userId: user._id, symbol },
      { $set: {
          shares: newShares,
          totalInvestedUSD: newTotalInvested,
          avgPriceUSD: newAvgPrice,
          currentPriceUSD: pricePerShare,
          lastPurchaseAt: new Date(),
          companyName: companyName || existing.companyName,
      }},
      { new: true }
    );
  } else {
    holding = await Holding.create({
      userId: user._id, symbol, companyName, shares,
      avgPriceUSD: pricePerShare, currentPriceUSD: pricePerShare,
      totalInvestedUSD: totalCost, lastPurchaseAt: new Date(),
    });
  }

  await Notification.create({
    userId: user._id,
    type: 'trade',
    title: 'Allocation confirmed',
    message: `${shares} ${symbol} ${shares === 1 ? 'share' : 'shares'} allocated at $${_fmt(totalCost/shares)} per share. Total: $${_fmt(totalCost)}.`,
    link: '/portfolio',
  });

  try {
    if (user?.email) {
      sendEmail({
        to: user.email,
        ...templates.buyConfirmation(user.fullName, symbol, shares, pricePerShare, totalCost)
      }).catch(e => console.error('[email] buy failed:', e));
    }
  } catch(e) { console.error('[email] buy lookup failed:', e); }

  return res.status(201).json({
    ok: true,
    holding,
    newBalanceUSD: (user.balanceUSD || 0) - totalCost,
    orderSummary: { symbol, shares, pricePerShare, totalCost },
  });
}

// ═══════════════════════════════════════════════════
// MODE: trade-open  (opens live-priced position)
// ═══════════════════════════════════════════════════
async function handleTradeOpen(req, res, user, body) {
  const ticker = (body.symbol || body.ticker || '').toUpperCase().trim();
  const dollarAmount = Number(body.dollarAmount || body.amountUSD || 0);
  const companyName = body.companyName || '';
  const logoUrl = body.logoUrl || '';

  if (!ticker) return res.status(400).json({ error: 'Ticker required' });
  if (!dollarAmount || dollarAmount <= 0) return res.status(400).json({ error: 'Invalid dollar amount' });
  if (dollarAmount < 1) return res.status(400).json({ error: 'Minimum trade is $1' });

  if (user.kycStatus !== 'approved') {
    return res.status(403).json({ error: 'KYC approval required before trading' });
  }
  if (dollarAmount > (user.balanceUSD || 0)) {
    return res.status(400).json({ error: 'Insufficient balance', required: dollarAmount, available: user.balanceUSD || 0 });
  }

  // Fetch live price
  let quote;
  try { quote = await fetchLivePrice(ticker); }
  catch(e) { return res.status(400).json({ error: 'Could not fetch live price: ' + e.message }); }

  // Realistic execution: buy at ASK + slippage
  const fillPrice = applySlippage(quote.ask, 'buy');
  const quantity = dollarAmount / fillPrice;
  const costBasis = dollarAmount;
  quote.fillPrice = fillPrice;   // expose to caller

  // Deduct cash
  await Profile.updateOne({ _id: user._id }, { $inc: { balanceUSD: -costBasis } });

  // Create position
  const position = await Position.create({
    userId: user._id,
    ticker,
    assetType: quote.assetType,
    side: 'long',
    entryPrice: fillPrice,
    quantity,
    costBasis,
    status: 'open',
    openedAt: new Date(),
    companyName,
    logoUrl,
  });

  await Notification.create({
    userId: user._id,
    type: 'trade',
    title: 'Position opened',
    message: `Opened ${quote.assetType === 'crypto' ? quantity.toFixed(6) : quantity.toFixed(4)} ${ticker} at $${_fmt(fillPrice)} (mid $${_fmt(quote.price)}). Cost: $${_fmt(costBasis)}.`,
    link: '/positions',
  });

  return res.status(201).json({
    ok: true,
    position,
    quote,
    newBalanceUSD: (user.balanceUSD || 0) - costBasis,
  });
}

// ═══════════════════════════════════════════════════
// MODE: trade-close  (partial or full close, FIFO, sells at BID)
// Accepts: positionId (specific)  OR  ticker + shares/dollarAmount (FIFO across positions)
// ═══════════════════════════════════════════════════
async function handleTradeClose(req, res, user, body) {
  const positionId = body.positionId;
  const ticker = (body.symbol || body.ticker || '').toUpperCase().trim();
  const reqShares = Number(body.shares || 0);
  const reqDollars = Number(body.dollarAmount || 0);

  // ─ Determine which positions to draw from ─
  let positions;
  if (positionId) {
    const p = await Position.findOne({ _id: positionId, userId: user._id, status: 'open' });
    if (!p) return res.status(404).json({ error: 'Position not found or already closed' });
    positions = [p];
  } else {
    if (!ticker) return res.status(400).json({ error: 'positionId or ticker required' });
    positions = await Position.find({ userId: user._id, ticker, status: 'open' }).sort({ openedAt: 1 });
    if (!positions.length) return res.status(404).json({ error: 'No open ' + ticker + ' positions' });
  }

  const totalHeld = positions.reduce((s, p) => s + p.quantity, 0);
  const sym = positions[0].ticker;

  // ─ Fetch price ─
  let quote;
  try { quote = await fetchLivePrice(sym); }
  catch(e) { return res.status(400).json({ error: 'Could not fetch live price: ' + e.message }); }

  // Sells execute at BID - slippage
  const fillPrice = applySlippage(quote.bid, 'sell');
  quote.fillPrice = fillPrice;

  // ─ Determine sharesToSell ─
  let sharesToSell;
  if (positionId && !reqShares && !reqDollars) {
    sharesToSell = positions[0].quantity;  // full close of that position
  } else if (reqShares > 0) {
    sharesToSell = reqShares;
  } else if (reqDollars > 0) {
    sharesToSell = reqDollars / fillPrice;
  } else {
    sharesToSell = totalHeld;  // sell everything
  }

  if (sharesToSell <= 0) return res.status(400).json({ error: 'Invalid share amount' });
  if (sharesToSell > totalHeld + 1e-9) {
    return res.status(400).json({ error: 'Exceeds holdings. Available: ' + totalHeld.toFixed(4) });
  }

  // ─ FIFO close ─
  let remaining = sharesToSell;
  let totalProceeds = 0;
  let totalCostSold = 0;
  const closedPositions = [];

  for (const p of positions) {
    if (remaining <= 0) break;
    const sellQty = Math.min(p.quantity, remaining);
    const costShare = (p.costBasis / p.quantity) * sellQty;
    const proceedsShare = fillPrice * sellQty;
    const pnlShare = proceedsShare - costShare;

    if (sellQty >= p.quantity - 1e-9) {
      // Full close of this position
      p.exitPrice = fillPrice;
      p.closedAt = new Date();
      p.realizedPnl = pnlShare;
      p.status = 'closed';
      await p.save();
      closedPositions.push({ id: p._id, closed: true, sold: sellQty, pnl: pnlShare });
    } else {
      // Partial close: shrink original, create closed record for the sold slice
      p.quantity -= sellQty;
      p.costBasis -= costShare;
      await p.save();
      const partial = await Position.create({
        userId: user._id,
        ticker: p.ticker,
        assetType: p.assetType,
        side: 'long',
        entryPrice: p.entryPrice,
        quantity: sellQty,
        costBasis: costShare,
        exitPrice: fillPrice,
        closedAt: new Date(),
        realizedPnl: pnlShare,
        status: 'closed',
        openedAt: p.openedAt,
        companyName: p.companyName,
        logoUrl: p.logoUrl,
      });
      closedPositions.push({ id: partial._id, closed: false, sold: sellQty, pnl: pnlShare });
    }

    totalProceeds += proceedsShare;
    totalCostSold += costShare;
    remaining -= sellQty;
  }

  const realizedPnl = totalProceeds - totalCostSold;

  // Credit cash
  await Profile.updateOne({ _id: user._id }, { $inc: { balanceUSD: totalProceeds } });

  const pnlEmoji = realizedPnl >= 0 ? '📈' : '📉';
  const pnlSign = realizedPnl >= 0 ? '+' : '';

  await Notification.create({
    userId: user._id,
    type: 'trade',
    title: `Position closed ${pnlEmoji}`,
    message: `Sold ${sharesToSell.toFixed(4)} ${sym} at $${_fmt(fillPrice)} (mid $${_fmt(quote.price)}). P&L: ${pnlSign}$${_fmt(realizedPnl)}.`,
    link: '/positions',
  });

  return res.status(200).json({
    ok: true,
    quote,
    sold: sharesToSell,
    fillPrice,
    proceeds: totalProceeds,
    realizedPnl,
    closedPositions,
    newBalanceUSD: (user.balanceUSD || 0) + totalProceeds,
  });
}


// ═══════════════════════════════════════════════════
// MODE: order-list  (list user's orders)
// ═══════════════════════════════════════════════════
async function handleOrderList(req, res, user, body) {
  const status = (body.status || 'all').toLowerCase();
  const q = { userId: user._id };
  if (status === 'open') q.status = { $in: ['pending', 'partially_filled'] };
  else if (status === 'closed') q.status = { $in: ['filled', 'cancelled', 'rejected', 'expired'] };
  const orders = await Order.find(q).sort({ placedAt: -1 }).limit(100).lean();
  return res.status(200).json({ ok: true, orders });
}

// ═══════════════════════════════════════════════════
// MODE: order-cancel  (cancel pending order + refund reserved)
// ═══════════════════════════════════════════════════
async function handleOrderCancel(req, res, user, body) {
  const orderId = body.orderId;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });
  const order = await Order.findOne({ _id: orderId, userId: user._id });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!['pending', 'partially_filled'].includes(order.status)) {
    return res.status(400).json({ error: 'Cannot cancel a ' + order.status + ' order' });
  }
  if (order.side === 'buy' && order.dollarAmount) {
    const filled = (order.filledShares || 0) * (order.filledPrice || 0);
    const remaining = order.dollarAmount - filled;
    if (remaining > 0) {
      await Profile.updateOne({ _id: user._id }, { $inc: { balanceUSD: remaining } });
    }
  }
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  await order.save();
  return res.status(200).json({ ok: true, order });
}

// ═══════════════════════════════════════════════════
// MODE: order-place  (place limit/stop order)
// ═══════════════════════════════════════════════════
async function handleOrderPlace(req, res, user, body) {
  const ticker = (body.symbol || body.ticker || '').toUpperCase().trim();
  const side = (body.side || 'buy').toLowerCase();
  const orderType = (body.orderType || 'limit').toLowerCase();
  const limitPrice = Number(body.limitPrice || 0);
  const dollarAmount = Number(body.dollarAmount || 0);
  const shares = Number(body.shares || 0);
  const companyName = body.companyName || '';
  const logoUrl = body.logoUrl || '';

  if (!ticker) return res.status(400).json({ error: 'Ticker required' });
  if (!['buy', 'sell'].includes(side)) return res.status(400).json({ error: 'Invalid side' });
  if (!['limit', 'stop'].includes(orderType)) return res.status(400).json({ error: 'Use trade-open for market orders' });
  if (!limitPrice || limitPrice <= 0) return res.status(400).json({ error: 'Invalid limit price' });
  if (!dollarAmount && !shares) return res.status(400).json({ error: 'Provide dollarAmount or shares' });

  const isCrypto = !!CRYPTO_TICKER_MAP[ticker];
  const isPublic = !!PUBLIC_TICKER_MAP[ticker];
  if (!isCrypto && !isPublic) return res.status(400).json({ error: 'Ticker not tradeable' });

  if (user.kycStatus !== 'approved') {
    return res.status(403).json({ error: 'KYC approval required' });
  }

  // BUY: reserve dollars
  if (side === 'buy') {
    const cost = dollarAmount || (shares * limitPrice);
    if (cost > (user.balanceUSD || 0)) {
      return res.status(400).json({ error: 'Insufficient buying power for reservation' });
    }
    await Profile.updateOne({ _id: user._id }, { $inc: { balanceUSD: -cost } });
  }

  // SELL: verify share availability
  if (side === 'sell') {
    const positions = await Position.find({ userId: user._id, ticker, status: 'open' }).lean();
    const totalShares = positions.reduce((s, p) => s + p.quantity, 0);
    const sharesNeeded = shares || (dollarAmount / limitPrice);
    const pendingSells = await Order.find({
      userId: user._id, ticker, status: { $in: ['pending', 'partially_filled'] }, side: 'sell'
    }).lean();
    const alreadyReserved = pendingSells.reduce((s, o) => s + ((o.shares || 0) - (o.filledShares || 0)), 0);
    if (sharesNeeded > (totalShares - alreadyReserved)) {
      return res.status(400).json({ error: 'Insufficient shares. Available: ' + (totalShares - alreadyReserved).toFixed(4) });
    }
  }

  const order = await Order.create({
    userId: user._id, ticker,
    assetType: isCrypto ? 'crypto' : 'stock',
    side, orderType, timeInForce: 'gtc',
    dollarAmount: dollarAmount || null,
    shares: shares || null,
    limitPrice,
    status: 'pending',
    companyName, logoUrl,
    placedAt: new Date(),
  });

  await Notification.create({
    userId: user._id,
    type: 'order',
    title: `${orderType === 'limit' ? 'Limit' : 'Stop'} order placed`,
    message: `${side.toUpperCase()} ${shares ? shares.toFixed(4) + ' shares' : '$' + _fmt(dollarAmount)} of ${ticker} @ $${_fmt(limitPrice)}`,
    link: '/orders',
  });

  return res.status(201).json({ ok: true, order });
}



// ═══════════════════════════════════════════════════
// FILL ENGINE — checks pending orders, fills those with triggered conditions
// Called lazily by /api/portfolio and other endpoints
// Idempotent + safe to call anywhere
// ═══════════════════════════════════════════════════
async function fillPendingOrders(userId) {
  const orders = await Order.find({
    userId,
    status: { $in: ['pending', 'partially_filled'] },
    orderType: { $in: ['limit', 'stop'] },
  }).lean();

  if (!orders.length) return { checked: 0, filled: 0 };

  // Group by ticker so we fetch each price once
  const tickers = [...new Set(orders.map(o => o.ticker))];
  const prices = {};
  await Promise.all(tickers.map(async t => {
    try { prices[t] = await fetchLivePrice(t); } catch(e) { /* skip */ }
  }));

  let filled = 0;
  for (const o of orders) {
    const q = prices[o.ticker];
    if (!q) continue;

    // Determine trigger condition
    let triggered = false;
    let execPrice;
    if (o.orderType === 'limit') {
      if (o.side === 'buy'  && q.ask <= o.limitPrice) { triggered = true; execPrice = q.ask; }
      if (o.side === 'sell' && q.bid >= o.limitPrice) { triggered = true; execPrice = q.bid; }
    } else if (o.orderType === 'stop') {
      // Stop-loss: sell when price DROPS to trigger; stop-buy: buy when price RISES to trigger
      if (o.side === 'sell' && q.bid <= o.limitPrice) { triggered = true; execPrice = q.bid; }
      if (o.side === 'buy'  && q.ask >= o.limitPrice) { triggered = true; execPrice = q.ask; }
    }
    if (!triggered) continue;

    // Apply slippage on fill
    execPrice = applySlippage(execPrice, o.side);

    try {
      if (o.side === 'buy') {
        // Reserved dollars are already deducted; create position
        const shares = o.shares || (o.dollarAmount / execPrice);
        const cost = o.dollarAmount || (shares * execPrice);

        await Position.create({
          userId: o.userId,
          ticker: o.ticker,
          assetType: o.assetType,
          side: 'long',
          entryPrice: execPrice,
          quantity: shares,
          costBasis: cost,
          status: 'open',
          openedAt: new Date(),
          companyName: o.companyName,
          logoUrl: o.logoUrl,
        });

        // If reservation was more than actual cost (shares-based fill), refund the difference
        const reserved = o.dollarAmount || (o.shares * o.limitPrice);
        const actual = shares * execPrice;
        const refund = reserved - actual;
        if (refund > 0.001) {
          await Profile.updateOne({ _id: o.userId }, { $inc: { balanceUSD: refund } });
        }

        await Order.updateOne({ _id: o._id }, {
          $set: { status: 'filled', filledShares: shares, filledPrice: execPrice, filledAt: new Date() }
        });

        await Notification.create({
          userId: o.userId,
          type: 'order',
          title: '✅ Limit order filled',
          message: `Bought ${shares.toFixed(4)} ${o.ticker} at $${_fmt(execPrice)} (your limit: $${_fmt(o.limitPrice)}).`,
          link: '/positions',
        });

        filled++;
      } else {
        // SELL fill — close FIFO across positions
        const positions = await Position.find({
          userId: o.userId, ticker: o.ticker, status: 'open'
        }).sort({ openedAt: 1 });

        let remaining = o.shares || (o.dollarAmount / execPrice);
        const held = positions.reduce((s, p) => s + p.quantity, 0);
        if (remaining > held) remaining = held;  // clip

        let totalProceeds = 0;
        let totalCostSold = 0;

        for (const p of positions) {
          if (remaining <= 0) break;
          const sellQty = Math.min(p.quantity, remaining);
          const costShare = (p.costBasis / p.quantity) * sellQty;
          const proceedsShare = execPrice * sellQty;

          if (sellQty >= p.quantity - 1e-9) {
            p.exitPrice = execPrice;
            p.closedAt = new Date();
            p.realizedPnl = proceedsShare - costShare;
            p.status = 'closed';
            await p.save();
          } else {
            p.quantity -= sellQty;
            p.costBasis -= costShare;
            await p.save();
            await Position.create({
              userId: p.userId, ticker: p.ticker, assetType: p.assetType,
              side: 'long', entryPrice: p.entryPrice,
              quantity: sellQty, costBasis: costShare,
              exitPrice: execPrice, closedAt: new Date(),
              realizedPnl: proceedsShare - costShare,
              status: 'closed', openedAt: p.openedAt,
              companyName: p.companyName, logoUrl: p.logoUrl,
            });
          }

          totalProceeds += proceedsShare;
          totalCostSold += costShare;
          remaining -= sellQty;
        }

        await Profile.updateOne({ _id: o.userId }, { $inc: { balanceUSD: totalProceeds } });

        const soldShares = (o.shares || (o.dollarAmount / execPrice)) - remaining;
        const pnl = totalProceeds - totalCostSold;
        const pnlSign = pnl >= 0 ? '+' : '';

        await Order.updateOne({ _id: o._id }, {
          $set: { status: 'filled', filledShares: soldShares, filledPrice: execPrice, filledAt: new Date() }
        });

        await Notification.create({
          userId: o.userId,
          type: 'order',
          title: '✅ Limit order filled',
          message: `Sold ${soldShares.toFixed(4)} ${o.ticker} at $${_fmt(execPrice)}. P&L: ${pnlSign}$${_fmt(pnl)}.`,
          link: '/positions',
        });

        filled++;
      }
    } catch (e) {
      console.error('[fillPendingOrders] order ' + o._id + ':', e.message);
    }
  }

  return { checked: orders.length, filled };
}

module.exports.fillPendingOrders = fillPendingOrders;

// ═══════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const user = await requireAuth(req, res, Profile);
    if (!user) return;

    const body = await readJson(req);
    const mode = (body.mode || 'reserve').toLowerCase();

    if (mode === 'trade-open')   return await handleTradeOpen(req, res, user, body);
    if (mode === 'trade-close')  return await handleTradeClose(req, res, user, body);
    if (mode === 'reserve')      return await handleReserve(req, res, user, body);
    if (mode === 'order-place')  return await handleOrderPlace(req, res, user, body);
    if (mode === 'order-cancel') return await handleOrderCancel(req, res, user, body);
    if (mode === 'order-list')   return await handleOrderList(req, res, user, body);
    if (mode === 'fill-check')   {
      const result = await fillPendingOrders(user._id);
      return res.status(200).json({ ok: true, ...result });
    }

    return res.status(400).json({ error: `Unknown mode: ${mode}` });

  } catch (err) {
    console.error('[api/buy]', err);
    return res.status(500).json({ error: err.message });
  }
};
