#!/bin/bash
# Simple script to start the local web server

echo "Starting NASA Gigapixel Explorer..."
echo "Open your browser to: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

cd app
python3 -m http.server 8000
