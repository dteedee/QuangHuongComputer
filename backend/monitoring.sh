#!/bin/bash
# API Performance Monitoring Script
# Monitors API health, response times, and database performance

set -e

# Configuration
HOST="localhost"
PORT="5000"
PROTOCOL="http"
BASE_URL="$PROTOCOL://$HOST:$PORT"
HEALTH_CHECK_INTERVAL=5
CHECK_DURATION=300
OUTPUT_FILE="monitoring_results.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Starting API Performance Monitoring${NC}"
echo -e "${BLUE}Target: $BASE_URL${NC}"
echo -e "${BLUE}Monitoring Duration: $CHECK_DURATION seconds${NC}"
echo -e "${BLUE}Check Interval: $HEALTH_CHECK_INTERVAL seconds${NC}"
echo ""

# Clear output file
> $OUTPUT_FILE

# Function to check endpoint response time
check_response_time() {
    local endpoint=$1
    local description=$2
    
    echo -e "${YELLOW}Checking: $description${NC}"
    echo "Endpoint: $endpoint" >> $OUTPUT_FILE
    echo "Description: $description" >> $OUTPUT_FILE
    
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" "$BASE_URL$endpoint")
    local http_code=$(echo "$response" | tail -2 | head -1)
    local response_time=$(echo "$response" | tail -1)
    
    echo "HTTP Code: $http_code" >> $OUTPUT_FILE
    echo "Response Time: ${response_time}s" >> $OUTPUT_FILE
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ Status: OK (${response_time}s)${NC}"
        echo "Status: OK" >> $OUTPUT_FILE
    else
        echo -e "${RED}❌ Status: ERROR (HTTP $http_code)${NC}"
        echo "Status: ERROR" >> $OUTPUT_FILE
    fi
    
    echo "" >> $OUTPUT_FILE
    echo ""
}

# Function to check Redis connection
check_redis() {
    echo -e "${YELLOW}Checking Redis Connection${NC}"
    echo "Redis Health Check" >> $OUTPUT_FILE
    
    if redis-cli -p 6379 ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis: Connected${NC}"
        echo "Status: Connected" >> $OUTPUT_FILE
        
        # Get Redis stats
        redis_info=$(redis-cli -p 6379 info stats 2>/dev/null || echo "")
        if [ -n "$redis_info" ]; then
            echo "$redis_info" >> $OUTPUT_FILE
        fi
    else
        echo -e "${RED}❌ Redis: Disconnected${NC}"
        echo "Status: Disconnected" >> $OUTPUT_FILE
    fi
    
    echo "" >> $OUTPUT_FILE
    echo ""
}

# Function to check PostgreSQL connection
check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL Connection${NC}"
    echo "PostgreSQL Health Check" >> $OUTPUT_FILE
    
    if psql -h 127.0.0.1 -p 5434 -U postgres -d quanghuongdb -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL: Connected${NC}"
        echo "Status: Connected" >> $OUTPUT_FILE
    else
        echo -e "${RED}❌ PostgreSQL: Disconnected${NC}"
        echo "Status: Disconnected" >> $OUTPUT_FILE
    fi
    
    echo "" >> $OUTPUT_FILE
    echo ""
}

# Main monitoring loop
echo -e "${BLUE}Starting continuous monitoring...${NC}"
echo ""

elapsed=0
while [ $elapsed -lt $CHECK_DURATION ]; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp] Monitoring cycle...${NC}"
    echo "Timestamp: $timestamp" >> $OUTPUT_FILE
    echo "---" >> $OUTPUT_FILE
    
    # Check health endpoints
    check_response_time "/health" "General Health"
    check_response_time "/api/catalog/products" "Catalog Products"
    check_response_time "/api/catalog/categories" "Catalog Categories"
    
    # Check infrastructure
    check_redis
    check_postgres
    
    # Show system stats
    echo -e "${YELLOW}System Resources:${NC}"
    echo "System Resources:" >> $OUTPUT_FILE
    
    if command -v free &> /dev/null; then
        free_output=$(free -h | grep Mem)
        echo "Memory: $free_output" >> $OUTPUT_FILE
        echo -e "  Memory: $free_output"
    fi
    
    echo "" >> $OUTPUT_FILE
    echo ""
    
    elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
    
    if [ $elapsed -lt $CHECK_DURATION ]; then
        echo -e "${BLUE}Next check in $HEALTH_CHECK_INTERVAL seconds...${NC}"
        echo ""
        sleep $HEALTH_CHECK_INTERVAL
    fi
done

echo ""
echo -e "${GREEN}✅ Monitoring completed!${NC}"
echo -e "${BLUE}Results saved to: $OUTPUT_FILE${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
tail -20 $OUTPUT_FILE
