import { maximumCapacity } from './Load.js';

export default function() {
  maximumCapacity();
}

export const options = {
  vus: 10,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<30000'], // May show degradation under sustained load
    http_req_failed: ['rate<0.15'],     // Some degradation acceptable under maximum load
    'success_rate': ['rate>0.85'],      // At least 85% success rate under stress
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  userAgent: 'K6LoadTest/MaximumCapacity',
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  discardResponseBodies: false,
}; 