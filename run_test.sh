#!/bin/bash

# Main Load Testing Runner Script
# Handles running tests and analytics from the organized directory structure

# Define colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display usage information
usage() {
  echo -e "${BLUE}Load Testing Suite${NC}"
  echo -e "${BLUE}==================${NC}"
  echo
  echo -e "${BLUE}Usage:${NC}"
  echo -e "  ./run_test.sh [scenario_number] [options]"
  echo
  echo -e "${BLUE}Available scenarios:${NC}"
  echo -e "  1: Basic Concurrent Upload"
  echo -e "  2: Gradual User Scaling"
  echo -e "  3: Realistic Office Pattern"
  echo -e "  4: Burst Upload Activity"
  echo -e "  5: Large File Handling"
  echo -e "  6: Mixed Operations"
  echo -e "  7: Network Variance"
  echo -e "  8: Maximum Capacity"
  echo -e "  9: Mixed File Types with Longer Delays"
  echo -e "  10: Document Upload Stress Test"
  echo -e "  11: PDF-Only Upload (bypasses conversion)"
  echo
  echo -e "${BLUE}Options:${NC}"
  echo -e "  --no-log     Don't generate log file"
  echo -e "  --analytics  Run analytics after test completion"
  echo -e "  --help       Display this help message"
  echo
  echo -e "${BLUE}Examples:${NC}"
  echo -e "  ./run_test.sh 1                    # Run scenario 1 with log generation"
  echo -e "  ./run_test.sh 3 --analytics        # Run scenario 3 and generate analytics"
  echo -e "  ./run_test.sh 5 --no-log          # Run scenario 5 without log generation"
  echo
  echo -e "${BLUE}Analytics:${NC}"
  echo -e "  ./run_analytics.sh                # Generate analytics for all logs"
  echo
  exit 1
}

# Check if test files exist
check_test_files() {
  if [ ! -d "test_files" ] || [ -z "$(ls -A test_files 2>/dev/null)" ]; then
    echo -e "${YELLOW}Test files not found. Generating them now...${NC}"
    chmod +x scripts/generate_test_files.sh
    ./scripts/generate_test_files.sh
  else
    echo -e "${GREEN}✅ Test files found.${NC}"
  fi
}

# Main function
main() {
  # Parse command line arguments
  local scenario_number=""
  local generate_log=true
  local run_analytics=false

  for arg in "$@"; do
    case $arg in
      --no-log)
        generate_log=false
        ;;
      --analytics)
        run_analytics=true
        ;;
      --help)
        usage
        ;;
      [0-9]*)
        scenario_number=$arg
        ;;
    esac
  done

  # Check if scenario number is provided
  if [ -z "$scenario_number" ]; then
    echo -e "${RED}❌ Error: Scenario number is required${NC}"
    usage
  fi

  # Check if scenario number is valid
  if [ "$scenario_number" -lt 1 ] || [ "$scenario_number" -gt 12 ]; then
    echo -e "${RED}❌ Error: Invalid scenario number. Must be between 1 and 12${NC}"
    usage
  fi

  # Set scenario file name
  local scenario_file=""
  local scenario_name=""
  case $scenario_number in
    1) scenario_file="scenarios/scenario1_basic_concurrent_upload.js"
       scenario_name="Basic Concurrent Upload" ;;
    2) scenario_file="scenarios/scenario2_gradual_user_scaling.js"
       scenario_name="Gradual User Scaling" ;;
    3) scenario_file="scenarios/scenario3_realistic_office_pattern.js"
       scenario_name="Realistic Office Pattern" ;;
    4) scenario_file="scenarios/scenario4_burst_upload_activity.js"
       scenario_name="Burst Upload Activity" ;;
    5) scenario_file="scenarios/scenario5_large_file_handling.js"
       scenario_name="Large File Handling" ;;
    6) scenario_file="scenarios/scenario6_mixed_operations.js"
       scenario_name="Mixed Operations" ;;
    7) scenario_file="scenarios/scenario7_network_variance.js"
       scenario_name="Network Variance" ;;
    8) scenario_file="scenarios/scenario8_maximum_capacity.js"
       scenario_name="Maximum Capacity" ;;
    9) scenario_file="scenarios/scenario9_mixed_file_types_longer_delays.js"
       scenario_name="Mixed File Types with Longer Delays" ;;
    10) scenario_file="scenarios/scenario10_document_upload_stress_test.js"
        scenario_name="Document Upload Stress Test" ;;
    11) scenario_file="scenarios/scenario11_pdf_only_upload.js"
        scenario_name="PDF-Only Upload (bypasses conversion)" ;;
    12) scenario_file="scenarios/scenario12_sequential_pdf_upload.js"
        scenario_name="Sequential PDF Upload" ;;
  esac

  # Check if scenario file exists
  if [ ! -f "$scenario_file" ]; then
    echo -e "${RED}❌ Error: Scenario file '$scenario_file' not found${NC}"
    exit 1
  fi

  # Check if test files exist
  check_test_files

  # Create logs directory if it doesn't exist
  if [ "$generate_log" = true ]; then
    mkdir -p logs
  fi

  # Generate timestamp for log file
  local timestamp=$(date +"%Y%m%d_%H%M%S")
  local log_file="logs/scenario${scenario_number}_${timestamp}.log"

  # Display information about the test
  echo -e "${GREEN}🚀 Running Scenario $scenario_number: $scenario_name${NC}"
  if [ "$generate_log" = true ]; then
    echo -e "${GREEN}📝 Log file: $log_file${NC}"
  else
    echo -e "${YELLOW}⚠️  Log file generation disabled${NC}"
  fi

  echo -e "${BLUE}📊 Starting test...${NC}"
  echo

  # Run the test
  if [ "$generate_log" = true ]; then
    k6 run $scenario_file 2>&1 | tee $log_file
    echo
    echo -e "${GREEN}✅ Test completed successfully!${NC}"
    echo -e "${GREEN}📁 Log file: $log_file${NC}"
  else
    k6 run $scenario_file
    echo
    echo -e "${GREEN}✅ Test completed successfully!${NC}"
  fi

  # Run analytics if requested
  if [ "$run_analytics" = true ] && [ "$generate_log" = true ]; then
    echo
    echo -e "${BLUE}📊 Generating analytics...${NC}"
    ./run_analytics.sh
  elif [ "$run_analytics" = true ] && [ "$generate_log" = false ]; then
    echo -e "${YELLOW}⚠️  Analytics requires log files. Skipping analytics generation.${NC}"
  fi
}

# Run main function
main "$@" 