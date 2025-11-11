#!/bin/bash

# Import all compliance standards into the GRC platform
# Run this script after starting the backend server

API_URL="http://localhost:8080/api/v1/standards/import"
STANDARDS_DIR="./standards-data"

# Get admin JWT token
echo "Logging in as admin..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Authentication successful"
echo ""

# Import each standard
import_standard() {
  local file=$1
  local name=$(basename "$file" .json)
  
  echo "📦 Importing $name..."
  
  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d @"$file")
  
  status=$(echo "$response" | jq -r '.status // "error"')
  
  if [ "$status" = "success" ]; then
    controls=$(echo "$response" | jq -r '.controls_imported')
    standard=$(echo "$response" | jq -r '.standard')
    echo "✅ $name imported: $standard ($controls controls)"
  else
    echo "❌ Failed to import $name"
    echo "   Response: $response"
  fi
  echo ""
}

# Import all standards
echo "Starting import of 5 compliance standards..."
echo "=============================================="
echo ""

import_standard "$STANDARDS_DIR/CIS-v8.json"
import_standard "$STANDARDS_DIR/ISO-27001-2022.json"
import_standard "$STANDARDS_DIR/NIS-2-Directive.json"
import_standard "$STANDARDS_DIR/SOC-2.json"
import_standard "$STANDARDS_DIR/GDPR.json"

echo "=============================================="
echo "Import process complete!"
echo ""
echo "To verify, check:"
echo "  GET http://localhost:8080/api/v1/standards"
