import { mixedFileTypesWithLongerDelays, uploadFileToOpenAI, getUserTokenByVU, getRandomUserToken, smallFileTest, mediumFileTest, largeFileTest, textFileTest, officeDocumentTest, allDocumentTypesTest } from "../scripts/Load.js";

export default function() {
  mixedFileTypesWithLongerDelays();
}

export const options = {
  vus: 5,
  duration: '2m',
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