#!/bin/bash

# SSL Setup Script for Condominio API
# This script automates the SSL certificate generation process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Condominio API - SSL Setup ===${NC}\n"

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Domain name is required${NC}"
    echo "Usage: ./setup-ssl.sh your-domain.com your-email@example.com"
    exit 1
fi

if [ -z "$2" ]; then
    echo -e "${RED}Error: Email is required${NC}"
    echo "Usage: ./setup-ssl.sh your-domain.com your-email@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo -e "${YELLOW}Domain:${NC} $DOMAIN"
echo -e "${YELLOW}Email:${NC} $EMAIL\n"

# Update nginx configuration with domain
echo -e "${GREEN}[1/6]${NC} Updating Nginx configuration..."
sed -i "s/api.tudominio.com/$DOMAIN/g" nginx/nginx.conf
sed -i "s/api.tudominio.com/$DOMAIN/g" nginx/nginx-init.conf
echo -e "${GREEN}✓${NC} Nginx configuration updated\n"

# Create certbot directories
echo -e "${GREEN}[2/6]${NC} Creating certbot directories..."
mkdir -p certbot/conf certbot/www
echo -e "${GREEN}✓${NC} Directories created\n"

# Use initial nginx config
echo -e "${GREEN}[3/6]${NC} Setting up initial Nginx config..."
cp nginx/nginx.conf nginx/nginx.conf.backup
cp nginx/nginx-init.conf nginx/nginx.conf
echo -e "${GREEN}✓${NC} Initial config set\n"

# Start nginx
echo -e "${GREEN}[4/6]${NC} Starting Nginx..."
docker-compose -f docker-compose.prod.yml up -d nginx
sleep 5
echo -e "${GREEN}✓${NC} Nginx started\n"

# Obtain SSL certificate
echo -e "${GREEN}[5/6]${NC} Obtaining SSL certificate from Let's Encrypt..."
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} SSL certificate obtained successfully\n"
else
    echo -e "${RED}✗${NC} Failed to obtain SSL certificate"
    echo -e "${YELLOW}Restoring original configuration...${NC}"
    cp nginx/nginx.conf.backup nginx/nginx.conf
    docker-compose -f docker-compose.prod.yml down
    exit 1
fi

# Restore full nginx config
echo -e "${GREEN}[6/6]${NC} Applying full Nginx configuration..."
cp nginx/nginx.conf.backup nginx/nginx.conf
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓${NC} Full configuration applied\n"

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Test HTTPS
echo -e "\n${GREEN}=== Testing HTTPS ===${NC}"
if curl -f -s -o /dev/null https://$DOMAIN/health; then
    echo -e "${GREEN}✓${NC} HTTPS is working!"
    echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
    echo -e "Your API is now available at: ${GREEN}https://$DOMAIN${NC}"
    echo -e "Swagger UI: ${GREEN}https://$DOMAIN/swagger${NC}"
else
    echo -e "${YELLOW}⚠${NC} HTTPS test failed. Check logs with:"
    echo -e "  docker-compose -f docker-compose.prod.yml logs"
fi

echo -e "\n${YELLOW}Useful commands:${NC}"
echo -e "  View logs:     docker-compose -f docker-compose.prod.yml logs -f"
echo -e "  Restart:       docker-compose -f docker-compose.prod.yml restart"
echo -e "  Stop:          docker-compose -f docker-compose.prod.yml down"
echo -e "  Renew cert:    docker-compose -f docker-compose.prod.yml run --rm certbot renew"
