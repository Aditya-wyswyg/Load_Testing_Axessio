import { networkVariance, uploadFileToOpenAI, getUserTokenByVU, getRandomUserToken, smallFileTest, mediumFileTest, largeFileTest, textFileTest, officeDocumentTest, allDocumentTypesTest } from "../scripts/Load.js";

export default function() {
  networkVariance();
}

export const options = {
  vus: 10,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<20000'], // All uploads should eventually complete successfully
    http_req_failed: ['rate<0.05'],     // Less than 5% of requests should fail
    'success_rate': ['rate>0.95'],      // At least 95% of requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/NetworkVariance',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 