#!/usr/bin/env python3
import os, re

# Load index.html to extract header + footer (for consistency)
with open('index.html', 'r') as f:
    index = f.read()

head_match = re.search(r'<head>.*?</head>', index, flags=re.DOTALL)
head = head_match.group(0)

header_match = re.search(r'<header[^>]*>.*?</header>', index, flags=re.DOTALL)
header = header_match.group(0) if header_match else ''

footer_match = re.search(r'<footer[^>]*>.*?</footer>', index, flags=re.DOTALL)
footer = footer_match.group(0) if footer_match else ''

def page(title, eyebrow, headline, sub, body_html, filename):
    html = f'''<!DOCTYPE html>
<html lang="en">
{head.replace('<title>', f'<title>{title} · ')}
<body>
{header}

<main class="sub-page">
  <div class="sub-page-inner">
    <a href="index.html" class="sub-back">&larr; Back to APEX IPO ACCESS</a>

    <header class="sub-head">
      <span class="sub-eyebrow">{eyebrow}</span>
      <h1 class="sub-headline">{headline}</h1>
      <p class="sub-sub">{sub}</p>
    </header>

    <div class="sub-body">
      {body_html}
    </div>
  </div>
</main>

{footer}

</body>
</html>
'''
    with open(filename, 'w') as f:
        f.write(html)
    print(f"✅ {filename}")


# ============================================
# PAGE CONTENT
# ============================================

PAGES = []

# ---- PRICING ----
PAGES.append((
    'Pricing & Tiers',
    'MEMBERSHIP STRUCTURE',
    'Three Tiers. One Standard of Access.',
    'Choose the membership aligned to your portfolio scale and allocation goals.',
    '''
    <div class="tier-grid">

      <article class="tier-card">
        <header class="tier-head">
          <span class="tier-tag">STANDARD</span>
          <div class="tier-price"><span class="tier-amount">$2,400</span><span class="tier-period">/ year</span></div>
          <p class="tier-desc">Entry-level access for accredited investors building their first pre-IPO positions.</p>
        </header>
        <ul class="tier-features">
          <li>Investor briefing &amp; weekly intelligence</li>
          <li>Allocation requests up to $50,000 per offering</li>
          <li>Dashboard access &amp; valuation models</li>
          <li>Email &amp; chat support</li>
        </ul>
      </article>

      <article class="tier-card tier-featured">
        <div class="tier-badge">MOST POPULAR</div>
        <header class="tier-head">
          <span class="tier-tag">PREMIER</span>
          <div class="tier-price"><span class="tier-amount">$9,600</span><span class="tier-period">/ year</span></div>
          <p class="tier-desc">For active investors deploying capital across multiple Musk-ecosystem opportunities.</p>
        </header>
        <ul class="tier-features">
          <li>Everything in Standard</li>
          <li>Allocation requests up to $500,000 per offering</li>
          <li>Priority allocation queue</li>
          <li>Direct line to allocation desk</li>
          <li>Quarterly portfolio review</li>
        </ul>
      </article>

      <article class="tier-card">
        <header class="tier-head">
          <span class="tier-tag">FAMILY OFFICE</span>
          <div class="tier-price"><span class="tier-amount">Custom</span><span class="tier-period">contact desk</span></div>
          <p class="tier-desc">Tailored programmes for family offices, RIAs, and institutional capital.</p>
        </header>
        <ul class="tier-features">
          <li>Everything in Premier</li>
          <li>Unlimited allocation capacity</li>
          <li>Dedicated relationship manager</li>
          <li>Bespoke SPV structures</li>
          <li>Co-investment opportunities</li>
        </ul>
      </article>

    </div>

    <p class="sub-note">All fees are billed annually. A flat allocation fee applies to executed positions — full schedule provided at onboarding. APEX does not earn carry.</p>
    '''
))

# ---- STATS (LIVE IPO STATS) ----
PAGES.append((
    'Live IPO Stats',
    'REAL-TIME INTELLIGENCE',
    'Live IPO Stats Dashboard',
    'Real-time pricing, valuations, and allocation signals across the Musk ecosystem.',
    '''
    <div class="stats-preview-grid">
      <div class="stat-tile"><strong>$420B</strong><span>SpaceX implied valuation</span></div>
      <div class="stat-tile"><strong>$200B</strong><span>xAI latest round</span></div>
      <div class="stat-tile"><strong>$8B</strong><span>Neuralink secondary mark</span></div>
      <div class="stat-tile"><strong>2026-27</strong><span>SpaceX IPO window</span></div>
      <div class="stat-tile"><strong>$2.4B+</strong><span>Allocated via APEX</span></div>
      <div class="stat-tile"><strong>4,800+</strong><span>Verified investors</span></div>
    </div>

    <p class="sub-note">Full live dashboard available to verified members. Figures shown reflect latest reported transactions and are updated continuously.</p>
    '''
))

