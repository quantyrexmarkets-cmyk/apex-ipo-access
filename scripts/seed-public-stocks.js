#!/usr/bin/env node
/**
 * Seed 13 public stocks into MongoDB via admin API.
 * Idempotent — re-running skips existing tickers.
 *
 * Usage:
 *   1. Log into /adminprivate/login in your browser
 *   2. Grab your apex_token cookie value
 *   3. Run: APEX_TOKEN=xxx node scripts/seed-public-stocks.js
 *   OR:    node scripts/seed-public-stocks.js  (will prompt)
 */

const readline = require('readline');

const BASE = process.env.APEX_BASE || 'https://apexipoholdings.com';

const STOCKS = [
  // Magnificent Seven
  { ticker: 'AAPL',  name: 'Apple',            domain: 'apple.com',           sector: 'Tech',           valuation: '$3.5T',  sortOrder: 20 },
  { ticker: 'MSFT',  name: 'Microsoft Corp',   domain: 'microsoft.com',       sector: 'Tech',           valuation: '$3.1T',  sortOrder: 21 },
  { ticker: 'GOOGL', name: 'Alphabet Inc',     domain: 'abc.xyz',             sector: 'Tech',           valuation: '$2.1T',  sortOrder: 22 },
  { ticker: 'AMZN',  name: 'Amazon',           domain: 'amazon.com',          sector: 'E-commerce',     valuation: '$2.0T',  sortOrder: 23 },
  { ticker: 'META',  name: 'Meta',             domain: 'meta.com',            sector: 'Social',         valuation: '$1.4T',  sortOrder: 24 },
  { ticker: 'NVDA',  name: 'NVIDIA',           domain: 'nvidia.com',          sector: 'Semiconductors', valuation: '$3.3T',  sortOrder: 25 },
  // Hot Stocks
  { ticker: 'V',     name: 'Visa',             domain: 'visa.com',            sector: 'Fintech',        valuation: '$620B',  sortOrder: 30 },
  { ticker: 'NXPI',  name: 'NXP Semiconductors', domain: 'nxp.com',           sector: 'Semiconductors', valuation: '$60B',   sortOrder: 31 },
  { ticker: 'UBS',   name: 'UBS Group AG',     domain: 'ubs.com',             sector: 'Banking',        valuation: '$100B',  sortOrder: 32 },
  { ticker: 'JPM',   name: 'JPMorgan',         domain: 'jpmorganchase.com',   sector: 'Banking',        valuation: '$620B',  sortOrder: 33 },
  { ticker: 'BAC',   name: 'Bank of America',  domain: 'bankofamerica.com',   sector: 'Banking',        valuation: '$320B',  sortOrder: 34 },
  { ticker: 'NFLX',  name: 'Netflix',          domain: 'netflix.com',         sector: 'Media',          valuation: '$300B',  sortOrder: 35 },
  { ticker: 'PLTR',  name: 'Palantir',         domain: 'palantir.com',        sector: 'Data',           valuation: '$150B',  sortOrder: 36 },
];

const COMMON = {
  stage: 'Public',
  status: 'active',
  pricePerShare: 0,           // Live price from Finnhub overrides display
  minInvestment: 0,
  maxInvestment: 0,
  successRate: 0,
  expectedReturn: '',
  growthYoY: '',
  ipoWindow: '',
  showOnHomepage: true,
  description: 'Publicly traded stock.',
};

async function prompt(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise(resolve => rl.question(q, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  let token = process.env.APEX_TOKEN;
  if (!token) {
    console.log('\n🔑  Need your admin session cookie (apex_token).');
    console.log('   Get it from: browser DevTools → Application → Cookies → apexipoholdings.com → apex_token\n');
    token = (await prompt('Paste apex_token: ')).trim();
  }
  if (!token) {
    console.error('❌ No token provided. Exiting.');
    process.exit(1);
  }

  console.log(`\n🚀 Seeding ${STOCKS.length} companies to ${BASE}\n`);

  const results = { added: 0, exists: 0, failed: 0 };

  for (const stock of STOCKS) {
    const body = { ...COMMON, ...stock };
    try {
      const r = await fetch(`${BASE}/api/admin?resource=companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `apex_token=${token}`,
        },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));

      if (r.status === 201 && j.ok) {
        console.log(`✅ ${stock.ticker.padEnd(6)} added         (${stock.name})`);
        results.added++;
      } else if (r.status === 409) {
        console.log(`↻  ${stock.ticker.padEnd(6)} already exists`);
        results.exists++;
      } else if (r.status === 401 || r.status === 403) {
        console.error(`\n❌ Auth failed (${r.status}). Token invalid or not admin.`);
        console.error('   Log into /adminprivate/login and grab a fresh apex_token cookie.\n');
        process.exit(1);
      } else {
        console.error(`❌ ${stock.ticker.padEnd(6)} failed  status=${r.status} ${j.error || ''}`);
        results.failed++;
      }
    } catch (e) {
      console.error(`❌ ${stock.ticker.padEnd(6)} network error: ${e.message}`);
      results.failed++;
    }
    // Gentle pacing so we don't spam
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n─────────────────────────────`);
  console.log(`  Added:   ${results.added}`);
  console.log(`  Existed: ${results.exists}`);
  console.log(`  Failed:  ${results.failed}`);
  console.log(`─────────────────────────────\n`);

  // Verify
  console.log('🔍 Verifying via /api/companies…');
  const vR = await fetch(`${BASE}/api/companies`);
  const vJ = await vR.json();
  if (vJ.ok) {
    const publicOnes = (vJ.companies || []).filter(c => c.stage === 'Public');
    console.log(`✅ Total companies in DB: ${vJ.companies.length}`);
    console.log(`✅ Public stocks: ${publicOnes.length}`);
    console.log(`   ${publicOnes.map(c => c.ticker).join(', ')}\n`);
  }
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
