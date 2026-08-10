#!/usr/bin/env python3
"""APEX admin login — no bash quoting gremlins."""
import os, sys, json, getpass, urllib.request, urllib.error, http.cookiejar
from pathlib import Path

BASE = os.environ.get('APEX_BASE', 'https://apexipoholdings.com')

print(f"\n🔐 APEX Admin Login\n   Base: {BASE}\n")

email = input("Email: ").strip()
password = getpass.getpass("Password: ")
print()

body = json.dumps({'email': email, 'password': password}).encode('utf-8')

# Set up cookie jar to capture Set-Cookie
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

req = urllib.request.Request(
    f"{BASE}/api/auth?action=login",
    data=body,
    headers={'Content-Type': 'application/json'},
    method='POST',
)

try:
    resp = opener.open(req, timeout=15)
    code = resp.status
    payload = resp.read().decode('utf-8', errors='replace')[:400]
except urllib.error.HTTPError as e:
    code = e.code
    payload = e.read().decode('utf-8', errors='replace')[:400]
except Exception as e:
    print(f"❌ Network error: {e}")
    sys.exit(1)

if code != 200:
    print(f"❌ Login failed (HTTP {code})")
    print(payload)
    sys.exit(1)

# Extract apex_token from cookie jar
token = None
for c in jar:
    if c.name == 'apex_token':
        token = c.value
        break

if not token:
    print("❌ No apex_token cookie in response")
    print(f"Cookies received: {[c.name for c in jar]}")
    sys.exit(1)

print(f"✅ Logged in as {email}")
print(f"✅ Token length: {len(token)}")

token_file = Path.home() / '.apex_token'
token_file.write_text(token)
token_file.chmod(0o600)
print(f"💾 Token saved to {token_file}")
print()
print(f"Use it via: APEX_TOKEN=$(cat ~/.apex_token) node scripts/...")
