#!/bin/bash

# Script to create multiple test users for load testing
# This script helps you create test accounts and extract their tokens

# Configuration
API_BASE_URL="https://axxessio.wyswyg.in/api/v1"
SIGNUP_ENDPOINT="${API_BASE_URL}/auths/signup"
SIGNIN_ENDPOINT="${API_BASE_URL}/auths/signin"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to create a test user
create_test_user() {
    local user_number=$1
    local username="loadtest_user_${user_number}"
    local email="loadtest${user_number}@example.com"
    local password="LoadTest123!"
    local name="Load Test User ${user_number}"

    echo -e "${BLUE}Creating test user: ${username}${NC}"

    # Create signup payload
    local signup_payload=$(cat <<EOF
{
    "name": "${name}",
    "email": "${email}",
    "password": "${password}"
}
EOF
)

    # Attempt to sign up
    local signup_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "${signup_payload}" \
        "${SIGNUP_ENDPOINT}")

    echo "Signup response: ${signup_response}"

    # Attempt to sign in to get token
    local signin_payload=$(cat <<EOF
{
    "email": "${email}",
    "password": "${password}"
}
EOF
)

    echo -e "${YELLOW}Signing in to get token...${NC}"
    local signin_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "${signin_payload}" \
        "${SIGNIN_ENDPOINT}")

    echo "Signin response: ${signin_response}"

    # Extract token from response (adjust this based on your API response format)
    local token=$(echo "${signin_response}" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "${token}" ]; then
        echo -e "${GREEN}✓ User created successfully${NC}"
        echo -e "${GREEN}Token: ${token}${NC}"
        echo "  '${token}'," >> test_user_tokens.txt
    else
        echo -e "${RED}✗ Failed to extract token${NC}"
        echo -e "${RED}Response: ${signin_response}${NC}"
    fi

    echo "----------------------------------------"
}

# Main function
main() {
    local num_users=${1:-3}  # Default to 3 users if not specified

    echo -e "${BLUE}Creating ${num_users} test users for load testing${NC}"
    echo "=========================================="

    # Initialize tokens file
    echo "// Generated test user tokens for load testing" > test_user_tokens.txt
    echo "const USER_TOKENS = [" >> test_user_tokens.txt

    # Create test users
    for i in $(seq 1 $num_users); do
        create_test_user $i
        sleep 2  # Small delay between requests
    done

    # Close the array
    echo "];" >> test_user_tokens.txt

    echo -e "${GREEN}Test user creation completed!${NC}"
    echo -e "${YELLOW}Tokens saved to: test_user_tokens.txt${NC}"
    echo -e "${YELLOW}Copy the tokens from this file to your Load.js USER_TOKENS array${NC}"
    
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Review the generated tokens in test_user_tokens.txt"
    echo "2. Copy the valid tokens to Load.js USER_TOKENS array"
    echo "3. Run your load tests with multiple users"
    echo ""
    echo -e "${YELLOW}Note: You may need to manually verify email addresses or adjust the signup process based on your application's requirements.${NC}"
}

# Display usage
usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo "  ./create_test_users.sh [number_of_users]"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  ./create_test_users.sh     # Creates 3 test users (default)"
    echo "  ./create_test_users.sh 5   # Creates 5 test users"
    echo ""
    echo -e "${YELLOW}Note: This script assumes your API endpoints are:${NC}"
    echo "  Signup: ${SIGNUP_ENDPOINT}"
    echo "  Signin: ${SIGNIN_ENDPOINT}"
    echo ""
    echo -e "${YELLOW}Adjust the API endpoints in the script if they differ.${NC}"
}

# Check command line arguments
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@" 