#!/bin/bash

# Quick status check for Quang Hương Computer

echo "🔍 Quang Hương Computer - Quick Status Check"
echo "=============================================="
echo ""

# Check Docker
echo "📦 Docker Services:"
docker compose ps 2>/dev/null | grep -E "postgres|rabbitmq|redis" | awk '{print "  " $1 ": " $7}'
echo ""

# Check Backend
echo "🌐 Backend API:"
if pgrep -f "dotnet run" > /dev/null; then
    echo "  ✅ Running (PID: $(pgrep -f 'dotnet run'))"
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo "  ✅ Health: OK"
    else
        echo "  ❌ Health: Not responding"
    fi
else
    echo "  ❌ Not running"
fi
echo ""

# Check Frontend
echo "⚛️  Frontend:"
if pgrep -f "vite" > /dev/null; then
    echo "  ✅ Running (PID: $(pgrep -f 'vite'))"
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "  ✅ Server: Responding"
    else
        echo "  ❌ Server: Not responding"
    fi
else
    echo "  ❌ Not running"
fi
echo ""

# URLs
echo "🔗 Access URLs:"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:5000"
echo "  RabbitMQ:  http://localhost:15672"
echo ""

# Quick test
echo "🧪 Quick API Test:"
PRODUCTS=$(curl -s http://localhost:5000/api/catalog/products 2>/dev/null | jq -r '.total' 2>/dev/null)
if [ "$PRODUCTS" != "" ]; then
    echo "  ✅ Products API: $PRODUCTS products"
else
    echo "  ❌ Products API: Failed"
fi
echo ""

echo "💡 Tips:"
echo "  • Use './manage.sh' for full management interface"
echo "  • Use './manage.sh status' for detailed status"
echo "  • Use './manage.sh logs' to view logs"
