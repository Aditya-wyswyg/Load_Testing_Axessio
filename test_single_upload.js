import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration Constants
const API_BASE_URL = 'https://axxessio.wyswyg.in/api/v1';
const FILE_UPLOAD_ENDPOINT = `${API_BASE_URL}/files/`;
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkxODQ2M2YyLWNjZDYtNDliZS1hMzQzLThlZGFiZDQxZmFmNyJ9.dbdf6Qvy2YIMyuI39KBSVxh6VF8AMW5xyDeZXDuKuL4';
const TEST_FILE_PATH = '/home/dev/WYSWYG/Load Testing/test_files/small-100KB.txt';

// Define options for the test
export const options = {
  vus: 1, // Single virtual user
  iterations: 1, // Just run once
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95% of requests must complete within 10s
  },
};

// Main test function
export default function() {
  console.log(`Starting test with file: ${TEST_FILE_PATH}`);
  
  // Set up the form data - trying different field name formats
  const formData = {
    'file': http.file(TEST_FILE_PATH, 'small-file.txt', 'text/plain'),
  };

  // Create headers with detailed debugging
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Cookie': `token=${AUTH_TOKEN}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  };

  console.log(`Sending request to ${FILE_UPLOAD_ENDPOINT}`);
  console.log(`Headers: ${JSON.stringify(headers)}`);
  
  // Use a longer timeout for debugging
  const params = {
    headers: headers,
    timeout: '60s',
  };

  // Send the request
  const response = http.post(FILE_UPLOAD_ENDPOINT, formData, params);
  
  // Log response details for debugging
  console.log(`Response status: ${response.status}`);
  console.log(`Response headers: ${JSON.stringify(response.headers)}`);
  console.log(`Response body: ${response.body}`);
  
  try {
    // If the response has a body, try to parse it as JSON
    if (response.body) {
      const jsonBody = JSON.parse(response.body);
      console.log(`Parsed JSON response: ${JSON.stringify(jsonBody)}`);
    }
  } catch (e) {
    console.log(`Error parsing response body as JSON: ${e.message}`);
  }
  
  // Basic checks
  check(response, {
    'status is 200': (r) => r.status === 200,
    'has response body': (r) => r.body !== null && r.body !== '',
  });
  
  sleep(1);
} 