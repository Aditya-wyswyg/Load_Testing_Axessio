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
            'chat_completions': [],
            'errors': [],
            'metrics': {},
            'scenarios': [],
            'file_types': defaultdict(int),
            'chat_models': defaultdict(int),
            'response_times': [],
            'chat_response_times': [],
            'success_count': 0,
            'failure_count': 0,
            'chat_success_count': 0,
            'chat_failure_count': 0
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
        
        # Parse chat completion attempts
        chat_start_pattern = r'\[DEBUG.*?\] Starting chat completion with model: (\S+)'
        chat_attempts = re.findall(chat_start_pattern, content)
        
        # Parse successful chat completions
        chat_success_pattern = r'\[DEBUG.*?\] Chat completion successful for model (\S+), took (\d+)ms'
        chat_successes = re.findall(chat_success_pattern, content)
        
        # Parse failed chat completions
        chat_failure_pattern = r'\[DEBUG.*?\] Chat completion FAILED for model (\S+): Status (\d+)'
        chat_failures = re.findall(chat_failure_pattern, content)
        
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
            
        # Store chat completion data
        for model in chat_attempts:
            self.data['chat_models'][model] += 1
            
        for model, duration in chat_successes:
            self.data['chat_completions'].append({
                'model': model,
                'duration': int(duration),
                'status': 'success',
                'scenario': scenario
            })
            self.data['chat_response_times'].append(int(duration))
            self.data['chat_success_count'] += 1
            
        for model, status_code in chat_failures:
            self.data['errors'].append({
                'model': model,
                'status_code': int(status_code),
                'scenario': scenario,
                'type': 'chat_completion'
            })
            self.data['chat_failure_count'] += 1
            
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
                
    def analyze_latest_log(self):
        """Analyze only the latest log file in the logs directory"""
        import pathlib
        import os
        
        log_files = list(pathlib.Path(self.logs_directory).glob("*.log"))
        
        if not log_files:
            print(f"❌ No log files found in {self.logs_directory}")
            return
        
        # Get the latest log file by modification time
        latest_log = max(log_files, key=os.path.getmtime)
        print(f"📁 Analyzing latest log file: {latest_log.name}")
        
        try:
            self.parse_log_file(latest_log)
        except Exception as e:
            print(f"⚠️  Error parsing {latest_log}: {e}")
    
    def analyze_all_logs(self):
        """Analyze all log files in the logs directory"""
        import pathlib
        log_files = list(pathlib.Path(self.logs_directory).glob("*.log"))
        
        if not log_files:
            print(f"❌ No log files found in {self.logs_directory}")
            return
            
        print(f"📁 Found {len(log_files)} log files - analyzing all")
        
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
            
        if not self.data['uploads'] and not self.data['errors'] and not self.data['chat_completions']:
            print("❌ No data to analyze")
            return
            
        # Create figure with subplots - increased size for more charts
        fig = plt.figure(figsize=(20, 16))
        fig.suptitle('📊 Load Testing Analytics Dashboard', fontsize=16, fontweight='bold')
        
        # 1. File Upload Success vs Failure Rate (Pie Chart)
        ax1 = plt.subplot(3, 4, 1)
        success_failure = [self.data['success_count'], self.data['failure_count']]
        labels = ['Success', 'Failure']
        colors = ['#2ecc71', '#e74c3c']
        
        if sum(success_failure) > 0:
            plt.pie(success_failure, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90)
            plt.title('📁 File Upload Success Rate')
        
        # 2. Chat Completion Success vs Failure Rate (Pie Chart)
        ax2 = plt.subplot(3, 4, 2)
        chat_success_failure = [self.data['chat_success_count'], self.data['chat_failure_count']]
        
        if sum(chat_success_failure) > 0:
            plt.pie(chat_success_failure, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90)
            plt.title('💬 Chat Completion Success Rate')
        
        # 3. File Types Distribution (Bar Chart)
        ax3 = plt.subplot(3, 4, 3)
        if self.data['file_types']:
            file_types = list(self.data['file_types'].keys())
            counts = list(self.data['file_types'].values())
            plt.bar(file_types, counts, color='skyblue')
            plt.title('📁 File Types Distribution')
            plt.xlabel('File Type')
            plt.ylabel('Count')
            plt.xticks(rotation=45)
            
        # 4. Chat Models Distribution (Bar Chart)
        ax4 = plt.subplot(3, 4, 4)
        if self.data['chat_models']:
            models = list(self.data['chat_models'].keys())
            counts = list(self.data['chat_models'].values())
            plt.bar(models, counts, color='lightgreen')
            plt.title('🤖 Chat Models Used')
            plt.xlabel('Model')
            plt.ylabel('Count')
            plt.xticks(rotation=45)
            
        # 5. File Upload Response Time Distribution (Histogram)
        ax5 = plt.subplot(3, 4, 5)
        if self.data['response_times']:
            plt.hist(self.data['response_times'], bins=15, color='lightcoral', alpha=0.7, edgecolor='black')
            plt.title('⏱️ File Upload Response Times')
            plt.xlabel('Response Time (ms)')
            plt.ylabel('Frequency')
            mean_time = np.mean(self.data['response_times'])
            plt.axvline(mean_time, color='red', linestyle='--', label=f'Mean: {mean_time:.0f}ms')
            plt.legend()
            
        # 6. Chat Completion Response Time Distribution (Histogram)
        ax6 = plt.subplot(3, 4, 6)
        if self.data['chat_response_times']:
            plt.hist(self.data['chat_response_times'], bins=15, color='lightblue', alpha=0.7, edgecolor='black')
            plt.title('🗣️ Chat Response Times')
            plt.xlabel('Response Time (ms)')
            plt.ylabel('Frequency')
            mean_time = np.mean(self.data['chat_response_times'])
            plt.axvline(mean_time, color='blue', linestyle='--', label=f'Mean: {mean_time:.0f}ms')
            plt.legend()
            
        # 7. Scenarios Overview
        ax7 = plt.subplot(3, 4, 7)
        if self.data['scenarios']:
            scenario_counts = Counter(self.data['scenarios'])
            scenarios = list(scenario_counts.keys())
            counts = list(scenario_counts.values())
            plt.bar(scenarios, counts, color='orange')
            plt.title('🎯 Scenarios Tested')
            plt.xlabel('Scenario')
            plt.ylabel('Test Runs')
            plt.xticks(rotation=45)
            
        # 8. Performance Summary (Text)
        ax8 = plt.subplot(3, 4, 8)
        ax8.axis('off')
        
        summary_text = "📊 PERFORMANCE SUMMARY\n\n"
        
        # File Upload Summary
        summary_text += "📁 FILE UPLOADS:\n"
        summary_text += f"✅ Successful: {self.data['success_count']}\n"
        summary_text += f"❌ Failed: {self.data['failure_count']}\n"
        
        if self.data['response_times']:
            summary_text += f"📈 Avg Time: {np.mean(self.data['response_times']):.1f} ms\n"
            
        # Chat Completion Summary
        summary_text += "\n💬 CHAT COMPLETIONS:\n"
        summary_text += f"✅ Successful: {self.data['chat_success_count']}\n"
        summary_text += f"❌ Failed: {self.data['chat_failure_count']}\n"
        
        if self.data['chat_response_times']:
            summary_text += f"📈 Avg Time: {np.mean(self.data['chat_response_times']):.1f} ms\n"
            
        if self.data['metrics']:
            summary_text += "\n🔍 METRICS:\n"
            if 'failure_rate' in self.data['metrics']:
                summary_text += f"📉 Failure Rate: {self.data['metrics']['failure_rate']:.1f}%\n"
            if 'throughput' in self.data['metrics']:
                summary_text += f"🚀 Throughput: {self.data['metrics']['throughput']:.2f} req/s\n"
                
        # Add recommendations
        total_tests = self.data['success_count'] + self.data['failure_count'] + self.data['chat_success_count'] + self.data['chat_failure_count']
        if total_tests > 0:
            overall_success = self.data['success_count'] + self.data['chat_success_count']
            success_rate = (overall_success / total_tests) * 100
            summary_text += f"\n🎯 OVERALL SUCCESS: {success_rate:.1f}%\n"
            
            summary_text += "\n💡 RECOMMENDATIONS:\n"
            
            if success_rate < 70:
                summary_text += "🚨 High failure rate - investigate server capacity\n"
            elif success_rate < 90:
                summary_text += "⚠️ Some optimization needed\n"
            else:
                summary_text += "✅ Good performance overall\n"
                
        ax8.text(0.1, 0.9, summary_text, fontsize=8, verticalalignment='top',
                bbox=dict(boxstyle="round,pad=0.5", facecolor="lightblue", alpha=0.8))
        ax8.set_title('📋 Summary & Recommendations')
        
        plt.tight_layout()
        plt.subplots_adjust(top=0.92)
        
        # Create results directory if it doesn't exist
        results_dir = "../results"
        os.makedirs(results_dir, exist_ok=True)
        
        # Save the plot
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"{results_dir}/load_test_analytics_{timestamp}.png"
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        print(f"📊 Analytics dashboard saved as: {output_file}")
        
        # Show the plot
        plt.show()
        
    def print_summary(self):
        """Print a text-based summary"""
        print("\n" + "="*70)
        print("📊 LOAD TESTING ANALYTICS SUMMARY")
        print("="*70)
        
        # File Upload Summary
        file_total = self.data['success_count'] + self.data['failure_count']
        if file_total > 0:
            success_rate = (self.data['success_count'] / file_total) * 100
            print(f"📁 FILE UPLOAD TESTS:")
            print(f"   Total Tests: {file_total}")
            print(f"   ✅ Successful: {self.data['success_count']} ({success_rate:.1f}%)")
            print(f"   ❌ Failed: {self.data['failure_count']} ({100-success_rate:.1f}%)")
        
        # Chat Completion Summary
        chat_total = self.data['chat_success_count'] + self.data['chat_failure_count']
        if chat_total > 0:
            chat_success_rate = (self.data['chat_success_count'] / chat_total) * 100
            print(f"\n💬 CHAT COMPLETION TESTS:")
            print(f"   Total Tests: {chat_total}")
            print(f"   ✅ Successful: {self.data['chat_success_count']} ({chat_success_rate:.1f}%)")
            print(f"   ❌ Failed: {self.data['chat_failure_count']} ({100-chat_success_rate:.1f}%)")
        
        # Overall Summary
        total_tests = file_total + chat_total
        if total_tests > 0:
            overall_success = self.data['success_count'] + self.data['chat_success_count']
            overall_rate = (overall_success / total_tests) * 100
            print(f"\n🎯 OVERALL PERFORMANCE:")
            print(f"   Total Tests: {total_tests}")
            print(f"   ✅ Overall Success Rate: {overall_rate:.1f}%")
        
        if self.data['response_times']:
            import statistics
            times = self.data['response_times']
            print(f"\n📁 FILE UPLOAD RESPONSE TIMES:")
            print(f"   Average: {statistics.mean(times):.1f} ms")
            print(f"   Median: {statistics.median(times):.1f} ms")
            print(f"   Min: {min(times)} ms")
            print(f"   Max: {max(times)} ms")
            
        if self.data['chat_response_times']:
            import statistics
            times = self.data['chat_response_times']
            print(f"\n💬 CHAT COMPLETION RESPONSE TIMES:")
            print(f"   Average: {statistics.mean(times):.1f} ms")
            print(f"   Median: {statistics.median(times):.1f} ms")
            print(f"   Min: {min(times)} ms")
            print(f"   Max: {max(times)} ms")
            
        if self.data['file_types']:
            print(f"\n📁 FILE TYPES TESTED:")
            for file_type, count in self.data['file_types'].items():
                print(f"   {file_type}: {count}")
                
        if self.data['chat_models']:
            print(f"\n🤖 CHAT MODELS TESTED:")
            for model, count in self.data['chat_models'].items():
                print(f"   {model}: {count}")
                
        if self.data['errors']:
            print(f"\n❌ ERROR ANALYSIS:")
            error_codes = Counter([error['status_code'] for error in self.data['errors']])
            for code, count in error_codes.items():
                print(f"   HTTP {code}: {count} occurrences")
                
        print("\n" + "="*70)
        
    def export_data(self):
        """Export analysis data to JSON"""
        # Create results directory if it doesn't exist
        results_dir = "../results"
        os.makedirs(results_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"{results_dir}/load_test_data_{timestamp}.json"
        
        with open(output_file, 'w') as f:
            json.dump(self.data, f, indent=2, default=str)
            
        print(f"📁 Raw data exported to: {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Load Testing Analytics Dashboard')
    parser.add_argument('-f', '--file', help='Specific log file to analyze')
    parser.add_argument('-d', '--directory', default='../logs', help='Directory containing log files (default: ../logs)')
    parser.add_argument('--all', action='store_true', help='Analyze all log files instead of just the latest')
    parser.add_argument('--export', action='store_true', help='Export raw data to JSON')
    parser.add_argument('--no-gui', action='store_true', help='Skip GUI and show text summary only')
    
    args = parser.parse_args()
    
    analyzer = LoadTestAnalyzer(args.file, args.directory)
    
    if args.file:
        print("🚀 Starting Load Test Analysis for specific file...")
        analyzer.parse_log_file(args.file)
    elif args.all:
        print("🚀 Starting Load Test Analysis for ALL log files...")
        analyzer.analyze_all_logs()
    else:
        print("🚀 Starting Load Test Analysis for LATEST log file...")
        print("💡 Use --all flag to analyze all log files")
        analyzer.analyze_latest_log()
        
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