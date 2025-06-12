#!/bin/bash

# Create directory for test files
mkdir -p ~/WYSWYG/Load\ Testing/test_files

# Function to create a text file of specified size
create_text_file() {
    SIZE=$1
    FILENAME=$2
    echo "Creating $FILENAME of size $SIZE bytes"
    dd if=/dev/zero bs=$SIZE count=1 | tr '\0' 'A' > ~/WYSWYG/Load\ Testing/test_files/$FILENAME
    echo "Created $FILENAME successfully"
}

# Create text files of different sizes
create_text_file 10240 "very-small-10KB.txt"         # 10KB
create_text_file 102400 "small-100KB.txt"            # 100KB
create_text_file 1048576 "medium-1MB.txt"            # 1MB
create_text_file 5242880 "large-5MB.txt"             # 5MB
create_text_file 10485760 "very-large-10MB.txt"      # 10MB

# Use echo to create minimal valid PDF files
create_pdf_file() {
    SIZE=$1
    FILENAME=$2
    echo "Creating minimal valid PDF file: $FILENAME"
    
    # Create PDF header and objects
    {
        # PDF header
        echo -n "%PDF-1.4"
        echo -e "\n"
        
        # Object 1 - catalog
        echo -e "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        
        # Object 2 - pages
        echo -e "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        
        # Object 3 - page
        echo -e "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
        
        # Object 4 - content stream with repeating text to achieve target size
        echo -n "4 0 obj\n<< /Length "
        
        # Calculate content size to meet target total size (minus overhead)
        CONTENT_SIZE=$((SIZE - 500))
        echo -n "$CONTENT_SIZE >>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n"
        
        # Generate content to fill up to target size
        CHARS_PER_LINE=80
        LINES=$((CONTENT_SIZE / CHARS_PER_LINE))
        
        for ((i=1; i<=LINES; i++)); do
            # Create a line of text that will be repeated
            printf "(Line %d: This is test content for a load testing PDF file created for upload testing.) Tj\n0 -14 Td\n" $i
        done
        
        echo -e "ET\nendstream\nendobj\n"
        
        # Cross-reference table
        echo -e "xref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000079 00000 n\n0000000145 00000 n\n0000000234 00000 n\n"
        
        # Trailer
        echo -e "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n$((CONTENT_SIZE + 300))\n%%EOF"
    } > ~/WYSWYG/Load\ Testing/test_files/$FILENAME
    
    ACTUAL_SIZE=$(stat -c%s ~/WYSWYG/Load\ Testing/test_files/$FILENAME)
    echo "Created $FILENAME with actual size of $ACTUAL_SIZE bytes"
}

# Create PDF files (simplified valid structure)
create_pdf_file 10240 "very-small-10KB.pdf"        # ~10KB 
create_pdf_file 102400 "small-100KB.pdf"           # ~100KB
create_pdf_file 1048576 "medium-1MB.pdf"           # ~1MB

# Create sample DOCX/XLSX/PPTX files (dummy files with correct extensions)
echo "Creating sample document files (dummy files with correct extensions)"
create_text_file 51200 "document-50KB.docx"
create_text_file 102400 "document-100KB.docx"
create_text_file 51200 "spreadsheet-50KB.xlsx"
create_text_file 102400 "spreadsheet-100KB.xlsx"
create_text_file 51200 "presentation-50KB.pptx"
create_text_file 102400 "presentation-100KB.pptx"

echo "Generated test files:"
ls -lh ~/WYSWYG/Load\ Testing/test_files/
echo "Test files generated successfully. They can be found in ~/WYSWYG/Load Testing/test_files/" 