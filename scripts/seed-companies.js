// Run once: node scripts/seed-companies.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Company = require('../models/Company');

const SEED = [
  { ticker:'SPCX',    name:'SpaceX',           sector:'Aerospace',     stage:'Live IPO',    valuation:'$400B', pricePerShare:135, successRate:92, expectedReturn:'+40% to +70%', growthYoY:'+45%',  ipoWindow:'Q1 2026', foundedYear:2002, hq:'Hawthorne, CA',     domain:'spacex.com',        description:'Designs and manufactures advanced rockets and spacecraft.', sortOrder:1 },
  { ticker:'OAIB',    name:'OpenAI',           sector:'AI',            stage:'IPO',     valuation:'$157B', pricePerShare:85,  successRate:88, expectedReturn:'+35% to +60%', growthYoY:'+220%', ipoWindow:'2026',    foundedYear:2015, hq:'San Francisco, CA', domain:'openai.com',        description:'AI research and deployment company.', sortOrder:2 },
  { ticker:'STRP',    name:'Stripe',           sector:'Fintech',       stage:'IPO',     valuation:'$70B',  pricePerShare:42,  successRate:90, expectedReturn:'+25% to +50%', growthYoY:'+35%',  ipoWindow:'2026',    foundedYear:2010, hq:'San Francisco, CA', domain:'stripe.com',        description:'Online payment processing platform.', sortOrder:3 },
  { ticker:'ANTH',    name:'Anthropic',        sector:'AI',            stage:'IPO',     valuation:'$60B',  pricePerShare:65,  successRate:85, expectedReturn:'+30% to +55%', growthYoY:'+180%', ipoWindow:'2026',    foundedYear:2021, hq:'San Francisco, CA', domain:'anthropic.com',     description:'AI safety company, creators of Claude.', sortOrder:4 },
  { ticker:'XAI',     name:'xAI',              sector:'AI',            stage:'IPO',     valuation:'$50B',  pricePerShare:38,  successRate:80, expectedReturn:'+35% to +65%', growthYoY:'+150%', ipoWindow:'2026',    foundedYear:2023, hq:'Bay Area, CA',      domain:'x.ai',              description:'AI startup by Elon Musk building Grok.', sortOrder:5 },
  { ticker:'NLNK',    name:'Neuralink',        sector:'Biotech',       stage:'IPO',     valuation:'$8B',   pricePerShare:25,  successRate:75, expectedReturn:'+45% to +80%', growthYoY:'+90%',  ipoWindow:'2027',    foundedYear:2016, hq:'Fremont, CA',       domain:'neuralink.com',     description:'Brain-computer interface technology.', sortOrder:6 },
  { ticker:'DBRX',    name:'Databricks',       sector:'Data',          stage:'IPO',     valuation:'$62B',  pricePerShare:73,  successRate:87, expectedReturn:'+30% to +55%', growthYoY:'+60%',  ipoWindow:'2026',    foundedYear:2013, hq:'San Francisco, CA', domain:'databricks.com',    description:'Unified analytics platform for big data and AI.', sortOrder:7 },
  { ticker:'CNVA',    name:'Canva',            sector:'SaaS',          stage:'IPO',     valuation:'$32B',  pricePerShare:48,  successRate:86, expectedReturn:'+25% to +45%', growthYoY:'+40%',  ipoWindow:'2026',    foundedYear:2013, hq:'Sydney, Australia', domain:'canva.com',         description:'Online graphic design platform.', sortOrder:8 },
  { ticker:'STARLINK',name:'Starlink',         sector:'Satellite',     stage:'IPO',     valuation:'$140B', pricePerShare:78,  successRate:91, expectedReturn:'+40% to +70%', growthYoY:'+80%',  ipoWindow:'2026',    foundedYear:2015, hq:'Hawthorne, CA',     domain:'starlink.com',      description:'Satellite internet constellation by SpaceX.', sortOrder:9 },
  { ticker:'BORING',  name:'The Boring Company',sector:'Infrastructure',stage:'IPO',    valuation:'$5.7B', pricePerShare:18,  successRate:70, expectedReturn:'+30% to +60%', growthYoY:'+25%',  ipoWindow:'2027',    foundedYear:2016, hq:'Bastrop, TX',       domain:'boringcompany.com', description:'Tunnel construction company.', sortOrder:10 },
  { ticker:'XCORP',   name:'X Corp',           sector:'Social',        stage:'IPO',     valuation:'$19B',  pricePerShare:22,  successRate:65, expectedReturn:'+20% to +45%', growthYoY:'+15%',  ipoWindow:'2027',    foundedYear:2023, hq:'San Francisco, CA', domain:'x.com',             description:'Social media platform (formerly Twitter).', sortOrder:11 },
  { ticker:'TESLA',   name:'Tesla',            sector:'Auto',          stage:'Public',      valuation:'$1.2T', pricePerShare:380, successRate:95, expectedReturn:'+15% to +30%', growthYoY:'+20%',  ipoWindow:'Public',  foundedYear:2003, hq:'Austin, TX',        domain:'tesla.com',         description:'Electric vehicles and clean energy.', sortOrder:12 },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    let inserted = 0, updated = 0;
    for (const c of SEED) {
      const existing = await Company.findOne({ ticker: c.ticker });
      if (existing) {
        await Company.updateOne({ ticker: c.ticker }, { $set: c });
        updated++;
      } else {
        await Company.create(c);
        inserted++;
      }
    }
    console.log(`✅ Seeded: ${inserted} inserted, ${updated} updated`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
})();
