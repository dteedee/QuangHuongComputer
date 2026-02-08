#!/bin/bash

# ============================================
# Quang Hương Computer - System Management
# ============================================

set -e

PROJECT_ROOT="/home/teedee/Pictures/QuangHuongComputer"
BACKEND_DIR="$PROJECT_ROOT/backend/ApiGateway"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_LOG="/tmp/backend.log"
FRONTEND_LOG="/tmp/frontend.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# Functions
# ============================================

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================
# Status Check
# ============================================

check_status() {
    print_header "Checking System Status"

    # Check Docker services
    echo ""
    print_info "Docker Services:"
    docker compose ps 2>/dev/null || print_error "Docker Compose not running"

    # Check Backend
    echo ""
    print_info "Backend (.NET):"
    if pgrep -f "dotnet run" > /dev/null; then
        PID=$(pgrep -f "dotnet run")
        print_success "Running (PID: $PID)"
        print_info "Logs: $BACKEND_LOG"
    else
        print_error "Not running"
    fi

    # Check Frontend
    echo ""
    print_info "Frontend (Vite):"
    if pgrep -f "vite" > /dev/null; then
        PID=$(pgrep -f "vite")
        print_success "Running (PID: $PID)"
        print_info "Logs: $FRONTEND_LOG"
    else
        print_error "Not running"
    fi

    # Test APIs
    echo ""
    print_info "API Health Check:"
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        print_success "Backend API responding"
    else
        print_error "Backend API not responding"
    fi

    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_success "Frontend responding"
    else
        print_error "Frontend not responding"
    fi

    echo ""
    print_info "Access URLs:"
    echo "  Frontend:  http://localhost:5173"
    echo "  Backend:   http://localhost:5000"
    echo "  RabbitMQ:  http://localhost:15672"
}

# ============================================
# Start Services
# ============================================

start_all() {
    print_header "Starting All Services"

    # Start Docker services
    echo ""
    print_info "Starting Docker services..."
    cd "$PROJECT_ROOT"
    docker compose up -d
    print_success "Docker services started"

    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    sleep 5

    # Start Backend
    echo ""
    print_info "Starting Backend..."
    cd "$BACKEND_DIR"
    ASPNETCORE_ENVIRONMENT=Development nohup dotnet run > "$BACKEND_LOG" 2>&1 &
    sleep 3
    if pgrep -f "dotnet run" > /dev/null; then
        print_success "Backend started (PID: $(pgrep -f 'dotnet run'))"
    else
        print_error "Backend failed to start. Check logs: $BACKEND_LOG"
        return 1
    fi

    # Start Frontend
    echo ""
    print_info "Starting Frontend..."
    cd "$FRONTEND_DIR"
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    sleep 3
    if pgrep -f "vite" > /dev/null; then
        print_success "Frontend started (PID: $(pgrep -f 'vite'))"
    else
        print_error "Frontend failed to start. Check logs: $FRONTEND_LOG"
        return 1
    fi

    echo ""
    print_success "All services started successfully!"
    echo ""
    print_info "Access the application at: http://localhost:5173"
}

# ============================================
# Stop Services
# ============================================

stop_all() {
    print_header "Stopping All Services"

    # Stop Backend
    echo ""
    print_info "Stopping Backend..."
    pkill -f "dotnet run" 2>/dev/null && print_success "Backend stopped" || print_warning "Backend was not running"

    # Stop Frontend
    print_info "Stopping Frontend..."
    pkill -f "vite" 2>/dev/null && print_success "Frontend stopped" || print_warning "Frontend was not running"

    # Stop Docker services
    print_info "Stopping Docker services..."
    cd "$PROJECT_ROOT"
    docker compose down
    print_success "Docker services stopped"

    echo ""
    print_success "All services stopped"
}

# ============================================
# Restart Services
# ============================================

restart_all() {
    print_header "Restarting All Services"
    stop_all
    sleep 2
    start_all
}

restart_backend() {
    print_header "Restarting Backend"

    print_info "Stopping Backend..."
    pkill -f "dotnet run" 2>/dev/null && print_success "Backend stopped" || print_warning "Backend was not running"

    sleep 2

    print_info "Starting Backend..."
    cd "$BACKEND_DIR"
    ASPNETCORE_ENVIRONMENT=Development nohup dotnet run > "$BACKEND_LOG" 2>&1 &
    sleep 3

    if pgrep -f "dotnet run" > /dev/null; then
        print_success "Backend restarted (PID: $(pgrep -f 'dotnet run'))"
    else
        print_error "Backend failed to start. Check logs: $BACKEND_LOG"
        return 1
    fi
}

