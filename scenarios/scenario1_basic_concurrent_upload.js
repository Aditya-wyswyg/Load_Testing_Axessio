import { basicConcurrentUpload, uploadFileToOpenAI, getUserTokenByVU, getRandomUserToken, smallFileTest, mediumFileTest, largeFileTest, textFileTest, officeDocumentTest, allDocumentTypesTest } from "../scripts/Load.js";

export default function() {
  basicConcurrentUpload();
}

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests must complete within 3s for small files
    http_req_failed: ['rate<0.05'],     // Less than 5% of requests should fail
    'success_rate': ['rate>0.95'],      // At least 95% of requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/BasicConcurrent',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 