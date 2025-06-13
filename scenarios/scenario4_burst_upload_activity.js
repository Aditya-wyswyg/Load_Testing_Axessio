import { burstUploadActivity, uploadFileToOpenAI, getUserTokenByVU, getRandomUserToken, smallFileTest, mediumFileTest, largeFileTest, textFileTest, officeDocumentTest, allDocumentTypesTest } from "../scripts/Load.js";

export default function() {
  burstUploadActivity();
}

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<15000'], // May show temporary slowdown during burst
    http_req_failed: ['rate<0.05'],     // System should handle burst without failures
    'success_rate': ['rate>0.95'],      // At least 95% of requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/BurstActivity',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 