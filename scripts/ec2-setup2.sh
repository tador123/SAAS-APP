#!/bin/bash
set -e

echo "=== Setting up PostgreSQL ==="

# Set password FIRST while peer auth is still active
cd /tmp
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres123';"
sudo -u postgres psql -c "CREATE DATABASE hotelrestaurant OWNER postgres;" 2>/dev/null || echo "Database may already exist"

# Now configure pg_hba.conf to allow password auth
PG_HBA="/var/lib/pgsql/data/pg_hba.conf"
echo "pg_hba.conf: $PG_HBA"

# Backup original
sudo cp "$PG_HBA" "${PG_HBA}.bak2"

# Replace ident/peer with md5 for local connections
sudo sed -i 's/ident$/md5/g' "$PG_HBA"
sudo sed -i 's/peer$/trust/g' "$PG_HBA"

# Add a line for TCP/IP local connections if not already there
if ! grep -q "host.*all.*all.*127.0.0.1/32.*md5" "$PG_HBA"; then
    echo "host    all             all             127.0.0.1/32            md5" | sudo tee -a "$PG_HBA"
fi

# Reload PostgreSQL to apply auth changes
sudo systemctl reload postgresql

# Verify connection works
PGPASSWORD=postgres123 psql -h 127.0.0.1 -U postgres -d hotelrestaurant -c "SELECT 1 AS connection_test;"
echo "=== PostgreSQL configured ==="

echo "=== Setting up application directory ==="
sudo mkdir -p /opt/hotelsaas
sudo chown ec2-user:ec2-user /opt/hotelsaas

echo "=== Installing PM2 globally ==="
sudo npm install -g pm2 2>&1 | tail -3

echo "=== Setup complete ==="
