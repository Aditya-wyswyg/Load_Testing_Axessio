import { burstUploadActivity } from './Load.js';

export default function() {
  burstUploadActivity();
}

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Quick ramp-up to 10 users
    { duration: '20s', target: 10 },  // Stay at 10 users for 20s
    { duration: '10s', target: 0 },   // Quick ramp-down
  ],
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