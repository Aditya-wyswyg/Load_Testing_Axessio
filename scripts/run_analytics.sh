#!/bin/bash

# Load Testing Analytics Runner
# Simple script to analyze test results and generate visual reports

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Load Testing Analytics Dashboard${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Python 3 is required but not installed. Please install Python 3 first.${NC}"
    exit 1
fi

# Check if logs directory exists
if [ ! -d "../logs" ]; then
    echo -e "${YELLOW}No logs directory found. Please run some tests first.${NC}"
    exit 1
fi

# Check if there are any log files
if [ -z "$(ls -A ../logs/*.log 2>/dev/null)" ]; then
    echo -e "${YELLOW}No log files found in logs directory. Please run some tests first.${NC}"
    exit 1
fi

echo -e "${GREEN}Found log files, starting analysis...${NC}"

# Change to analytics directory and run the analytics
cd analytics
python3 analytics.py "$@"

echo -e "${GREEN}✅ Analytics complete!${NC}" 