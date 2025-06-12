# File Upload Load Testing

This directory contains k6 load testing scripts for testing the file upload functionality of the Axessio-open-webui application.

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
   chmod +x generate_test_files.sh
   ./generate_test_files.sh
   ```

   This will create various test files of different sizes and types in the `test_files` directory.

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

Use the provided `run_test.sh` script to execute the tests:

```bash
./run_test.sh [scenario_number]
```

For example, to run scenario 1 (Basic Concurrent Upload):

```bash
./run_test.sh 1
```

## Available Scenarios

1. **Basic Concurrent Upload**: Tests concurrent uploads with multiple users
2. **Gradual User Scaling**: Simulates gradually increasing user load
3. **Realistic Office Pattern**: Mimics realistic office usage patterns
4. **Burst Upload Activity**: Tests rapid succession of uploads
5. **Mixed Operations**: Combines uploads with other operations
6. **Network Variance**: Tests uploads with variable network conditions
7. **Maximum Capacity**: Tests the maximum upload capacity of the server
8. **Mixed File Types with Longer Delays**: Tests a mix of file types with realistic delays
9. **Document Upload Stress Test**: Tests if uploading many documents stalls the UI/APIs

## Logs

Test logs are stored in the `logs` directory with timestamps for easy reference.

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