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

# save cartesi-drand to a variable
CARTESI_DRAND= $(pwd)/target/debug/cartesi-drand

# Start drand middleware. If configured, it will run in background, if not, it will run in foreground.
echo "Starting drand middleware..."
# Check env variable to see if DRAND_BACKGROUND is set to true to run in background
if [ "$DRAND_BACKGROUND" = "true" ]; then
    $CARTESI_DRAND &

    # Wait until the service is available
    echo "Waiting for drand service to be available..."
    while ! nc -z 127.0.0.1 3000; do   
      echo "Waiting for port 3000..."
      sleep 1
    done
    echo "Drand service is up"

    # Start the Node.js application
    # echo "Starting Node.js application..."
    # node index.js
else
    $CARTESI_DRAND 
fi

