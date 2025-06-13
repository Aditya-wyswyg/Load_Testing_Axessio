import { realisticOfficePattern } from './Load.js';

export default function() {
  realisticOfficePattern();
}

export const options = {
  vus: 10,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95% of requests must complete within 10s
    http_req_failed: ['rate<0.10'],     // Less than 10% of requests should fail
    'success_rate': ['rate>0.90'],      // At least 90% of requests should be successful
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/RealisticOffice',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 