# ---- WAITLIST ----
PAGES.append((
    'Join Waitlist',
    'PRIORITY ALLOCATION LIST',
    'Reserve Your Position in the Queue.',
    'Join the waitlist to receive priority allocation when our next intake opens.',
    '''
    <form class="sub-form">
      <label>Full Name<input type="text" placeholder="Jane Doe" required></label>
      <label>Professional Email<input type="email" placeholder="jane@firm.com" required></label>
      <label>Investable Capital
        <select>
          <option>$1M – $5M</option>
          <option>$5M – $25M</option>
          <option>$25M – $100M</option>
          <option>$100M+</option>
        </select>
      </label>
      <label>Accredited Investor Status
        <select>
          <option>Yes — verified</option>
          <option>Yes — self-certified</option>
          <option>Not yet verified</option>
        </select>
      </label>
      <button type="submit">Join Priority Waitlist &rarr;</button>
    </form>
    '''
))

# ---- OPPORTUNITY PAGES ----
def opp(name, valuation, status, copy):
    return f'''
    <div class="opp-stats">
      <div class="opp-stat"><span>Implied Valuation</span><strong>{valuation}</strong></div>
      <div class="opp-stat"><span>Status</span><strong>{status}</strong></div>
      <div class="opp-stat"><span>Access Type</span><strong>Pre-IPO Secondary</strong></div>
    </div>
    <div class="opp-body">
      {copy}
    </div>
    <p class="sub-note">Allocation subject to availability and accredited-investor verification. Past performance does not indicate future results.</p>
    '''

PAGES.append((
    'SpaceX IPO',
    'OPPORTUNITY PROFILE',
    'SpaceX — The Defining IPO of the Decade.',
    'Position into the most anticipated public offering of a generation.',
    opp(
        'SpaceX',
        '$420B',
        '2026-27 listing window',
        '''<p>SpaceX represents the convergence of two trillion-dollar markets — global satellite connectivity (Starlink) and reusable space transport. APEX members can access verified secondary shares ahead of the public offering, with allocation routes through vetted SPV structures and direct secondary marketplaces.</p>
        <p>Our intelligence desk tracks every filing milestone, roadshow signal, and allocation window in real time, ensuring members are positioned before the broader market reacts.</p>'''
    )
))

PAGES.append((
    'xAI Pre-IPO',
    'OPPORTUNITY PROFILE',
    'xAI — The Frontier AI Position.',
    'Exposure to the AI lab competing at the frontier of artificial intelligence.',
    opp(
        'xAI',
        '$200B',
        'Pre-IPO secondary',
        '''<p>xAI sits at the intersection of frontier model research and the X platform&rsquo;s billions of real-time signals. Recent funding rounds have priced the company near $200B, with strategic capital from sovereign and institutional sources.</p>
        <p>APEX provides accredited members with vetted secondary access ahead of any potential public listing.</p>'''
    )
))

PAGES.append((
    'Neuralink Secondaries',
    'OPPORTUNITY PROFILE',
    'Neuralink — The Brain-Computer Interface Market.',
    'Early position in the most ambitious neurotechnology company in the world.',
    opp(
        'Neuralink',
        '$8B+',
        'Secondary market',
        '''<p>Neuralink&rsquo;s human trials are underway, with FDA breakthrough designation accelerating its path to commercial deployment. Secondary market activity reflects growing institutional confidence in the long-term medical and consumer applications.</p>
        <p>APEX members gain access to verified Neuralink secondaries through compliant SPV structures.</p>'''
    )
))

PAGES.append((
    'Tesla Allocations',
    'OPPORTUNITY PROFILE',
    'Tesla — Strategic Public Allocation.',
    'Institutional-grade entry &amp; exit strategies on the world&rsquo;s most-traded equity.',
    opp(
        'Tesla',
        'Public · NASDAQ: TSLA',
        'Active strategy',
        '''<p>Tesla remains a core position in the Musk ecosystem. APEX provides members with proprietary allocation frameworks — entry triggers, position sizing, and exit ladders calibrated to product cycles, FSD milestones, and energy-business inflection points.</p>'''
    )
))

