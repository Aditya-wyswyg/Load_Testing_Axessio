import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const successRate = new Rate('success_rate');
const uploadedBytes = new Counter('uploaded_bytes');
const uploadDuration = new Trend('upload_duration');
const ttfb = new Trend('time_to_first_byte');
const connectionTime = new Trend('connection_time');

// For enhanced debugging
const debugLog = [];
function log(message) {
  console.log(`[DEBUG ${new Date().toISOString()}] ${message}`);
  debugLog.push(`[${new Date().toISOString()}] ${message}`);
}

// Configuration Constants
export const API_BASE_URL = 'https://axxessio.wyswyg.in/api/v1'; // Updated with actual server URL
const FILE_UPLOAD_ENDPOINT = `${API_BASE_URL}/files/`;

// Multiple user tokens for realistic load testing
const USER_TOKENS = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNmN2RjZGFhLTgzNmYtNDc2OS05NDdkLTkyZjcwYTQ4NTc3NSJ9.VU4IMu7-KED8BhphzNiKF4HoXDGp7bzRhvuzJK006Tk',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZmZDJjZWM2LWVmYzAtNDU4MS1hMDA3LTU2MWJhZTEwYTVhNSJ9.DVT76JkMxpKE6m907KWSwUi0iwjo1C-BCHr5mfOydus',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgwOTlkNzQzLWUxNDctNGE1NC05Nzg5LTZhMzllNTgzZWU2ZCJ9.rUcarQctc5rPvGCbOo1zjloqh7LGdYwo1hYk-EKEDu8',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg2ZmZlYjQ0LWQzNmQtNGViOS04NmRmLWY0NDFmNmE0OTVhZCJ9.L9fKhVu7eiYAFZZuDbjBSqFJolzzEbAjn4D6PU6Kgi0',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVlMzY2OTI0LThjNmMtNGU1OS04NWY0LTc2NDY4MmFjZmNjZCJ9.vHYCJ0I3Xz_dIq9fVUNsD1dGziTgHQukPCFbF5B5AKU',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY3MTkzOGFhLTllYTgtNDAxOC04MzlmLTI5OTEwODM4MmE0NyJ9.5PIiXOcxhTriMBeuv0NOsqewfpzhMyR6iCaq6i6oaZk',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRlMTYxMTMxLTJkMzAtNDZiNS04OTBkLTJlZmE3NDM0MjUzNyJ9.v7XL5j-spteI40QHBuqoiejomojBcbAhE9wny4CVmI4',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2NTY3YmVhLWZiOGItNDJhMS1hZGQxLTA3NDc5YWMzMDU1MSJ9.Ckz_XqQ8mqN1XGi2yS9C3vsFWUbUoj9ynBKJRm5DJjg',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ3ZDMxZjRjLWNiMzctNDdiNC1iZGVlLWY5MmMzMWNlZmY0OSJ9.dzVF8vSeKtVfxpcWokkLUklCg2pwnoNaX7hQJHwGoxM',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI0MGJlMTMwLTU1YjYtNGIzZS1iZmVlLTA1ZDg5OGYxMjIzNSJ9.42h1T_Tf4qhuUHOxyTxTd1LfeG2LR5A-o6Mr3BI2dvQ',
];

// Function to get a random user token
function getRandomUserToken() {
  if (USER_TOKENS.length === 1) {
    return USER_TOKENS[0];
  }
  const randomIndex = Math.floor(Math.random() * USER_TOKENS.length);
  return USER_TOKENS[randomIndex];
}

// Function to get user token based on VU (Virtual User) ID for consistent user simulation
function getUserTokenByVU() {
  const vuIndex = (__VU - 1) % USER_TOKENS.length;
  return USER_TOKENS[vuIndex];
}

