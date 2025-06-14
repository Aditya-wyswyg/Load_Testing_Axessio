import { documentUploadStressTest, uploadFileToOpenAI, getUserTokenByVU, getRandomUserToken, smallFileTest, mediumFileTest, largeFileTest, textFileTest, officeDocumentTest, allDocumentTypesTest } from "../scripts/Load.js";

export default function() {
  documentUploadStressTest();
}

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users over 30s
    { duration: '1m', target: 5 },    // Stay at 5 users for 1m
    { duration: '30s', target: 10 },  // Ramp up to 10 users over 30s
    { duration: '1m', target: 10 },   // Stay at 10 users for 1m
    { duration: '30s', target: 0 },   // Ramp down to 0 users over 30s
  ],
  thresholds: {
    http_req_duration: ['p(95)<20000'], // 95% of requests must complete within 20s (PDF conversion takes time)
    http_req_failed: ['rate<0.30'],     // Less than 30% of requests should fail (some PDF conversions may fail)
    'success_rate': ['rate>0.70'],      // At least 70% of requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/1.0',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 