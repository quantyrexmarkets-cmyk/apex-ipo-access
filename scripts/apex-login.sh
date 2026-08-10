#!/bin/bash
BASE="${APEX_BASE:-https://apexipoholdings.com}"

echo ""
echo "🔐 APEX Admin Login"
echo "   Base: $BASE"
echo ""

read -p "Email: " EMAIL
read -s -p "Password: " PASSWORD
echo ""
echo ""

# Build JSON safely via python (handles special chars in password)
JSON=$(python3 -c "import json,sys; print(json.dumps({'email':sys.argv[1],'password':sys.argv[2]}))" "$EMAIL" "$PASSWORD")

COOKIE_JAR=$(mktemp)
RESP=$(curl -s -c "$COOKIE_JAR" -w "\n%{http_code}" \
  -X POST "$BASE/api/auth?action=login" \
  -H "Content-Type: application/json" \
  -d "$JSON")

HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '"'"'$d'"'"')

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Login failed (HTTP $HTTP_CODE)"
  echo "$BODY" | head -c 300
  echo ""
  rm -f "$COOKIE_JAR"
  exit 1
fi

TOKEN=$(grep -oP '"'"'apex_token\s+\K\S+'"'"' "$COOKIE_JAR" | head -1)
rm -f "$COOKIE_JAR"

if [ -z "$TOKEN" ]; then
  echo "❌ Could not extract apex_token"
  exit 1
fi

echo "✅ Logged in as $EMAIL"
echo "✅ Token length: ${#TOKEN}"

TOKEN_FILE="$HOME/.apex_token"
echo "$TOKEN" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"
echo "💾 Token saved to $TOKEN_FILE (mode 600)"
echo ""
echo "Use it via: APEX_TOKEN=\$(cat ~/.apex_token) node scripts/..."
