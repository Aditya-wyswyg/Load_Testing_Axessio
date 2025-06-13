import { concurrentChatCompletion } from "../scripts/Load.js";

export default function() {
  concurrentChatCompletion();
}

export const options = {
  vus: 15,
  duration: '2m',
  thresholds: {
    chat_response_time: ['p(95)<6000'],  // 95% of chat requests must complete within 6s
    http_req_failed: ['rate<0.15'],      // Less than 15% of requests should fail (higher tolerance for high concurrency)
    chat_success_rate: ['rate>0.85'],    // At least 85% of chat requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/ConcurrentChatLoad',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 