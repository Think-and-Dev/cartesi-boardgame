#!/bin/bash
set -x  # Show all commands that are executed

# Show current directory and files for debug
echo "Current directory: $(pwd)"
ls -la

# Show versions and configuration
echo "Node version: $(node --version)"
echo "Environment variables:"
env | grep -E 'RUST_|ROLLUP_|DRAND_'

export RUST_LOG=debug,actix_web::middleware::Logger=debug
export SLOG_LEVEL=debug

# save cartesi-drand to a variable
CARTESI_DRAND=$(pwd)/cartesi-drand

# Start drand middleware. If configured, it will run in background, if not, it will run in foreground.
echo "Starting drand middleware..."
# Check env variable to see if DRAND_BACKGROUND is set to true to run in background
ROLLUP_HTTP_SERVER_URL=http://127.0.0.1:5004 SLOG_LEVEL=debug $CARTESI_DRAND &
#ROLLUP_HTTP_SERVER_URL=\"http://127.0.0.1:5004\" $CARTESI_DRAND > drand-middleware.log 2>&1 &

echo "Waiting for drand service to be available..."
while ! nc -z 127.0.0.1 3000; do 
    echo "Waiting for port 3000..." 
    sleep 1 
done 
echo "Drand service is up"

# Start the server application detached from the terminal
echo "Starting server application..."
npm run start-server-drand
