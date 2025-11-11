#!/bin/bash

# GRC Platform Local Development Stop Script
# This script stops all running services gracefully

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Stopping GRC Platform Services${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Function to kill process on port
kill_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Stopping $service on port $port...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ $service stopped${NC}"
    else
        echo -e "${GREEN}✓ $service is not running${NC}"
    fi
}

# Function to kill process by PID
kill_pid() {
    local pid=$1
    local service=$2
    
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping $service (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ $service stopped${NC}"
    fi
}

# Stop services using saved PIDs if available
if [ -f logs/services.pid ]; then
    echo -e "${BLUE}Stopping services using saved PIDs...${NC}"
    source logs/services.pid
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill_pid $BACKEND_PID "Backend"
    fi
    
    if [ ! -z "$PLATFORM_PID" ]; then
        kill_pid $PLATFORM_PID "Admin Platform"
    fi
    
    if [ ! -z "$PORTAL_PID" ]; then
        kill_pid $PORTAL_PID "Customer Portal"
    fi
    
    rm logs/services.pid
    echo ""
fi

# Also kill by port to make sure everything is stopped
echo -e "${BLUE}Ensuring all ports are free...${NC}"
kill_port 8080 "Backend API"
kill_port 3040 "Admin Platform"
kill_port 3050 "Customer Portal"

echo ""
echo -e "${BLUE}PostgreSQL container status:${NC}"

# Check if we should stop the database
if docker ps --filter "name=compliance-db" --filter "status=running" | grep -q compliance-db; then
    echo -e "${YELLOW}PostgreSQL container is running${NC}"
    read -p "Do you want to stop PostgreSQL container? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Stopping PostgreSQL container...${NC}"
        docker stop compliance-db
        echo -e "${GREEN}✓ PostgreSQL container stopped${NC}"
    else
        echo -e "${BLUE}PostgreSQL container left running${NC}"
    fi
else
    echo -e "${GREEN}✓ PostgreSQL container is not running${NC}"
fi

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  ✓ All services stopped${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "${BLUE}To start services again:${NC}"
echo -e "  ${YELLOW}./start-local.sh${NC}"
echo ""
