# File Upload Load Testing

This directory contains k6 load testing scripts for testing the file upload functionality of the Axessio-open-webui application.

## Directory Structure

```
Load Testing/
├── scenarios/          # Test scenarios (k6 scripts)
├── scripts/           # Utility scripts (generators, runners)
├── analytics/         # Analytics and reporting tools
├── test_files/        # Generated test files
├── logs/             # Test execution logs
├── run_test.sh       # Main test runner
├── run_analytics.sh  # Main analytics runner
└── README.md         # This file
```

## Server Limitations

The server has the following limitations that affect our load testing approach:

1. **PDF Conversion**: The server converts all uploaded files to PDF format
2. **File Size Limit**: Maximum file size is 10MB
3. **Token Limit**: Maximum of 2 million tokens per file
4. **Supported File Types**: Only certain file types can be converted to PDF

Our tests use small text files (10KB and 100KB) which work reliably with the server's PDF conversion process.

## Setup Instructions

1. **Generate test files**

   First, generate the test files that will be used for the load testing by running:

   ```bash
   chmod +x scripts/generate_test_files.sh
   ./scripts/generate_test_files.sh
   ```

   This will create various test files of different sizes and types in the `test_files` directory.

2. **Multi-User Testing (Optional)**

   For more realistic load testing with multiple users, you can create additional test accounts:

   ```bash
   chmod +x scripts/create_test_users.sh
   ./scripts/create_test_users.sh 5  # Creates 5 test users
   ```

   This will:
   - Create multiple test user accounts
   - Generate tokens for each user
   - Save tokens to `test_user_tokens.txt`
   - You can then copy these tokens to the `USER_TOKENS` array in `Load.js`

   **Note**: The current setup works fine with a single user for most performance testing scenarios.

## Supported File Types

The Load.js script now supports testing with multiple document types:

### Text Files (.txt)
- `very-small-10KB.txt` - 10KB text file
- `small-100KB.txt` - 100KB text file  
- `medium-1MB.txt` - 1MB text file

### Microsoft Word Documents (.docx)
- `document-50KB.docx` - 50KB Word document
- `document-100KB.docx` - 100KB Word document

### Microsoft PowerPoint Presentations (.pptx)
- `presentation-50KB.pptx` - 50KB PowerPoint presentation
- `presentation-100KB.pptx` - 100KB PowerPoint presentation

### Microsoft Excel Spreadsheets (.xlsx)
- `spreadsheet-50KB.xlsx` - 50KB Excel spreadsheet
- `spreadsheet-100KB.xlsx` - 100KB Excel spreadsheet

## New Test Functions

Additional test functions have been added to support the new document types:

- `officeDocumentTest()` - Tests specifically with Word, PowerPoint, and Excel files
- `allDocumentTypesTest()` - Tests with equal probability across all document types (text, Word, PowerPoint, Excel)

2. **Install k6**

   If you don't have k6 installed, you can install it using:

   ```bash
   # On Ubuntu/Debian
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # On macOS
   brew install k6
   
   # On Windows
   # Download and install from https://dl.k6.io/msi/k6-latest-amd64.msi
   ```

## Running the Tests

Use the main `run_test.sh` script to execute the tests:

```bash
./run_test.sh [scenario_number] [options]
```

### Examples:

```bash
# Basic test execution
./run_test.sh 1                    # Run scenario 1 with log generation
./run_test.sh 3 --analytics        # Run scenario 3 and generate analytics
./run_test.sh 5 --no-log          # Run scenario 5 without log generation

# Get help
./run_test.sh --help
```

### Options:
- `--analytics`: Automatically run analytics after test completion  
- `--no-log`: Skip log file generation
- `--help`: Display usage information

## Available Scenarios

