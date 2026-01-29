#!/bin/bash

# DuckDNS Auto-Update Script
# This script updates your DuckDNS domain with the current public IP

# Configuration
DOMAIN="YOUR_SUBDOMAIN"  # Change this to your subdomain (without .duckdns.org)
TOKEN="YOUR_TOKEN"       # Change this to your DuckDNS token
LOG_FILE="$HOME/duckdns.log"

# Update DuckDNS
echo url="https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=" | curl -k -o $LOG_FILE -K -

# Log timestamp
echo "$(date): $(cat $LOG_FILE)" >> $HOME/duckdns-history.log

# Check if update was successful
if grep -q "OK" $LOG_FILE; then
    echo "✓ DuckDNS updated successfully"
else
    echo "✗ DuckDNS update failed"
    exit 1
fi
