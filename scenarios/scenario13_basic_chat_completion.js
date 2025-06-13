import { basicChatCompletion } from "../scripts/Load.js";

export default function() {
  basicChatCompletion();
}

export const options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    chat_response_time: ['p(95)<5000'],  // 95% of chat requests must complete within 5s
    http_req_failed: ['rate<0.05'],      // Less than 5% of requests should fail
    chat_success_rate: ['rate>0.95'],    // At least 95% of chat requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/BasicChatCompletion',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 