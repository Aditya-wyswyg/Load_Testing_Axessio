#!/bin/bash

# Main Analytics Runner Script
# Handles running analytics from the organized directory structure

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Load Testing Analytics Dashboard${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is required but not installed. Please install Python 3 first.${NC}"
    exit 1
fi

# Check if logs directory exists
if [ ! -d "logs" ]; then
    echo -e "${YELLOW}⚠️  No logs directory found. Please run some tests first.${NC}"
    exit 1
fi

# Check if there are any log files
if [ -z "$(ls -A logs/*.log 2>/dev/null)" ]; then
    echo -e "${YELLOW}⚠️  No log files found in logs directory. Please run some tests first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found log files, starting analysis...${NC}"

# Parse command line arguments
ANALYTICS_TYPE="python"
NO_GUI=false
ANALYZE_ALL=false

for arg in "$@"; do
    case $arg in
        --html)
            ANALYTICS_TYPE="html"
            ;;
        --no-gui)
            NO_GUI=true
            ;;
        --all)
            ANALYZE_ALL=true
            ;;
        --help)
            echo -e "${BLUE}Usage:${NC}"
            echo -e "  ./run_analytics.sh [options]"
            echo
            echo -e "${BLUE}Options:${NC}"
            echo -e "  --html     Generate HTML dashboard instead of Python charts"
            echo -e "  --no-gui   Generate text summary only (Python charts only)"
            echo -e "  --all      Analyze ALL log files instead of just the latest"
            echo -e "  --help     Display this help message"
            echo
            echo -e "${BLUE}Examples:${NC}"
            echo -e "  ./run_analytics.sh                # Analyze latest log file"
            echo -e "  ./run_analytics.sh --all          # Analyze all log files"
            echo -e "  ./run_analytics.sh --html         # Generate HTML dashboard"
            echo -e "  ./run_analytics.sh --no-gui       # Text summary only"
            exit 0
            ;;
    esac
done

# Run the appropriate analytics
if [ "$ANALYTICS_TYPE" = "html" ]; then
    echo -e "${BLUE}📊 Generating HTML dashboard...${NC}"
    cd analytics
    python3 html_analytics.py
    echo -e "${GREEN}✅ HTML dashboard generated! Check the main directory for the .html file.${NC}"
else
    echo -e "${BLUE}📊 Generating Python analytics...${NC}"
    
    # Show what we're analyzing
    if [ "$ANALYZE_ALL" = true ]; then
        echo -e "${YELLOW}💡 Analyzing ALL log files${NC}"
    else
        echo -e "${YELLOW}💡 Analyzing LATEST log file (use --all to analyze all files)${NC}"
    fi
    echo
    
    cd analytics
    if [ "$NO_GUI" = true ] && [ "$ANALYZE_ALL" = true ]; then
        python3 analytics.py --no-gui --all
    elif [ "$NO_GUI" = true ]; then
        python3 analytics.py --no-gui
    elif [ "$ANALYZE_ALL" = true ]; then
        python3 analytics.py --all
    else
        python3 analytics.py
    fi
    echo -e "${GREEN}✅ Analytics generation complete! Check the results/ folder for output files.${NC}"
fi 