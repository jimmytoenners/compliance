#!/bin/bash

# GRC Platform Local Development Startup Script
# This script starts all services: PostgreSQL (Docker), Backend (Go), Platform (Next.js), Portal (Next.js)

set -e  # Exit on error

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
echo -e "${BLUE}  GRC Platform - Local Development Environment${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $service to be ready on port $port...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if check_port $port; then
            echo -e "${GREEN}✓ $service is ready!${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $service failed to start within 60 seconds${NC}"
    return 1
}

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}✗ .env file not found!${NC}"
    echo -e "${YELLOW}Please create a .env file. You can copy .env.example:${NC}"
    echo -e "  cp .env.example .env"
    exit 1
fi

echo -e "${BLUE}[1/5] Checking PostgreSQL (Port 5444)...${NC}"

# Check if PostgreSQL container is running
if docker ps --filter "name=compliance-db" --filter "status=running" | grep -q compliance-db; then
    echo -e "${GREEN}✓ PostgreSQL container is already running${NC}"
elif docker ps -a --filter "name=compliance-db" | grep -q compliance-db; then
    echo -e "${YELLOW}Starting existing PostgreSQL container...${NC}"
    docker start compliance-db
    sleep 3
else
    echo -e "${YELLOW}Starting new PostgreSQL container...${NC}"
    docker-compose up -d db
    sleep 5
fi

# Wait for PostgreSQL to be ready
if wait_for_service "PostgreSQL" 5444; then
    # Check if database schema is initialized
    echo -e "${YELLOW}Checking database schema...${NC}"
    if PGPASSWORD=grc_password psql -h localhost -p 5444 -U grc_user -d grc_db -c "SELECT 1 FROM users LIMIT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Database schema exists${NC}"
    else
        echo -e "${YELLOW}Initializing database schema...${NC}"
        PGPASSWORD=grc_password psql -h localhost -p 5444 -U grc_user -d grc_db -f grc-backend/schema.sql
        echo -e "${GREEN}✓ Database schema initialized${NC}"
    fi
else
    echo -e "${RED}Failed to start PostgreSQL${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[2/5] Starting Backend (Port 8080)...${NC}"

# Load environment variables
source .env

# Kill existing backend process if running
if check_port 8080; then
    echo -e "${YELLOW}Stopping existing backend process...${NC}"
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start backend in background
cd grc-backend
echo -e "${YELLOW}Building and starting Go backend...${NC}"
nohup go run . > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
if wait_for_service "Backend API" 8080; then
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}Failed to start backend. Check logs/backend.log${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[3/5] Starting Admin Platform (Port 3040)...${NC}"

# Kill existing platform process if running
if check_port 3040; then
    echo -e "${YELLOW}Stopping existing platform process...${NC}"
    lsof -ti:3040 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Check if node_modules exists
if [ ! -d "grc-frontend-platform/node_modules" ]; then
    echo -e "${YELLOW}Installing platform dependencies...${NC}"
    cd grc-frontend-platform
    npm install
    cd ..
fi

# Start platform in background
cd grc-frontend-platform
echo -e "${YELLOW}Starting Next.js admin platform...${NC}"
nohup npm run dev > ../logs/platform.log 2>&1 &
PLATFORM_PID=$!
cd ..

# Wait for platform to start
if wait_for_service "Admin Platform" 3040; then
    echo -e "${GREEN}✓ Admin Platform started (PID: $PLATFORM_PID)${NC}"
else
    echo -e "${RED}Failed to start platform. Check logs/platform.log${NC}"
fi

echo ""
echo -e "${BLUE}[4/5] Starting Customer Portal (Port 3050)...${NC}"

# Kill existing portal process if running
if check_port 3050; then
    echo -e "${YELLOW}Stopping existing portal process...${NC}"
    lsof -ti:3050 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Check if node_modules exists
if [ ! -d "grc-frontend-portal/node_modules" ]; then
    echo -e "${YELLOW}Installing portal dependencies...${NC}"
    cd grc-frontend-portal
    npm install
    cd ..
fi

# Start portal in background
cd grc-frontend-portal
echo -e "${YELLOW}Starting Next.js customer portal...${NC}"
nohup npm run dev > ../logs/portal.log 2>&1 &
PORTAL_PID=$!
cd ..

# Wait for portal to start
if wait_for_service "Customer Portal" 3050; then
    echo -e "${GREEN}✓ Customer Portal started (PID: $PORTAL_PID)${NC}"
else
    echo -e "${RED}Failed to start portal. Check logs/portal.log${NC}"
fi

echo ""
echo -e "${BLUE}[5/5] Creating logs directory and PID file...${NC}"

# Create logs directory if it doesn't exist
mkdir -p logs

# Save PIDs to file for easy cleanup
cat > logs/services.pid << EOF
BACKEND_PID=$BACKEND_PID
PLATFORM_PID=$PLATFORM_PID
PORTAL_PID=$PORTAL_PID
EOF

echo -e "${GREEN}✓ Service PIDs saved to logs/services.pid${NC}"

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  🚀 All services started successfully!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "${BLUE}Service URLs:${NC}"
echo -e "  • Admin Platform:   ${YELLOW}http://localhost:3040${NC}"
echo -e "  • Customer Portal:  ${YELLOW}http://localhost:3050${NC}"
echo -e "  • Backend API:      ${YELLOW}http://localhost:8080${NC}"
echo -e "  • PostgreSQL:       ${YELLOW}localhost:5444${NC}"
echo ""
echo -e "${BLUE}Default Admin Credentials:${NC}"
echo -e "  • Email:    ${YELLOW}admin@company.com${NC}"
echo -e "  • Password: ${YELLOW}admin123${NC}"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  • Backend:  ${YELLOW}tail -f logs/backend.log${NC}"
echo -e "  • Platform: ${YELLOW}tail -f logs/platform.log${NC}"
echo -e "  • Portal:   ${YELLOW}tail -f logs/portal.log${NC}"
echo ""
echo -e "${BLUE}To stop all services:${NC}"
echo -e "  ${YELLOW}./stop-local.sh${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
