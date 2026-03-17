#!/bin/bash
set -e

echo "=== Setting up PostgreSQL ==="

# Configure pg_hba.conf to allow password auth locally
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | xargs)
echo "pg_hba.conf location: $PG_HBA"

# Backup original
sudo cp "$PG_HBA" "${PG_HBA}.bak"

# Replace ident with md5 for local connections
sudo sed -i 's/ident$/md5/g' "$PG_HBA"
sudo sed -i 's/peer$/md5/g' "$PG_HBA"

# Reload PostgreSQL to apply auth changes
sudo systemctl reload postgresql

# Set password and create database
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres123';"
sudo -u postgres psql -c "CREATE DATABASE hotelrestaurant OWNER postgres;" 2>/dev/null || echo "Database may already exist"

echo "=== PostgreSQL configured ==="

echo "=== Setting up application directory ==="
sudo mkdir -p /opt/hotelsaas
sudo chown ec2-user:ec2-user /opt/hotelsaas

echo "=== Installing PM2 globally ==="
sudo npm install -g pm2

echo "=== Setup complete ==="
