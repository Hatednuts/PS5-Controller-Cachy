#!/bin/bash

# Navigate to the app directory (assuming it's installed in a specific path)
# You should update this path if you move the folder
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$APP_DIR"

# Start the server in the background
npm run start &
SERVER_PID=$!

# Wait a moment for the server to initialize
sleep 2

# Open the app in the default browser
# On Wayland/CachyOS, 'xdg-open' is the standard way
xdg-open "http://localhost:36364"

# Keep the script running to keep the server alive
# When the terminal/process is closed, kill the server
trap "kill $SERVER_PID" EXIT
wait $SERVER_PID
