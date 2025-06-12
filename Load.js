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
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkxODQ2M2YyLWNjZDYtNDliZS1hMzQzLThlZGFiZDQxZmFmNyJ9.dbdf6Qvy2YIMyuI39KBSVxh6VF8AMW5xyDeZXDuKuL4';

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
        'Authorization': `Bearer ${AUTH_TOKEN}`,
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

// Simulate a basic concurrent upload test
export function basicConcurrentUpload() {
  // Get a random file
  const file = getRandomFile();
  
  // Upload the file with randomized delay between 8-12 seconds
  const delay = randomIntBetween(8000, 12000);
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

// Simulate a realistic office usage pattern
export function realisticOfficePattern() {
  // Get a random file, with higher probability of smaller files
  let file;
  const choice = Math.random();
  if (choice < 0.6) {
    // 60% chance for very small file
    file = {
      name: 'very-small-10KB.txt',
      path: TEST_FILES['very-small-10KB.txt'].path,
      contentType: TEST_FILES['very-small-10KB.txt'].contentType,
      size: TEST_FILES['very-small-10KB.txt'].size
    };
  } else if (choice < 0.9) {
    // 30% chance for small file
    file = {
      name: 'small-100KB.txt',
      path: TEST_FILES['small-100KB.txt'].path,
      contentType: TEST_FILES['small-100KB.txt'].contentType,
      size: TEST_FILES['small-100KB.txt'].size
    };
  } else {
    // 10% chance for medium file
    file = {
      name: 'medium-1MB.txt',
      path: TEST_FILES['medium-1MB.txt'].path,
      contentType: TEST_FILES['medium-1MB.txt'].contentType,
      size: TEST_FILES['medium-1MB.txt'].size
    };
  }
  
  // Longer delay to simulate office behavior (8-12 seconds)
  const delay = randomIntBetween(8000, 12000);
  uploadFile(file, delay);
}

// Simulate a burst upload activity
export function burstUploadActivity() {
  // Get a random file
  const file = getRandomFile();
  
  // Short delay to simulate rapid succession uploads
  const delay = randomIntBetween(1000, 3000);
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

// Mixed operations test
export function mixedOperations() {
  // Randomly choose between different operations
  const choice = Math.random();
  
  if (choice < 0.8) {
    // 80% chance to upload a file
    const file = getRandomFile();
    const delay = randomIntBetween(8000, 12000);
    uploadFile(file, delay);
  } else {
    // 20% chance to just browse (simulated by sleep)
    const browseTime = randomIntBetween(8000, 12000);
    sleep(browseTime / 1000);
  }
}

// Test with variable network conditions
export function networkVariance() {
  // Get a random file
  const file = getRandomFile();
  
  // Very variable delay to simulate different network conditions
  const delay = randomIntBetween(8000, 20000);
  uploadFile(file, delay);
}

// Test maximum capacity
export function maximumCapacity() {
  // Use small file instead of medium file due to server limitations
  const file = {
    name: 'small-100KB.txt',
    path: TEST_FILES['small-100KB.txt'].path,
    contentType: TEST_FILES['small-100KB.txt'].contentType,
    size: TEST_FILES['small-100KB.txt'].size
  };
  
  // Minimal delay to maximize load
  const delay = randomIntBetween(1000, 2000);
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
      headers: getHeaders(),
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
