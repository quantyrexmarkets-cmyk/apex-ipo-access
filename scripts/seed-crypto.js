#!/usr/bin/env node
/**
 * Seed 6 cryptocurrencies as tradeable assets.
 * Idempotent — re-running skips existing tickers.
 */

const BASE = process.env.APEX_BASE || 'https://apexipoholdings.com';

const CRYPTOS = [
  { ticker: 'BTC',  name: 'Bitcoin',  domain: 'bitcoin.org',   sector: 'Crypto', valuation: '$1.3T', sortOrder: 40 },
  { ticker: 'ETH',  name: 'Ethereum', domain: 'ethereum.org',  sector: 'Crypto', valuation: '$400B', sortOrder: 41 },
  { ticker: 'SOL',  name: 'Solana',   domain: 'solana.com',    sector: 'Crypto', valuation: '$85B',  sortOrder: 42 },
  { ticker: 'XRP',  name: 'XRP',      domain: 'ripple.com',    sector: 'Crypto', valuation: '$130B', sortOrder: 43 },
  { ticker: 'BNB',  name: 'BNB',      domain: 'bnbchain.org',  sector: 'Crypto', valuation: '$95B',  sortOrder: 44 },
  { ticker: 'ADA',  name: 'Cardano',  domain: 'cardano.org',   sector: 'Crypto', valuation: '$35B',  sortOrder: 45 },
];

const COMMON = {
  stage: 'Crypto',
  status: 'active',
  pricePerShare: 0,
  minInvestment: 0,
  maxInvestment: 0,
  successRate: 0,
  expectedReturn: '',
  growthYoY: '',
  ipoWindow: '',
  showOnHomepage: true,
  description: 'Cryptocurrency tradeable 24/7 via live market price.',
};

async function main() {
  const token = process.env.APEX_TOKEN;
  if (!token) {
    console.error('❌ Set APEX_TOKEN env var. Run: APEX_TOKEN=$(cat ~/.apex_token) node scripts/seed-crypto.js');
    process.exit(1);
  }

  console.log(`\n🚀 Seeding ${CRYPTOS.length} crypto assets to ${BASE}\n`);
  const results = { added: 0, exists: 0, failed: 0 };

  for (const c of CRYPTOS) {
    const body = { ...COMMON, ...c };
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

      // Note: 500 with AdminLog error still means company was created — check by verifying
      if (r.status === 201 && j.ok) {
        console.log(`✅ ${c.ticker.padEnd(4)}  added         (${c.name})`);
        results.added++;
      } else if (r.status === 409) {
        console.log(`↻  ${c.ticker.padEnd(4)}  already exists`);
        results.exists++;
      } else if (r.status === 500 && (j.error || '').includes('AdminLog')) {
        console.log(`✅ ${c.ticker.padEnd(4)}  added (AdminLog cosmetic 500 — company saved)`);
        results.added++;
      } else {
        console.error(`❌ ${c.ticker.padEnd(4)}  failed  status=${r.status} ${j.error || ''}`);
        results.failed++;
      }
    } catch (e) {
      console.error(`❌ ${c.ticker.padEnd(4)}  network error: ${e.message}`);
      results.failed++;
    }
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n─────────────────────────────`);
  console.log(`  Added:   ${results.added}`);
  console.log(`  Existed: ${results.exists}`);
  console.log(`  Failed:  ${results.failed}`);
  console.log(`─────────────────────────────\n`);

  const vR = await fetch(`${BASE}/api/companies`);
  const vJ = await vR.json();
  if (vJ.ok) {
    const cryptos = (vJ.companies || []).filter(x => x.stage === 'Crypto');
    console.log(`✅ Total companies in DB: ${vJ.companies.length}`);
    console.log(`✅ Crypto assets: ${cryptos.length}`);
    console.log(`   ${cryptos.map(x => x.ticker).join(', ')}\n`);
  }
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
