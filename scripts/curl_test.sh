#!/bin/bash

# Create test directory if it doesn't exist
mkdir -p ~/WYSWYG/Load\ Testing/test_files

# Create a small test file if it doesn't exist
TEST_FILE=~/WYSWYG/Load\ Testing/test_files/small-100KB.txt
if [ ! -f "$TEST_FILE" ]; then
  echo "Creating test file: $TEST_FILE"
  dd if=/dev/zero bs=102400 count=1 | tr '\0' 'A' > "$TEST_FILE"
fi

# Create even smaller test file (10KB)
TINY_FILE=~/WYSWYG/Load\ Testing/test_files/tiny-10KB.txt
if [ ! -f "$TINY_FILE" ]; then
  echo "Creating tiny test file: $TINY_FILE"
  dd if=/dev/zero bs=10240 count=1 | tr '\0' 'A' > "$TINY_FILE"
fi

# Set API details
API_URL="https://axxessio.wyswyg.in/api/v1/files/"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkxODQ2M2YyLWNjZDYtNDliZS1hMzQzLThlZGFiZDQxZmFmNyJ9.dbdf6Qvy2YIMyuI39KBSVxh6VF8AMW5xyDeZXDuKuL4"

echo "Attempting to upload tiny file (10KB) to $API_URL"

# Try curl upload with 30 second timeout and save response
curl -v -X POST \
  --max-time 30 \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TINY_FILE;filename=test-curl-upload.txt;type=text/plain" \
  "$API_URL" > upload_response.txt 2>&1

# Display response code
CURL_EXIT=$?
if [ $CURL_EXIT -eq 0 ]; then
  echo "Upload completed with curl exit code: $CURL_EXIT"
else
  echo "Upload failed with curl exit code: $CURL_EXIT"
  if [ $CURL_EXIT -eq 28 ]; then
    echo "Timeout occurred during upload"
  fi
fi

echo "Response saved to upload_response.txt"
echo -e "\nResponse summary:"
grep -A 10 "< HTTP" upload_response.txt || echo "No HTTP response found" 