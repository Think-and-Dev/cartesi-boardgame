#!/bin/bash
set -x  # Show all commands that are executed

# Show current directory and files for debug
echo "Current directory: $(pwd)"
ls -la

cargo build



