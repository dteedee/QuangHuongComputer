#!/bin/bash
# Simple Load Testing using curl
# Tests API performance with concurrent requests

set -e

# Configuration
HOST="localhost"
PORT="5000"
PROTOCOL="http"
BASE_URL="$PROTOCOL://$HOST:$PORT"
CONCURRENT_REQUESTS=50
REQUESTS_PER_CLIENT=10
OUTPUT_FILE="load_test_results.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting API Load Test${NC}"
echo -e "${BLUE}Target: $BASE_URL${NC}"
echo -e "${BLUE}Concurrent Requests: $CONCURRENT_REQUESTS${NC}"
echo -e "${BLUE}Requests per Client: $REQUESTS_PER_CLIENT${NC}"
echo ""

# Clear output file
> $OUTPUT_FILE

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    local count=$3
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Endpoint: $endpoint" >> $OUTPUT_FILE
    echo "Description: $description" >> $OUTPUT_FILE
    echo "---" >> $OUTPUT_FILE
    
    local total_time=0
    local success_count=0
    local error_count=0
    local response_times=()
    
    for i in $(seq 1 $count); do
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" "$BASE_URL$endpoint")
        http_code=$(echo "$response" | tail -2 | head -1)
        response_time=$(echo "$response" | tail -1)
        
        response_times+=($response_time)
        total_time=$(echo "$total_time + $response_time" | bc)
        
        if [ "$http_code" -eq 200 ]; then
            success_count=$((success_count + 1))
            echo -n "${GREEN}.${NC}"
        else
            error_count=$((error_count + 1))
            echo -n "${RED}E${NC}"
        fi
    done
    
    echo ""
    
    local avg_time=$(echo "scale=3; $total_time / $count" | bc)
    
    echo "Results:" >> $OUTPUT_FILE
    echo "  Total Requests: $count" >> $OUTPUT_FILE
    echo "  Successful: $success_count" >> $OUTPUT_FILE
    echo "  Errors: $error_count" >> $OUTPUT_FILE
    echo "  Total Time: ${total_time}s" >> $OUTPUT_FILE
    echo "  Average Time: ${avg_time}s" >> $OUTPUT_FILE
    echo "  Success Rate: $(echo "scale=2; ($success_count * 100) / $count" | bc)%" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
    
    echo -e "${GREEN}✅ $description complete${NC}"
    echo -e "  Success: $success_count/$count ($(echo "scale=1; ($success_count * 100) / $count" | bc)%)"
    echo -e "  Avg Time: ${avg_time}s"
    echo ""
}

# Test endpoints
test_endpoint "/api/catalog/products" "Get Products List" $REQUESTS_PER_CLIENT
test_endpoint "/api/catalog/categories" "Get Categories" $REQUESTS_PER_CLIENT
test_endpoint "/api/catalog/brands" "Get Brands" $REQUESTS_PER_CLIENT
test_endpoint "/api/catalog/products/search?query=laptop" "Search Products" $REQUESTS_PER_CLIENT

# Parallel load testing
echo -e "${YELLOW}Running parallel load test with $CONCURRENT_REQUESTS concurrent clients...${NC}"

run_parallel_test() {
    local endpoint=$1
    local desc=$2
    
    echo "" >> $OUTPUT_FILE
    echo "Parallel Test: $desc" >> $OUTPUT_FILE
    echo "---" >> $OUTPUT_FILE
    
    local start_time=$(date +%s%N | cut -b1-13)
    
    for i in $(seq 1 $CONCURRENT_REQUESTS); do
        (
            for j in $(seq 1 $REQUESTS_PER_CLIENT); do
                curl -s "$BASE_URL$endpoint" > /dev/null
            done
        ) &
    done
    
    wait
    
    local end_time=$(date +%s%N | cut -b1-13)
    local duration=$((($end_time - $start_time) / 1000))
    
    echo "Duration: ${duration}s" >> $OUTPUT_FILE
    echo "Total Concurrent Requests: $(($CONCURRENT_REQUESTS * $REQUESTS_PER_CLIENT))" >> $OUTPUT_FILE
    
    echo -e "${GREEN}✅ Parallel test complete in ${duration}s${NC}"
}

run_parallel_test "/api/catalog/products?page=1&pageSize=20" "Parallel Products Load Test"
run_parallel_test "/api/catalog/categories" "Parallel Categories Load Test"

echo ""
echo -e "${BLUE}📊 Test Results:${NC}"
cat $OUTPUT_FILE

echo ""
echo -e "${GREEN}✅ Load testing completed successfully!${NC}"
echo -e "${BLUE}Results saved to: $OUTPUT_FILE${NC}"
