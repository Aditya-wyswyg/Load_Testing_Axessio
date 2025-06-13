#!/usr/bin/env python3
"""
HTML Load Testing Analytics Dashboard
Generates an interactive HTML report with charts
"""

import os
import re
import json
from datetime import datetime
from collections import defaultdict, Counter
from pathlib import Path

class HTMLAnalyticsDashboard:
    def __init__(self, logs_directory="../logs"):
        self.logs_directory = logs_directory
        self.data = {
            'uploads': [],
            'errors': [],
            'metrics': {},
            'scenarios': [],
            'file_types': defaultdict(int),
            'response_times': [],
            'success_count': 0,
            'failure_count': 0
        }
        
    def parse_log_file(self, file_path):
        """Parse a single k6 log file"""
        print(f"📊 Analyzing log file: {file_path}")
        
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Extract scenario info from filename
        scenario_match = re.search(r'scenario(\d+)', os.path.basename(file_path))
        scenario = f"Scenario {scenario_match.group(1)}" if scenario_match else "Unknown"
        
        # Parse upload attempts
        upload_pattern = r'\[DEBUG.*?\] Starting upload of (\S+) \((\d+) bytes\)'
        uploads = re.findall(upload_pattern, content)
        
        # Parse successful uploads
        success_pattern = r'\[DEBUG.*?\] Upload successful for (\S+), took (\d+)ms, file ID: (\S+)'
        successes = re.findall(success_pattern, content)
        
        # Parse failed uploads
        failure_pattern = r'\[DEBUG.*?\] Upload FAILED for (\S+): Status (\d+)'
        failures = re.findall(failure_pattern, content)
        
        # Store parsed data
        for filename, filesize in uploads:
            self.data['file_types'][filename.split('.')[-1]] += 1
            
        for filename, duration, file_id in successes:
            self.data['uploads'].append({
                'filename': filename,
                'duration': int(duration),
                'status': 'success',
                'scenario': scenario
            })
            self.data['response_times'].append(int(duration))
            self.data['success_count'] += 1
            
        for filename, status_code in failures:
            self.data['errors'].append({
                'filename': filename,
                'status_code': int(status_code),
                'scenario': scenario
            })
            self.data['failure_count'] += 1
            
        self.data['scenarios'].append(scenario)
        
    def analyze_all_logs(self):
        """Analyze all log files in the logs directory"""
        log_files = list(Path(self.logs_directory).glob("*.log"))
        
        if not log_files:
            print(f"❌ No log files found in {self.logs_directory}")
            return
            
        print(f"📁 Found {len(log_files)} log files")
        
        for log_file in sorted(log_files):
            try:
                self.parse_log_file(log_file)
            except Exception as e:
                print(f"⚠️  Error parsing {log_file}: {e}")
                
    def generate_html_dashboard(self):
        """Generate HTML dashboard"""
        if not self.data['uploads'] and not self.data['errors']:
            print("❌ No data to analyze")
            return
            
        total_tests = self.data['success_count'] + self.data['failure_count']
        success_rate = (self.data['success_count'] / total_tests) * 100 if total_tests > 0 else 0
        
        # Calculate statistics
        avg_time = sum(self.data['response_times']) / len(self.data['response_times']) if self.data['response_times'] else 0
        
        # Prepare data for charts
        file_types_labels = list(self.data['file_types'].keys())
        file_types_values = list(self.data['file_types'].values())
        response_times = self.data['response_times'][:50]  # Limit to 50 points for readability
        
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Load Testing Analytics Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(45deg, #2c3e50, #34495e);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }}
        
        .stat-card {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s ease;
        }}
        
        .stat-card:hover {{
            transform: translateY(-5px);
        }}
        
        .stat-value {{
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }}
        
        .success {{ color: #27ae60; }}
        .failure {{ color: #e74c3c; }}
        .info {{ color: #3498db; }}
        .warning {{ color: #f39c12; }}
        
        .charts-section {{
            padding: 30px;
        }}
        
        .chart-container {{
            margin: 30px 0;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        
        .chart-title {{
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
        }}
        
        .recommendations {{
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }}
        
        .recommendations h3 {{
            color: #856404;
            margin-top: 0;
        }}
        
        .footer {{
            background: #2c3e50;
            color: white;
            text-align: center;
            padding: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Load Testing Analytics Dashboard</h1>
            <p>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value success">{self.data['success_count']}</div>
                <h3>✅ Successful Uploads</h3>
                <p>{success_rate:.1f}% Success Rate</p>
            </div>
            
            <div class="stat-card">
                <div class="stat-value failure">{self.data['failure_count']}</div>
                <h3>❌ Failed Uploads</h3>
                <p>{100-success_rate:.1f}% Failure Rate</p>
            </div>
            
            <div class="stat-card">
                <div class="stat-value info">{avg_time:.0f}ms</div>
                <h3>⏱️ Average Response Time</h3>
                <p>Overall Performance</p>
            </div>
            
            <div class="stat-card">
                <div class="stat-value warning">{total_tests}</div>
                <h3>📊 Total Tests</h3>
                <p>Requests Processed</p>
            </div>
        </div>
        
        <div class="charts-section">
            <div class="chart-container">
                <h3 class="chart-title">📈 Success vs Failure Rate</h3>
                <canvas id="successChart" width="400" height="200"></canvas>
            </div>
            
            <div class="chart-container">
                <h3 class="chart-title">📁 File Types Distribution</h3>
                <canvas id="fileTypesChart" width="400" height="200"></canvas>
            </div>
            
            <div class="chart-container">
                <h3 class="chart-title">⏱️ Response Time Trend</h3>
                <canvas id="responseTimeChart" width="400" height="200"></canvas>
            </div>
            
            <div class="recommendations">
                <h3>💡 Performance Recommendations</h3>
                {self._generate_html_recommendations()}
            </div>
        </div>
        
        <div class="footer">
            <p>Load Testing Analytics Dashboard | Generated by k6 Log Analyzer</p>
        </div>
    </div>
    
    <script>
        // Success vs Failure Chart
        const successCtx = document.getElementById('successChart').getContext('2d');
        new Chart(successCtx, {{
            type: 'doughnut',
            data: {{
                labels: ['Success', 'Failure'],
                datasets: [{{
                    data: [{self.data['success_count']}, {self.data['failure_count']}],
                    backgroundColor: ['#27ae60', '#e74c3c'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }}]
            }},
            options: {{
                responsive: true,
                plugins: {{
                    legend: {{ position: 'bottom' }}
                }}
            }}
        }});
        
        // File Types Chart
        const fileTypesCtx = document.getElementById('fileTypesChart').getContext('2d');
        new Chart(fileTypesCtx, {{
            type: 'bar',
            data: {{
                labels: {json.dumps(file_types_labels)},
                datasets: [{{
                    label: 'Count',
                    data: {json.dumps(file_types_values)},
                    backgroundColor: 'rgba(52, 152, 219, 0.8)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }}]
            }},
            options: {{
                responsive: true,
                scales: {{ y: {{ beginAtZero: true }} }}
            }}
        }});
        
        // Response Time Trend
        const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
        new Chart(responseTimeCtx, {{
            type: 'line',
            data: {{
                labels: {json.dumps(list(range(len(response_times))))},
                datasets: [{{
                    label: 'Response Time (ms)',
                    data: {json.dumps(response_times)},
                    borderColor: 'rgba(155, 89, 182, 1)',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    borderWidth: 2,
                    fill: true
                }}]
            }},
            options: {{
                responsive: true,
                scales: {{
                    x: {{ title: {{ display: true, text: 'Upload Sequence' }} }},
                    y: {{ title: {{ display: true, text: 'Response Time (ms)' }}, beginAtZero: true }}
                }}
            }}
        }});
    </script>
</body>
</html>"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"../load_test_dashboard_{timestamp}.html"
        
        with open(output_file, 'w') as f:
            f.write(html_content)
            
        print(f"📊 HTML dashboard saved as: {output_file}")
        print(f"🌐 Open the file in your browser to view the interactive dashboard")
        
        return output_file
        
    def _generate_html_recommendations(self):
        """Generate HTML recommendations"""
        total_tests = self.data['success_count'] + self.data['failure_count']
        if total_tests == 0:
            return "<p>No data available for recommendations.</p>"
            
        success_rate = (self.data['success_count'] / total_tests) * 100
        avg_time = sum(self.data['response_times']) / len(self.data['response_times']) if self.data['response_times'] else 0
        
        recommendations = []
        
        if success_rate < 70:
            recommendations.append("🚨 <strong>High Failure Rate:</strong> Investigate server capacity and PDF conversion issues")
        elif success_rate < 90:
            recommendations.append("⚠️ <strong>Moderate Issues:</strong> Some optimization needed for better reliability")
        else:
            recommendations.append("✅ <strong>Good Success Rate:</strong> System performing well under current load")
            
        if avg_time > 10000:
            recommendations.append("🐌 <strong>Slow Response Times:</strong> Consider server optimization or load balancing")
        elif avg_time > 5000:
            recommendations.append("⏱️ <strong>Moderate Response Times:</strong> Some optimization opportunities exist")
        else:
            recommendations.append("⚡ <strong>Good Response Times:</strong> Performance within acceptable range")
            
        if self.data['errors']:
            error_codes = Counter([error['status_code'] for error in self.data['errors']])
            if 500 in error_codes:
                recommendations.append("🔧 <strong>Server Errors (500):</strong> Check PDF conversion process and server resources")
            if 400 in error_codes:
                recommendations.append("📝 <strong>Client Errors (400):</strong> Review file format validation and size limits")
                
        recommendations.extend([
            "📋 <strong>General Suggestions:</strong>",
            "• Monitor PDF conversion process under load",
            "• Consider implementing file upload queuing", 
            "• Review server resource allocation",
            "• Implement progressive upload for large files"
        ])
        
        return "<ul>" + "".join([f"<li>{rec}</li>" for rec in recommendations]) + "</ul>"

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='HTML Load Testing Analytics Dashboard')
    parser.add_argument('-d', '--directory', default='../logs', help='Directory containing log files (default: ../logs)')
    
    args = parser.parse_args()
    
    print("🚀 Starting HTML Dashboard Generation...")
    
    dashboard = HTMLAnalyticsDashboard(args.directory)
    dashboard.analyze_all_logs()
    dashboard.generate_html_dashboard()
    
    print("✅ HTML Dashboard complete!")

if __name__ == "__main__":
    main() 