# ---- ABOUT ----
PAGES.append((
    'About APEX',
    'WHO WE ARE',
    'APEX IPO ACCESS.',
    'An institutional intelligence platform built for the Musk-ecosystem IPO window.',
    '''
    <div class="sub-content">
      <p>APEX IPO ACCESS was founded to solve a single problem: accredited investors with the capital to participate in pre-IPO opportunities rarely have the network, intelligence, or execution infrastructure to do so on institutional terms.</p>

      <p>We operate as a private allocation desk &mdash; combining real-time intelligence, vetted secondary access, and disciplined execution &mdash; reserved for verified accredited investors building positions across SpaceX, xAI, Neuralink, and the broader Musk ecosystem.</p>

      <h3>Our Standards</h3>
      <ul class="sub-list">
        <li>SEC Regulation D compliant onboarding</li>
        <li>Segregated client capital in FDIC-insured custodians</li>
        <li>Shares held in client name through regulated broker-dealer</li>
        <li>No carry, no hidden spreads &mdash; transparent fee schedule</li>
      </ul>

      <h3>Leadership</h3>
      <p>Our team brings together experience from Goldman Sachs, Andreessen Horowitz, and Founders Fund &mdash; with deep relationships across the secondary-market and SPV-structuring ecosystem.</p>
    </div>
    '''
))

# ---- CONTACT ----
PAGES.append((
    'Contact',
    'GET IN TOUCH',
    'Speak With the Allocation Desk.',
    'For verified investors, accreditation queries, and institutional partnerships.',
    '''
    <div class="contact-grid">
      <div class="contact-card">
        <h3>Allocation Desk</h3>
        <p>For active members and allocation enquiries.</p>
        <a href="mailto:desk@apexipoaccess.com">desk@apexipoaccess.com</a>
      </div>
      <div class="contact-card">
        <h3>New Applications</h3>
        <p>Accreditation verification and onboarding.</p>
        <a href="mailto:apply@apexipoaccess.com">apply@apexipoaccess.com</a>
      </div>
      <div class="contact-card">
        <h3>Institutional Partnerships</h3>
        <p>Family offices, RIAs, and fund administrators.</p>
        <a href="mailto:partners@apexipoaccess.com">partners@apexipoaccess.com</a>
      </div>
      <div class="contact-card">
        <h3>Press &amp; Media</h3>
        <p>Editorial enquiries and media requests.</p>
        <a href="mailto:press@apexipoaccess.com">press@apexipoaccess.com</a>
      </div>
    </div>
    '''
))

# ---- PRESS ----
PAGES.append((
    'Press',
    'MEDIA &amp; PRESS',
    'In the Press.',
    'Recent coverage and media enquiries.',
    '''
    <div class="sub-content">
      <p>For editorial enquiries, interview requests, or background briefings, please contact <a href="mailto:press@apexipoaccess.com" class="how-link">press@apexipoaccess.com</a>.</p>
      <p>Press materials, leadership biographies, and platform statistics are available on request to verified journalists.</p>
    </div>
    '''
))

# ---- CAREERS ----
PAGES.append((
    'Careers',
    'JOIN APEX',
    'Build the Allocation Infrastructure of the Next Decade.',
    'We hire experienced operators across capital markets, compliance, and engineering.',
    '''
    <div class="sub-content">
      <h3>Open Roles</h3>
      <ul class="sub-list">
        <li>Senior Allocation Manager &mdash; New York</li>
        <li>Compliance Counsel (Reg D / Reg S) &mdash; Remote</li>
        <li>Full-Stack Engineer &mdash; San Francisco / Remote</li>
        <li>Client Success Lead &mdash; New York</li>
      </ul>
      <p>Submit applications to <a href="mailto:careers@apexipoaccess.com" class="how-link">careers@apexipoaccess.com</a> with role title in the subject line.</p>
    </div>
    '''
))

# ---- TERMS ----
PAGES.append((
    'Terms of Service',
    'LEGAL',
    'Terms of Service.',
    'Last updated: January 2025.',
    '''
    <div class="sub-legal">
      <h3>1. Eligibility</h3>
      <p>Use of APEX IPO ACCESS is restricted to verified accredited investors as defined by SEC Rule 501. By accessing this platform, you represent that you meet such criteria.</p>

      <h3>2. Nature of Service</h3>
      <p>APEX IPO ACCESS provides allocation, intelligence, and execution services. We do not provide investment, tax, or legal advice. Members are responsible for their own due diligence.</p>

      <h3>3. Fees</h3>
      <p>Membership fees are billed annually and non-refundable. Allocation fees apply only to executed positions and are disclosed in advance.</p>

      <h3>4. Risk</h3>
      <p>Pre-IPO and secondary-market investments are illiquid, high-risk, and may result in total loss. Past performance does not indicate future results.</p>

      <h3>5. Termination</h3>
      <p>APEX may terminate access for breach of these terms, violation of securities law, or failure to maintain accredited-investor status.</p>

      <h3>6. Governing Law</h3>
      <p>These terms are governed by the laws of the State of Delaware. Disputes shall be resolved in Delaware Chancery Court.</p>
    </div>
    '''
))