1. **Basic Concurrent Upload**: 5 users simultaneously uploading small files (100KB) - Baseline test
2. **Gradual User Scaling**: Simulates gradually increasing user load
3. **Realistic Office Pattern**: 10 users with varied behavior (2 large, 5 medium, 3 small files)
4. **Burst Upload Activity**: 10 users simultaneously uploading 1MB files
5. **Large File Handling**: 3 users uploading very large files simultaneously  
6. **Mixed Operations**: 10 users total (5 uploading, 2 downloading, 3 browsing)
7. **Network Variance**: 10 users with different simulated connection qualities
8. **Maximum Capacity**: 10 users continuously uploading 1MB files for 5 minutes
9. **Mixed File Types with Longer Delays**: Tests a mix of file types with realistic delays
10. **Document Upload Stress Test**: Tests if uploading many documents stalls the UI/APIs
11. **PDF-Only Upload**: 5 users uploading pre-converted PDF files (bypasses LibreOffice conversion)

## Key Metrics Measured

- **Response time** (average, median, 95th percentile)
- **Error rate** and success rate
- **Throughput** (uploads/second)
- **Time to first byte (TTFB)**
- **Connection time**
- **Upload duration** (custom metric)
- **Data transferred** (uploaded_bytes)

## Expected Outcomes by Scenario

- **Scenario 1**: All uploads complete successfully with response time < 3 seconds
- **Scenario 3**: System maintains responsiveness, 95% of uploads complete in < 10 seconds  
- **Scenario 4**: System handles burst without failures, may show temporary slowdown
- **Scenario 5**: Files upload successfully without server crashes
- **Scenario 6**: Upload operations complete without significant delay from mixed operations
- **Scenario 7**: All uploads eventually complete successfully despite connection variance
- **Scenario 8**: Identify system limits and degradation patterns under sustained load
- **Scenario 11**: Significantly better success rate and faster response times (no conversion overhead)

## Logs

Test logs are stored in the `logs` directory with timestamps for easy reference.

## Analytics Dashboard

After running tests, you can generate visual analytics to better understand your load testing results:

### Quick Analytics (Recommended)
```bash
# Generate Python charts and analysis
./run_analytics.sh

# Generate HTML dashboard instead
./run_analytics.sh --html

# Text summary only (no charts)
./run_analytics.sh --no-gui

# Get help
./run_analytics.sh --help
```

### Direct Analytics Tools
```bash
# Python analytics (run from analytics/ directory)
cd analytics
python3 analytics.py                           # Interactive charts
python3 analytics.py --no-gui                  # Text summary only
python3 analytics.py -f ../logs/scenario1_*.log # Specific log file
python3 analytics.py --export                  # Export JSON data

# HTML dashboard (run from analytics/ directory)  
cd analytics
python3 html_analytics.py                      # Generate HTML dashboard
```

### Analytics Features

The analytics tools provide:

📊 **Visual Charts:**
- Success vs Failure rate (pie chart)
- File types distribution (bar chart)
- Response time trends (line chart)
- Response time distribution (histogram)
- Performance metrics summary

💡 **Intelligent Recommendations:**
- Performance bottleneck identification
- Server optimization suggestions
- Error analysis and solutions
- Capacity planning insights

📈 **Key Metrics:**
- Average, median, 95th percentile response times
- Success/failure rates
- Throughput analysis
- Error code breakdown
- File type performance correlation

📁 **Export Options:**
- High-resolution PNG charts
- Interactive HTML dashboards
- Raw JSON data export
- Text-based summaries

## Troubleshooting

### Memory Issues

If you encounter memory issues:

1. **Reduce virtual user count**: Lower the `vus` parameter in the scenario file
2. **Use smaller files**: Edit `generate_test_files.sh` to create smaller test files
3. **Increase system swap space**: 
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Checking Results

The test results show various metrics:

- **http_req_duration**: The total time for the HTTP request (includes various stages)
- **http_req_waiting**: Time to first byte (TTFB) 
- **success_rate**: The percentage of successful uploads
- **uploaded_bytes**: Total number of bytes uploaded
- **upload_duration**: Custom metric for upload duration

## Customization

To modify test parameters, edit the scenario files. Common parameters to adjust:

- **vus**: Number of virtual users
- **duration**: Test duration
- **File size**: Change which test file is used in each scenario 