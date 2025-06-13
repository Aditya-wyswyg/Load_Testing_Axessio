import { mixedModelChatTest } from "../scripts/Load.js";

export default function() {
  mixedModelChatTest();
}

export const options = {
  vus: 10,
  duration: '4m',
  thresholds: {
    chat_response_time: ['p(95)<7000'],  // 95% of chat requests must complete within 7s
    http_req_failed: ['rate<0.12'],      // Less than 12% of requests should fail (different models may have varying reliability)
    chat_success_rate: ['rate>0.88'],    // At least 88% of chat requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/MixedModelChat',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 