// Define file paths for disk-based test files
const TEST_FILES = {
  // Text files - these will be converted to PDF by the server
  'very-small-10KB.txt': { path: '/home/dev/WYSWYG/Load Testing/test_files/very-small-10KB.txt', contentType: 'text/plain', size: 10 * 1024 },
  'small-100KB.txt': { path: '/home/dev/WYSWYG/Load Testing/test_files/small-100KB.txt', contentType: 'text/plain', size: 100 * 1024 },
  'medium-1MB.txt': { path: '/home/dev/WYSWYG/Load Testing/test_files/medium-1MB.txt', contentType: 'text/plain', size: 1 * 1024 * 1024 },
  
  // Word documents
  'document-50KB.docx': { path: '/home/dev/WYSWYG/Load Testing/test_files/document-50KB.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 50 * 1024 },
  'document-100KB.docx': { path: '/home/dev/WYSWYG/Load Testing/test_files/document-100KB.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 100 * 1024 },
  
  // PowerPoint presentations
  'presentation-50KB.pptx': { path: '/home/dev/WYSWYG/Load Testing/test_files/presentation-50KB.pptx', contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 50 * 1024 },
  'presentation-100KB.pptx': { path: '/home/dev/WYSWYG/Load Testing/test_files/presentation-100KB.pptx', contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 100 * 1024 },
  
  // Excel spreadsheets
  'spreadsheet-50KB.xlsx': { path: '/home/dev/WYSWYG/Load Testing/test_files/spreadsheet-50KB.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 50 * 1024 },
  'spreadsheet-100KB.xlsx': { path: '/home/dev/WYSWYG/Load Testing/test_files/spreadsheet-100KB.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 100 * 1024 },
};

// Helper function to upload a file from disk
function uploadFile(file, simulatedNetworkDelay = 0) {
  try {
    // Simulate network latency if specified
    if (simulatedNetworkDelay > 0) {
      sleep(simulatedNetworkDelay / 1000); // Convert ms to seconds
    }

    log(`Starting upload of ${file.name} (${file.size} bytes) from path ${file.path}`);

    const formData = {
      file: http.file(file.path, file.name, file.contentType),
    };

    // IMPORTANT: Don't specify Content-Type here, k6 will set it correctly with boundary
    const params = {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getUserTokenByVU()}`,
      },
      tags: { name: `Upload ${file.name}` },
      timeout: '120s', // Longer timeout for larger files
    };

    // Measure the start time to calculate our own metrics
    const startTime = new Date().getTime();
    log(`HTTP request prepared, sending to ${FILE_UPLOAD_ENDPOINT}`);
    
    const response = http.post(FILE_UPLOAD_ENDPOINT, formData, params);
    
    // Calculate and add metrics
    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    
    uploadDuration.add(duration);
    ttfb.add(response.timings.waiting);
    connectionTime.add(response.timings.connecting);
    uploadedBytes.add(file.size);
    
    // Check if the upload was successful
    let success = false;
    let uploadedFileInfo = null;
    
    if (response.status === 200) {
      try {
        // The response is an array with the file info
        if (response.body) {
          const responseData = JSON.parse(response.body);
          if (Array.isArray(responseData) && responseData.length > 0) {
            uploadedFileInfo = responseData[0];
            if (uploadedFileInfo && uploadedFileInfo.id) {
              success = true;
            }
          }
        }
      } catch (e) {
        log(`Error parsing response: ${e}`);
        log(`Response body: ${response.body}`);
      }
    }
    
    successRate.add(success);
    
    if (success) {
      log(`Upload successful for ${file.name}, took ${duration}ms, file ID: ${uploadedFileInfo.id}`);
    } else {
      log(`Upload FAILED for ${file.name}: Status ${response.status}`);
      if (response.body) {
        log(`Response body: ${response.body}`);
      }
    }
    
    return response;
  } catch (error) {
    log(`ERROR during upload of ${file.name}: ${error.message}`);
    throw error;
  }
}

// Helper to get a random file from all available types
function getRandomFile() {
  const fileKeys = Object.keys(TEST_FILES);
  const randomKey = fileKeys[Math.floor(Math.random() * fileKeys.length)];
  const selectedFile = TEST_FILES[randomKey];
  
  return {
    name: randomKey,
    path: selectedFile.path,
    contentType: selectedFile.contentType,
    size: selectedFile.size
  };
}

// Helper to get a random text file
function getRandomTextFile() {
  const textFiles = ['very-small-10KB.txt', 'small-100KB.txt', 'medium-1MB.txt'];
  const randomKey = textFiles[Math.floor(Math.random() * textFiles.length)];
  const selectedFile = TEST_FILES[randomKey];
  
  return {
    name: randomKey,
    path: selectedFile.path,
    contentType: selectedFile.contentType,
    size: selectedFile.size
  };
}

// Helper to get a random Word document
function getRandomWordFile() {
  const wordFiles = ['document-50KB.docx', 'document-100KB.docx'];
  const randomKey = wordFiles[Math.floor(Math.random() * wordFiles.length)];
  const selectedFile = TEST_FILES[randomKey];
  
  return {
    name: randomKey,
    path: selectedFile.path,
    contentType: selectedFile.contentType,
    size: selectedFile.size
  };
}

// Helper to get a random PowerPoint file
function getRandomPowerPointFile() {
  const pptFiles = ['presentation-50KB.pptx', 'presentation-100KB.pptx'];
  const randomKey = pptFiles[Math.floor(Math.random() * pptFiles.length)];
  const selectedFile = TEST_FILES[randomKey];
  
  return {
    name: randomKey,
    path: selectedFile.path,
    contentType: selectedFile.contentType,
    size: selectedFile.size
  };
}

// Helper to get a random Excel file
function getRandomExcelFile() {
  const excelFiles = ['spreadsheet-50KB.xlsx', 'spreadsheet-100KB.xlsx'];
  const randomKey = excelFiles[Math.floor(Math.random() * excelFiles.length)];
  const selectedFile = TEST_FILES[randomKey];
  
  return {
    name: randomKey,
    path: selectedFile.path,
    contentType: selectedFile.contentType,
    size: selectedFile.size
  };
}

// Helper to get a random office document (Word, PowerPoint, or Excel)
function getRandomOfficeFile() {
  const officeTypes = [getRandomWordFile, getRandomPowerPointFile, getRandomExcelFile];
  const randomFunction = officeTypes[Math.floor(Math.random() * officeTypes.length)];
  return randomFunction();
}

// Helper to get a random PDF file (using text files since the server will convert them)
function getRandomPdfFile() {
  return getRandomTextFile(); // Text files get converted to PDF by the server
}

// Helper to get a random non-PDF file (office documents)
function getRandomNonPdfFile() {
  return getRandomOfficeFile(); // Word, PowerPoint, or Excel files
}

// Simulate a basic concurrent upload test - 5 users uploading small files (100KB)
export function basicConcurrentUpload() {
  // Use specifically small 100KB files for baseline testing
  const file = {
    name: 'small-100KB.txt',
    path: TEST_FILES['small-100KB.txt'].path,
    contentType: TEST_FILES['small-100KB.txt'].contentType,
    size: TEST_FILES['small-100KB.txt'].size
  };
  
  // Minimal delay for concurrent testing
  const delay = randomIntBetween(1000, 2000);
  uploadFile(file, delay);
}

// Simulate gradual scaling with pause between batches
export function gradualUserScaling() {
  // Get a random file
  const file = getRandomFile();
  
  // Simulate some thinking/waiting time - longer delays (8-12 seconds)
  const delay = randomIntBetween(8000, 12000);
  uploadFile(file, delay);
}

// Simulate a realistic office usage pattern - 10 users with varied behavior
export function realisticOfficePattern() {
  // Determine user behavior based on VU number
  const vuNumber = __VU;
  let file;
  
  if (vuNumber <= 2) {
    // 2 users uploading large files (5-10MB) - use medium-1MB.txt as proxy since server has 10MB limit
    file = {
      name: 'medium-1MB.txt',
      path: TEST_FILES['medium-1MB.txt'].path,
      contentType: TEST_FILES['medium-1MB.txt'].contentType,
      size: TEST_FILES['medium-1MB.txt'].size
    };
  } else if (vuNumber <= 7) {
    // 5 users uploading medium files (1-2MB) - use medium-1MB.txt and small-100KB.txt
    const mediumFiles = ['medium-1MB.txt', 'small-100KB.txt'];
    const randomMediumFile = mediumFiles[Math.floor(Math.random() * mediumFiles.length)];
    file = {
      name: randomMediumFile,
      path: TEST_FILES[randomMediumFile].path,
      contentType: TEST_FILES[randomMediumFile].contentType,
      size: TEST_FILES[randomMediumFile].size
    };
  } else {
    // 3 users uploading small files (100-500KB)
    const smallFiles = ['small-100KB.txt', 'very-small-10KB.txt'];
    const randomSmallFile = smallFiles[Math.floor(Math.random() * smallFiles.length)];
    file = {
      name: randomSmallFile,
      path: TEST_FILES[randomSmallFile].path,
      contentType: TEST_FILES[randomSmallFile].contentType,
      size: TEST_FILES[randomSmallFile].size
    };
  }
  
  // Random 1-3 second delays between actions as specified
  const delay = randomIntBetween(1000, 3000);
  uploadFile(file, delay);
}

// Simulate a burst upload activity - 10 users simultaneously uploading 1MB files
export function burstUploadActivity() {
  // Use 1MB files for burst testing
  const file = {
    name: 'medium-1MB.txt',
    path: TEST_FILES['medium-1MB.txt'].path,
    contentType: TEST_FILES['medium-1MB.txt'].contentType,
    size: TEST_FILES['medium-1MB.txt'].size
  };
  
  // Minimal delay to simulate simultaneous burst
  const delay = randomIntBetween(500, 1500);
  uploadFile(file, delay);
}

// Test large file uploads
export function largeFileHandling() {
  // Use small file instead of large one due to server limitations
  const file = {
    name: 'small-100KB.txt',
    path: TEST_FILES['small-100KB.txt'].path,
    contentType: TEST_FILES['small-100KB.txt'].contentType,
    size: TEST_FILES['small-100KB.txt'].size
  };
  
  // Longer delay for large file uploads (8-12 seconds)
  const delay = randomIntBetween(8000, 12000);
  uploadFile(file, delay);
}

// Mixed operations test - 5 uploading, 2 downloading, 3 browsing
export function mixedOperations() {
  // Determine operation based on VU number
  const vuNumber = __VU;
  
  if (vuNumber <= 5) {
    // 5 users uploading files (mix of sizes)
    const file = getRandomFile();
    const delay = randomIntBetween(2000, 5000);
    uploadFile(file, delay);
  } else if (vuNumber <= 7) {
    // 2 users downloading (simulated by API health check)
    apiHealthCheck();
    const browseTime = randomIntBetween(3000, 8000);
    sleep(browseTime / 1000);
  } else {
    // 3 users browsing/searching (simulated by sleep)
    const browseTime = randomIntBetween(5000, 15000);
    sleep(browseTime / 1000);
  }
}

// Network variance test - different connection qualities
export function networkVariance() {
  // Determine network condition based on VU number
  const vuNumber = __VU;
  const file = {
    name: 'small-100KB.txt',
    path: TEST_FILES['small-100KB.txt'].path,
    contentType: TEST_FILES['small-100KB.txt'].contentType,
    size: TEST_FILES['small-100KB.txt'].size
  };
  
  let delay;
  if (vuNumber <= 3) {
    // 3 users with excellent connection (100Mbps) - minimal delay
    delay = randomIntBetween(500, 1500);
  } else if (vuNumber <= 7) {
    // 4 users with moderate connection (10Mbps) - moderate delay
    delay = randomIntBetween(2000, 5000);
  } else {
    // 3 users with poor connection (2Mbps with packet loss) - high delay
    delay = randomIntBetween(8000, 15000);
  }
  
  uploadFile(file, delay);
}

// Maximum capacity test - 10 users continuously uploading for sustained load
export function maximumCapacity() {
  // Use 1MB files for sustained capacity testing
  const file = {
    name: 'medium-1MB.txt',
    path: TEST_FILES['medium-1MB.txt'].path,
    contentType: TEST_FILES['medium-1MB.txt'].contentType,
    size: TEST_FILES['medium-1MB.txt'].size
  };
  
  // Minimal delay to maximize load
  const delay = randomIntBetween(1000, 2000);
  uploadFile(file, delay);
}

// Test with variable network conditions
export function networkVariance() {
  // Get a random file
  const file = getRandomFile();
  
  // Very variable delay to simulate different network conditions
  const delay = randomIntBetween(8000, 20000);
  uploadFile(file, delay);
}

// Test with mixed file types and longer delays
export function mixedFileTypesWithLongerDelays() {
  // 50/50 chance of PDF or non-PDF
  const file = Math.random() < 0.5 ? getRandomPdfFile() : getRandomNonPdfFile();
  
  // Longer delay (8-12 seconds)
  const delay = randomIntBetween(8000, 12000);
  uploadFile(file, delay);
}

// Test specifically for office document uploads (Word, PowerPoint, Excel)
export function officeDocumentTest() {
  // Choose randomly between Word, PowerPoint, and Excel files
  const fileType = Math.random();
  let file;
  
  if (fileType < 0.33) {
    file = getRandomWordFile();
  } else if (fileType < 0.66) {
    file = getRandomPowerPointFile();
  } else {
    file = getRandomExcelFile();
  }
  
  // Standard delay for office document uploads
  const delay = randomIntBetween(6000, 10000);
  uploadFile(file, delay);
}

// Test all document types with equal probability
export function allDocumentTypesTest() {
  // Equal chance for text files, Word, PowerPoint, and Excel
  const fileType = Math.random();
  let file;
  
  if (fileType < 0.25) {
    file = getRandomTextFile();
  } else if (fileType < 0.5) {
    file = getRandomWordFile();
  } else if (fileType < 0.75) {
    file = getRandomPowerPointFile();
  } else {
    file = getRandomExcelFile();
  }
  
  // Variable delay based on file type
  const delay = randomIntBetween(5000, 12000);
  uploadFile(file, delay);
}

// Test uploading many documents to see if UI/APIs stall
export function documentUploadStressTest() {
  // Alternate between PDF and non-PDF uploads
  const iteration = __ITER;
  const file = iteration % 2 === 0 ? getRandomPdfFile() : getRandomNonPdfFile();
  
  // Use shorter delays to simulate batch uploads
  const delay = randomIntBetween(4000, 8000);
  uploadFile(file, delay);
}

// API health check function 
export function apiHealthCheck() {
  try {
    log(`Running API health check, VU: ${__VU}`);
    const response = http.get(`${API_BASE_URL}/files/`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getUserTokenByVU()}`,
      },
      tags: { name: 'API Health Check' },
    });
    
    check(response, {
      'API health check successful': (r) => r.status === 200,
      'API response time acceptable': (r) => r.timings.duration < 3000,
    });
    
    log(`API health check complete: Status ${response.status}, duration ${response.timings.duration}ms`);
    sleep(1);
  } catch (error) {
    log(`ERROR in apiHealthCheck: ${error.message}`);
    throw error;
  }
}

// Function to get debugging logs
export function getDebugLogs() {
  return debugLog.join("\n");
}

// Main test configuration - you'll use this to run specific scenarios
export const options = {
  // Default configuration for all scenarios
  thresholds: {
    'http_req_duration': ['p(95)<10000'], // 95% of requests should complete within 10s
    'http_req_failed': ['rate<0.05'],     // Less than 5% of requests should fail
    'success_rate': ['rate>0.95'],        // Success rate should be above 95%
  },
  // Scenario-specific configurations follow
};
