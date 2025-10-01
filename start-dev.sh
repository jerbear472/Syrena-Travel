#!/bin/bash

echo "🚀 Starting Syrena Travel Development Environment..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "⏹ Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Start backend server
echo "📦 Starting backend server..."
cd api
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo "🎨 Starting frontend server..."
cd web
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Development servers are running!"
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5001"
echo "📊 API Health Check: http://localhost:5001/health"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Keep script running
wait