restart_frontend() {
    print_header "Restarting Frontend"

    print_info "Stopping Frontend..."
    pkill -f "vite" 2>/dev/null && print_success "Frontend stopped" || print_warning "Frontend was not running"

    sleep 2

    print_info "Starting Frontend..."
    cd "$FRONTEND_DIR"
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    sleep 3

    if pgrep -f "vite" > /dev/null; then
        print_success "Frontend restarted (PID: $(pgrep -f 'vite'))"
    else
        print_error "Frontend failed to start. Check logs: $FRONTEND_LOG"
        return 1
    fi
}

# ============================================
# Logs
# ============================================

show_logs() {
    print_header "Service Logs"

    echo ""
    echo "1) Backend logs"
    echo "2) Frontend logs"
    echo "3) Docker logs (Postgres)"
    echo "4) Docker logs (RabbitMQ)"
    echo "5) Docker logs (Redis)"
    echo "6) All logs (parallel)"
    echo ""
    read -p "Select option (1-6): " choice

    case $choice in
        1)
            print_info "Backend logs (Ctrl+C to exit):"
            tail -f "$BACKEND_LOG"
            ;;
        2)
            print_info "Frontend logs (Ctrl+C to exit):"
            tail -f "$FRONTEND_LOG"
            ;;
        3)
            docker compose logs -f postgres
            ;;
        4)
            docker compose logs -f rabbitmq
            ;;
        5)
            docker compose logs -f redis
            ;;
        6)
            print_info "Showing all logs (Ctrl+C to exit):"
            tail -f "$BACKEND_LOG" "$FRONTEND_LOG" &
            docker compose logs -f
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac
}

# ============================================
# Quick Commands
# ============================================

test_api() {
    print_header "Testing APIs"

    echo ""
    print_info "Testing Health endpoint..."
    curl -s http://localhost:5000/health && echo "" || print_error "Health check failed"

    echo ""
    print_info "Testing Products API..."
    curl -s http://localhost:5000/api/catalog/products | jq '.' || print_error "Products API failed"

    echo ""
    print_info "Testing Categories API..."
    curl -s http://localhost:5000/api/catalog/categories | jq '.' || print_error "Categories API failed"
}

open_browser() {
    print_info "Opening browser..."
    xdg-open http://localhost:5173 2>/dev/null || \
    open http://localhost:5173 2>/dev/null || \
    print_warning "Could not open browser automatically. Visit: http://localhost:5173"
}

# ============================================
# Main Menu
# ============================================

show_menu() {
    clear
    print_header "Quang Hương Computer - System Manager"
    echo ""
    echo "1)  🚀 Start all services"
    echo "2)  🛑 Stop all services"
    echo "3)  🔄 Restart all services"
    echo "4)  🔄 Restart backend only"
    echo "5)  🔄 Restart frontend only"
    echo "6)  📊 Check status"
    echo "7)  📝 View logs"
    echo "8)  🧪 Test APIs"
    echo "9)  🌐 Open in browser"
    echo "10) 🗄️  Database tools"
    echo "0)  ❌ Exit"
    echo ""
}

database_menu() {
    clear
    print_header "Database Tools"
    echo ""
    echo "1) Open PostgreSQL shell"
    echo "2) Reset database"
    echo "3) Run migrations"
    echo "4) Backup database"
    echo "0) Back to main menu"
    echo ""
    read -p "Select option: " db_choice

    case $db_choice in
        1)
            docker exec -it quanghuong-postgres psql -U postgres -d quanghuongdb
            ;;
        2)
            read -p "Are you sure? This will delete all data (y/N): " confirm
            if [ "$confirm" = "y" ]; then
                print_warning "Resetting database..."
                docker exec quanghuong-postgres psql -U postgres -c "DROP DATABASE IF EXISTS quanghuongdb;"
                docker exec quanghuong-postgres psql -U postgres -c "CREATE DATABASE quanghuongdb;"
                print_success "Database reset. Restart backend to run migrations."
            fi
            ;;
        3)
            print_info "Migrations run automatically on backend startup"
            ;;
        4)
            BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
            docker exec quanghuong-postgres pg_dump -U postgres quanghuongdb > "$BACKUP_FILE"
            print_success "Database backed up to: $BACKUP_FILE"
            ;;
    esac
}

# ============================================
# Main
# ============================================

# Handle command line arguments
if [ $# -gt 0 ]; then
    case $1 in
        start)
            start_all
            ;;
        stop)
            stop_all
            ;;
        restart)
            restart_all
            ;;
        status)
            check_status
            ;;
        logs)
            show_logs
            ;;
        test)
            test_api
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|status|logs|test}"
            exit 1
            ;;
    esac
    exit 0
fi

# Interactive menu
while true; do
    show_menu
    read -p "Select option: " choice

    case $choice in
        1) start_all ;;
        2) stop_all ;;
        3) restart_all ;;
        4) restart_backend ;;
        5) restart_frontend ;;
        6) check_status ;;
        7) show_logs ;;
        8) test_api ;;
        9) open_browser ;;
        10) database_menu ;;
        0)
            print_info "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac

    echo ""
    read -p "Press Enter to continue..."
done
