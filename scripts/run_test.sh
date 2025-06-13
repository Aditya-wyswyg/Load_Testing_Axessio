#!/bin/bash

# Define colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display usage information
usage() {
  echo -e "${BLUE}Usage:${NC}"
  echo -e "  ./run_test.sh [scenario_number] [options]"
  echo
  echo -e "${BLUE}File Upload Scenarios:${NC}"
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
  echo -e "  11: PDF-Only Upload"
  echo -e "  12: Sequential PDF Upload"
  echo
  echo -e "${BLUE}Chat Completion Scenarios:${NC}"
  echo -e "  13: Basic Chat Completion"
  echo -e "  14: Multi-Turn Conversation"
  echo -e "  15: Concurrent Chat Load"
  echo -e "  16: Streaming Chat Test"
  echo -e "  17: Mixed Model Chat"
  echo -e "  18: Long Conversation Test"
  echo
  echo -e "${BLUE}Options:${NC}"
  echo -e "  --no-log  Don't generate log file"
  echo -e "  --help    Display this help message"
  echo
  echo -e "${BLUE}Examples:${NC}"
  echo -e "  ./run_test.sh 1       # Run scenario 1 with log generation"
  echo -e "  ./run_test.sh 3 --no-log  # Run scenario 3 without log generation"
  exit 1
}

# Check if test files exist
check_test_files() {
  if [ ! -d "test_files" ] || [ -z "$(ls -A test_files 2>/dev/null)" ]; then
    echo -e "${YELLOW}Test files not found. Generating them now...${NC}"
    chmod +x generate_test_files.sh
    ./generate_test_files.sh
  else
    echo -e "${GREEN}Test files found.${NC}"
  fi
}

# Main function
main() {
  # Parse command line arguments
  local scenario_number=""
  local generate_log=true

  for arg in "$@"; do
    if [[ $arg == "--no-log" ]]; then
      generate_log=false
    elif [[ $arg == "--help" ]]; then
      usage
    elif [[ $arg =~ ^[0-9]+$ ]]; then
      scenario_number=$arg
    fi
  done

  # Check if scenario number is provided
  if [ -z "$scenario_number" ]; then
    echo -e "${RED}Error: Scenario number is required${NC}"
    usage
  fi

  # Check if scenario number is valid
  if [ "$scenario_number" -lt 1 ] || [ "$scenario_number" -gt 18 ]; then
    echo -e "${RED}Error: Invalid scenario number. Must be between 1 and 18${NC}"
    usage
  fi

  # Set scenario file name
  local scenario_file=""
  case $scenario_number in
    1) scenario_file="scenarios/scenario1_basic_concurrent_upload.js" ;;
    2) scenario_file="scenarios/scenario2_gradual_user_scaling.js" ;;
    3) scenario_file="scenarios/scenario3_realistic_office_pattern.js" ;;
    4) scenario_file="scenarios/scenario4_burst_upload_activity.js" ;;
    5) scenario_file="scenarios/scenario5_large_file_handling.js" ;;
    6) scenario_file="scenarios/scenario6_mixed_operations.js" ;;
    7) scenario_file="scenarios/scenario7_network_variance.js" ;;
    8) scenario_file="scenarios/scenario8_maximum_capacity.js" ;;
    9) scenario_file="scenarios/scenario9_mixed_file_types_longer_delays.js" ;;
    10) scenario_file="scenarios/scenario10_document_upload_stress_test.js" ;;
    11) scenario_file="scenarios/scenario11_pdf_only_upload.js" ;;
    12) scenario_file="scenarios/scenario12_sequential_pdf_upload.js" ;;
    13) scenario_file="scenarios/scenario13_basic_chat_completion.js" ;;
    14) scenario_file="scenarios/scenario14_multi_turn_conversation.js" ;;
    15) scenario_file="scenarios/scenario15_concurrent_chat_load.js" ;;
    16) scenario_file="scenarios/scenario16_streaming_chat_test.js" ;;
    17) scenario_file="scenarios/scenario17_mixed_model_chat.js" ;;
    18) scenario_file="scenarios/scenario18_long_conversation_test.js" ;;
  esac

  # Check if scenario file exists
  if [ ! -f "$scenario_file" ]; then
    echo -e "${RED}Error: Scenario file '$scenario_file' not found${NC}"
    exit 1
  fi

  # Check if test files exist
  check_test_files

  # Create logs directory if it doesn't exist
  if [ "$generate_log" = true ]; then
    mkdir -p logs
  fi

  # Generate timestamp for log file
  local timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
  local log_file="logs/scenario${scenario_number}_${timestamp}.log"

  # Display information about the test
  echo -e "${GREEN}Running scenario $scenario_number: $scenario_file${NC}"
  if [ "$generate_log" = true ]; then
    echo -e "${GREEN}Log file will be generated at: $log_file${NC}"
  else
    echo -e "${YELLOW}Log file generation disabled${NC}"
  fi

  # Run the test
  if [ "$generate_log" = true ]; then
    echo -e "${GREEN}Starting test...${NC}"
    k6 run --console-output=$log_file $scenario_file
    echo -e "${GREEN}Test completed. Log file: $log_file${NC}"
  else
    echo -e "${GREEN}Starting test...${NC}"
    k6 run $scenario_file
    echo -e "${GREEN}Test completed.${NC}"
  fi
}

# Run main function
main "$@" 