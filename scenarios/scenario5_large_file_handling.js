import { largeFileHandling, uploadFileToOpenAI, getUserTokenByVU, getRandomUserToken, smallFileTest, mediumFileTest, largeFileTest, textFileTest, officeDocumentTest, allDocumentTypesTest } from "../scripts/Load.js";

export default function() {
  largeFileHandling();
}

export const options = {
  vus: 3,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<60000'], // Large files may take up to 60s
    http_req_failed: ['rate<0.10'],     // Files should upload without server crashes
    'success_rate': ['rate>0.90'],      // At least 90% of requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/LargeFiles',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 