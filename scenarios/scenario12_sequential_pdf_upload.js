import { pdfOnlyUpload, getUserTokenByVU, getRandomUserToken } from "../scripts/Load.js";
import { sleep } from 'k6';

export default function() {
  // Upload one PDF file at a time
  pdfOnlyUpload();
  
  // Small delay between uploads to avoid overwhelming the server
  // but keep it minimal to test continuous uploads
  sleep(1); // 1 second delay between uploads
}

export const options = {
  vus: 1,                    // Single virtual user to avoid concurrency
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests must complete within 3s
    http_req_failed: ['rate<0.01'],     // Less than 1% of requests should fail (very strict)
    'success_rate': ['rate>0.99'],      // At least 99% of requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/SequentialPDF',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
  
  // Additional configuration for monitoring
  setupTimeout: '60s',
  teardownTimeout: '60s',
  
  // Tags for better analytics
  tags: {
    testType: 'sequential_pdf_upload',
    environment: 'load_testing'
  }
}; 