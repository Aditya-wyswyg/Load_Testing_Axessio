#!/bin/bash

# Create directory for test files if it doesn't exist
mkdir -p ~/WYSWYG/Load\ Testing/test_files

# Download a small sample PDF file
echo "Downloading sample PDF file..."
curl -L "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" -o ~/WYSWYG/Load\ Testing/test_files/sample.pdf
echo "Download complete. File saved to ~/WYSWYG/Load Testing/test_files/sample.pdf"

# Check file size
FILE_SIZE=$(stat -c%s ~/WYSWYG/Load\ Testing/test_files/sample.pdf)
echo "File size: $FILE_SIZE bytes"

# Create a copy with a different name
cp ~/WYSWYG/Load\ Testing/test_files/sample.pdf ~/WYSWYG/Load\ Testing/test_files/sample2.pdf
echo "Created a copy as sample2.pdf"

# List all files in the directory
echo "Files in the test directory:"
ls -lh ~/WYSWYG/Load\ Testing/test_files/ 