# ---- PRIVACY ----
PAGES.append((
    'Privacy Policy',
    'LEGAL',
    'Privacy Policy.',
    'How APEX collects, uses, and protects your personal information.',
    '''
    <div class="sub-legal">
      <h3>Information We Collect</h3>
      <p>Personal information necessary for accredited-investor verification, KYC/AML compliance, and tax reporting. This includes name, contact details, financial qualifications, and identity documents.</p>

      <h3>How We Use It</h3>
      <p>To verify eligibility, process allocations, satisfy regulatory obligations, and communicate with members regarding their account.</p>

      <h3>How We Protect It</h3>
      <p>256-bit encryption in transit and at rest. Segregated infrastructure. Access controls limited to authorised personnel. Annual third-party security audits.</p>

      <h3>Sharing</h3>
      <p>We share information only with regulated custodians, broker-dealers, and government authorities as required by law. We do not sell personal data.</p>

      <h3>Your Rights</h3>
      <p>You may request access, correction, or deletion of your data by contacting <a href="mailto:privacy@apexipoaccess.com" class="how-link">privacy@apexipoaccess.com</a>.</p>
    </div>
    '''
))

# ---- RISK DISCLOSURE ----
PAGES.append((
    'Risk Disclosure',
    'LEGAL',
    'Risk Disclosure.',
    'Important information about the risks of pre-IPO and secondary-market investments.',
    '''
    <div class="sub-legal">
      <h3>Illiquidity</h3>
      <p>Pre-IPO shares cannot be freely sold. Secondary liquidity is limited and subject to lock-up periods, transfer restrictions, and company consent.</p>

      <h3>Valuation Uncertainty</h3>
      <p>Private-company valuations are estimates and may differ materially from any future public-market price. There is no guarantee a company will achieve an IPO.</p>

      <h3>Loss of Principal</h3>
      <p>Pre-IPO investments may result in total loss of invested capital. Members should only allocate capital they can afford to lose entirely.</p>

      <h3>No Investment Advice</h3>
      <p>APEX provides intelligence and execution services, not investment advice. Members should consult their own qualified advisers.</p>

      <h3>Regulatory Risk</h3>
      <p>Changes in securities regulation, tax law, or company governance may materially affect the value or transferability of pre-IPO positions.</p>
    </div>
    '''
))

# ---- FORM CRS ----
PAGES.append((
    'Form CRS',
    'LEGAL',
    'Form CRS &mdash; Client Relationship Summary.',
    'A summary of the services, fees, and conflicts of interest at APEX IPO ACCESS.',
    '''
    <div class="sub-legal">
      <h3>What investment services and advice can you provide me?</h3>
      <p>APEX provides allocation, intelligence, and execution services for accredited investors seeking exposure to pre-IPO and secondary-market opportunities. We do not provide ongoing investment advice or discretionary asset management.</p>

      <h3>What fees will I pay?</h3>
      <p>An annual membership fee, plus a transparent allocation fee on executed positions. APEX does not charge carry, performance fees, or hidden spreads. Full fee schedule provided at onboarding.</p>

      <h3>What conflicts of interest do you have?</h3>
      <p>APEX may receive structuring or referral fees from SPV providers. All such arrangements are disclosed prior to allocation. We do not act as principal in transactions executed on behalf of members.</p>

      <h3>How do your professionals make money?</h3>
      <p>Through salary and discretionary bonus. Compensation is not tied to specific products or allocations.</p>

      <h3>Do you or your professionals have legal or disciplinary history?</h3>
      <p>No. Visit <a href="https://www.investor.gov" target="_blank" rel="noopener" class="how-link">Investor.gov</a> for a free, simple search tool to research APEX and its financial professionals.</p>
    </div>
    '''
))

# ============================================
# WRITE ALL PAGES
# ============================================
filenames = [
    'pricing.html', 'stats.html', 'waitlist.html',
    'spacex.html', 'xai.html', 'neuralink.html', 'tesla.html',
    'about.html', 'contact.html', 'press.html', 'careers.html',
    'terms.html', 'privacy.html', 'risk.html', 'form-crs.html'
]

for (title, eyebrow, headline, sub, body), fname in zip(PAGES, filenames):
    page(title, eyebrow, headline, sub, body, fname)

print(f"\n🎉 {len(filenames)} pages created.")
