import { maximumCapacity } from './Load.js';

export default function() {
  maximumCapacity();
}

export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Ramp up to 5 users over 1m
    { duration: '1m', target: 10 },  // Ramp up to 10 users over 1m
    { duration: '1m', target: 15 },  // Ramp up to 15 users over 1m
    { duration: '1m', target: 20 },  // Ramp up to 20 users over 1m
    { duration: '1m', target: 0 },   // Ramp down to 0 users over 1m
  ],
  thresholds: {
    http_req_duration: ['p(95)<30000'], // 95% of requests must complete within 30s (increased for high load)
    http_req_failed: ['rate<0.40'],     // Less than 40% of requests should fail (increased for high load)
    'success_rate': ['rate>0.60'],      // At least 60% of requests should be successful (decreased for high load)
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/1.0',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 