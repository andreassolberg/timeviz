#!/bin/bash

# Frost API wrapper script
# Usage: ./frost-api.sh "endpoint"
# Requires: source .env (or export FROST_CLIENT_ID=your_key)

# Check if FROST_CLIENT_ID exists
if [ -z "$FROST_CLIENT_ID" ]; then
    echo "❌ FROST_CLIENT_ID not found"
    echo "Run: source .env"
    echo "Or: export FROST_CLIENT_ID=your_api_key"
    exit 1
fi

# Base URL
BASE_URL="https://frost.met.no"

# Create auth header
AUTH="Authorization: Basic $(echo -n "$FROST_CLIENT_ID:" | base64)"

# Execute curl with auth
if [ $# -eq 0 ]; then
    echo "Usage: $0 <endpoint>"
    echo "Example: $0 /sources/v0.jsonld?ids=SN68860"
    echo ""
    echo "Common endpoints:"
    echo "  /sources/v0.jsonld?ids=SN68860"
    echo "  /sources/v0.jsonld?county=TR%C3%98NDELAG"
    echo "  /elements/v0.jsonld"
    echo "  /observations/v0.jsonld?sources=SN68860&referencetime=2024-06-13T00:00:00Z/2024-06-13T12:00:00Z&elements=air_temperature"
    exit 1
fi

# URL encode the endpoint if needed
ENDPOINT="$1"

# Execute curl and capture response
RESPONSE=$(curl -s -w "\n%{http_code}" -H "$AUTH" "$BASE_URL$1")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Check HTTP status
if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ HTTP Error: $HTTP_CODE"
    echo "$BODY"
    exit 1
fi

# Add jq formatting if available
if command -v jq &> /dev/null; then
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo "$BODY"
fi