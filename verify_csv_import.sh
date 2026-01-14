#!/bin/bash

# Configuration
API_URL="http://localhost:8787/api/checklist"
USER_ID="01990d69-5246-733d-8605-1ed319a3f98d"
HEADERS=(-H "Content-Type: application/json" -H "x-demo-auth: true" -H "x-demo-user-id: $USER_ID")

echo "1. Creating a test template..."
TEMPLATE_RESPONSE=$(curl -s -X POST "$API_URL/checklist-templates" "${HEADERS[@]}" -d '{
  "name": "Test CSV Import Template",
  "category": "Test",
  "is_public": false
}')
echo "Response: $TEMPLATE_RESPONSE"

TEMPLATE_ID=$(echo $TEMPLATE_RESPONSE | grep -o '"id":[^,}]*' | cut -d':' -f2 | tr -d ' ')

if [ -z "$TEMPLATE_ID" ]; then
  echo "Failed to create template"
  exit 1
fi

echo "Created template with ID: $TEMPLATE_ID"

echo "2. Creating a field for the template..."
FIELD_RESPONSE=$(curl -s -X POST "$API_URL/checklist-fields" "${HEADERS[@]}" -d "{
  \"template_id\": $TEMPLATE_ID,
  \"field_name\": \"Test Field\",
  \"field_type\": \"text\",
  \"is_required\": true,
  \"order_index\": 0
}")
echo "Response: $FIELD_RESPONSE"

FIELD_ID=$(echo $FIELD_RESPONSE | grep -o '"id":[^,}]*' | cut -d':' -f2 | tr -d ' ')

if [ -z "$FIELD_ID" ]; then
  echo "Failed to create field"
  exit 1
fi

echo "Created field with ID: $FIELD_ID"

echo "3. Verifying field existence..."
TEMPLATE_DETAILS=$(curl -s -X GET "$API_URL/checklist-templates/$TEMPLATE_ID" "${HEADERS[@]}")
echo "Template Details: $TEMPLATE_DETAILS"

if echo "$TEMPLATE_DETAILS" | grep -q "Test Field"; then
  echo "SUCCESS: Field 'Test Field' found in template details."
else
  echo "FAILURE: Field 'Test Field' NOT found in template details."
  exit 1
fi

echo "Cleaning up..."
curl -s -X DELETE "$API_URL/checklist-templates/$TEMPLATE_ID" "${HEADERS[@]}"
echo "Cleanup complete."
