import { streamingChatCompletion } from "../scripts/Load.js";

export default function() {
  streamingChatCompletion();
}

export const options = {
  vus: 6,
  duration: '3m',
  thresholds: {
    chat_response_time: ['p(95)<10000'], // 95% of streaming requests must complete within 10s
    http_req_failed: ['rate<0.1'],       // Less than 10% of requests should fail
    chat_success_rate: ['rate>0.9'],     // At least 90% of chat requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/StreamingChatTest',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 