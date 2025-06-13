import { pdfOnlyUpload, uploadFileToOpenAI, getUserTokenByVU, getRandomUserToken, smallFileTest, mediumFileTest, largeFileTest, textFileTest, officeDocumentTest, allDocumentTypesTest } from "../scripts/Load.js";

export default function() {
  pdfOnlyUpload();
}

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests must complete within 2s (faster since no conversion)
    http_req_failed: ['rate<0.02'],     // Less than 2% of requests should fail (stricter since no conversion complexity)
    'success_rate': ['rate>0.98'],      // At least 98% of requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/PDFOnly',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 