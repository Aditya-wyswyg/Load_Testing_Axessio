#!/usr/bin/env python3
"""
Load Testing Analytics Dashboard
Analyzes k6 test logs and generates visual insights
"""

import os
import re
import json
import argparse
from datetime import datetime
from collections import defaultdict, Counter

class LoadTestAnalyzer:
    def __init__(self, log_file_path=None, logs_directory="../logs"):
        self.log_file_path = log_file_path
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
        
        # Parse test summary metrics
        metrics_section = re.search(r'█ TOTAL RESULTS.*?█ EXECUTION', content, re.DOTALL)
        if metrics_section:
            self._parse_metrics(metrics_section.group(0))
            
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
        
    def _parse_metrics(self, metrics_text):
        """Parse k6 metrics from the results section"""
        patterns = {
            'avg_duration': r'http_req_duration.*?avg=(\d+\.?\d*)([ms]+)',
            'p95_duration': r'http_req_duration.*?p\(95\)=(\d+\.?\d*)([ms]+)',
            'failure_rate': r'http_req_failed.*?(\d+\.?\d*)%',
            'success_rate': r'success_rate.*?(\d+\.?\d*)%',
            'total_requests': r'http_reqs.*?(\d+)',
            'throughput': r'http_reqs.*?(\d+\.?\d*)/s'
        }
        
        for metric, pattern in patterns.items():
            match = re.search(pattern, metrics_text)
            if match:
                value = float(match.group(1))
                if metric.endswith('_duration') and len(match.groups()) > 1 and 's' in match.group(2):
                    value *= 1000
                self.data['metrics'][metric] = value
                
    def analyze_all_logs(self):
        """Analyze all log files in the logs directory"""
        import pathlib
        log_files = list(pathlib.Path(self.logs_directory).glob("*.log"))
        
        if not log_files:
            print(f"❌ No log files found in {self.logs_directory}")
            return
            
        print(f"📁 Found {len(log_files)} log files")
        
        for log_file in sorted(log_files):
            try:
                self.parse_log_file(log_file)
            except Exception as e:
                print(f"⚠️  Error parsing {log_file}: {e}")
                
    def generate_analytics(self):
        """Generate visual analytics"""
        try:
            import matplotlib.pyplot as plt
            import numpy as np
        except ImportError:
            print("📦 Installing required packages...")
            import subprocess
            subprocess.check_call(['pip', 'install', 'matplotlib', 'numpy', 'pandas', 'seaborn'])
            import matplotlib.pyplot as plt
            import numpy as np
            
        if not self.data['uploads'] and not self.data['errors']:
            print("❌ No data to analyze")
            return
            
        # Create figure with subplots
        fig = plt.figure(figsize=(16, 12))
        fig.suptitle('📊 Load Testing Analytics Dashboard', fontsize=16, fontweight='bold')
        
        # 1. Success vs Failure Rate (Pie Chart)
        ax1 = plt.subplot(2, 3, 1)
        success_failure = [self.data['success_count'], self.data['failure_count']]
        labels = ['Success', 'Failure']
        colors = ['#2ecc71', '#e74c3c']
        
        if sum(success_failure) > 0:
            plt.pie(success_failure, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90)
            plt.title('📈 Success vs Failure Rate')
        
        # 2. File Types Distribution (Bar Chart)
        ax2 = plt.subplot(2, 3, 2)
        if self.data['file_types']:
            file_types = list(self.data['file_types'].keys())
            counts = list(self.data['file_types'].values())
            plt.bar(file_types, counts, color='skyblue')
            plt.title('📁 File Types Distribution')
            plt.xlabel('File Type')
            plt.ylabel('Count')
            plt.xticks(rotation=45)
            
        # 3. Response Time Distribution (Histogram)
        ax3 = plt.subplot(2, 3, 3)
        if self.data['response_times']:
            plt.hist(self.data['response_times'], bins=15, color='lightcoral', alpha=0.7, edgecolor='black')
            plt.title('⏱️ Response Time Distribution')
            plt.xlabel('Response Time (ms)')
            plt.ylabel('Frequency')
            mean_time = np.mean(self.data['response_times'])
            plt.axvline(mean_time, color='red', linestyle='--', label=f'Mean: {mean_time:.0f}ms')
            plt.legend()
            
        # 4. Scenarios Overview
        ax4 = plt.subplot(2, 3, 4)
        if self.data['scenarios']:
            scenario_counts = Counter(self.data['scenarios'])
            scenarios = list(scenario_counts.keys())
            counts = list(scenario_counts.values())
            plt.bar(scenarios, counts, color='lightgreen')
            plt.title('🎯 Scenarios Tested')
            plt.xlabel('Scenario')
            plt.ylabel('Test Runs')
            plt.xticks(rotation=45)
            
        # 5. Performance Summary (Text)
        ax5 = plt.subplot(2, 3, 5)
        ax5.axis('off')
        
        summary_text = "📊 PERFORMANCE SUMMARY\n\n"
        summary_text += f"✅ Successful Uploads: {self.data['success_count']}\n"
        summary_text += f"❌ Failed Uploads: {self.data['failure_count']}\n"
        
        if self.data['response_times']:
            summary_text += f"📈 Avg Response Time: {np.mean(self.data['response_times']):.1f} ms\n"
            summary_text += f"📊 95th Percentile: {np.percentile(self.data['response_times'], 95):.1f} ms\n"
            
        if self.data['metrics']:
            if 'failure_rate' in self.data['metrics']:
                summary_text += f"📉 Failure Rate: {self.data['metrics']['failure_rate']:.1f}%\n"
            if 'throughput' in self.data['metrics']:
                summary_text += f"🚀 Throughput: {self.data['metrics']['throughput']:.2f} req/s\n"
                
        # Add recommendations
        total_tests = self.data['success_count'] + self.data['failure_count']
        if total_tests > 0:
            success_rate = (self.data['success_count'] / total_tests) * 100
            summary_text += f"\n💡 RECOMMENDATIONS:\n"
            
            if success_rate < 70:
                summary_text += "🚨 High failure rate - investigate server capacity\n"
            elif success_rate < 90:
                summary_text += "⚠️ Some optimization needed\n"
            else:
                summary_text += "✅ Good performance overall\n"
                
        plt.text(0.1, 0.9, summary_text, fontsize=10, verticalalignment='top',
                bbox=dict(boxstyle="round,pad=0.5", facecolor="lightblue", alpha=0.8))
        plt.title('📋 Summary & Recommendations')
        
        # 6. Response Time Trend
        ax6 = plt.subplot(2, 3, 6)
        if len(self.data['uploads']) > 1:
            durations = [upload['duration'] for upload in self.data['uploads']]
            indices = range(len(durations))
            
            plt.plot(indices, durations, marker='o', linewidth=2, markersize=4, color='purple')
            plt.title('📈 Response Time Trend')
            plt.xlabel('Upload Sequence')
            plt.ylabel('Duration (ms)')
            
            # Add trend line
            if len(durations) > 2:
                z = np.polyfit(indices, durations, 1)
                p = np.poly1d(z)
                plt.plot(indices, p(indices), "r--", alpha=0.7, label='Trend')
                plt.legend()
        
        plt.tight_layout()
        plt.subplots_adjust(top=0.92)
        
        # Save the plot
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"../load_test_analytics_{timestamp}.png"
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        print(f"📊 Analytics dashboard saved as: {output_file}")
        
        # Show the plot
        plt.show()
        
    def print_summary(self):
        """Print a text-based summary"""
        print("\n" + "="*60)
        print("📊 LOAD TESTING ANALYTICS SUMMARY")
        print("="*60)
        
        total_tests = self.data['success_count'] + self.data['failure_count']
        if total_tests > 0:
            success_rate = (self.data['success_count'] / total_tests) * 100
            print(f"📈 Total Tests: {total_tests}")
            print(f"✅ Successful: {self.data['success_count']} ({success_rate:.1f}%)")
            print(f"❌ Failed: {self.data['failure_count']} ({100-success_rate:.1f}%)")
        
        if self.data['response_times']:
            import statistics
            times = self.data['response_times']
            print(f"\n⏱️  RESPONSE TIMES:")
            print(f"   Average: {statistics.mean(times):.1f} ms")
            print(f"   Median: {statistics.median(times):.1f} ms")
            print(f"   Min: {min(times)} ms")
            print(f"   Max: {max(times)} ms")
            
        if self.data['file_types']:
            print(f"\n📁 FILE TYPES:")
            for file_type, count in self.data['file_types'].items():
                print(f"   {file_type}: {count}")
                
        if self.data['errors']:
            print(f"\n❌ ERROR ANALYSIS:")
            error_codes = Counter([error['status_code'] for error in self.data['errors']])
            for code, count in error_codes.items():
                print(f"   HTTP {code}: {count} occurrences")
                
        print("\n" + "="*60)
        
    def export_data(self):
        """Export analysis data to JSON"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"../load_test_data_{timestamp}.json"
        
        with open(output_file, 'w') as f:
            json.dump(self.data, f, indent=2, default=str)
            
        print(f"📁 Raw data exported to: {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Load Testing Analytics Dashboard')
    parser.add_argument('-f', '--file', help='Specific log file to analyze')
    parser.add_argument('-d', '--directory', default='../logs', help='Directory containing log files (default: ../logs)')
    parser.add_argument('--export', action='store_true', help='Export raw data to JSON')
    parser.add_argument('--no-gui', action='store_true', help='Skip GUI and show text summary only')
    
    args = parser.parse_args()
    
    print("🚀 Starting Load Test Analysis...")
    
    analyzer = LoadTestAnalyzer(args.file, args.directory)
    
    if args.file:
        analyzer.parse_log_file(args.file)
    else:
        analyzer.analyze_all_logs()
        
    # Always show text summary
    analyzer.print_summary()
    
    # Show GUI unless disabled
    if not args.no_gui:
        analyzer.generate_analytics()
    
    if args.export:
        analyzer.export_data()
        
    print("✅ Analysis complete!")

if __name__ == "__main__":
    main() 