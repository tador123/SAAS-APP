#!/bin/bash
set -e

APP_DIR="/opt/hotelsaas"
EC2_HOST=$(curl -s http://169.254.169.254/latest/meta-data/public-hostname 2>/dev/null || echo "localhost")

echo "=== Pulling latest code ==="
cd "$APP_DIR"
git pull origin main

echo "=== Installing backend dependencies ==="
cd "$APP_DIR/backend"
npm install --omit=dev

echo "=== Creating backend .env ==="
cat > "$APP_DIR/backend/.env" << 'ENVFILE'
NODE_ENV=production
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=hotelrestaurant
DB_USER=postgres
DB_PASSWORD=postgres123
JWT_SECRET=hotelsaas-jwt-secret-ec2-production-2026
JWT_REFRESH_SECRET=hotelsaas-refresh-secret-ec2-production-2026
SEED_DB=true
CORS_ORIGINS=*
ENVFILE

echo "=== Running database migrations ==="
cd "$APP_DIR/backend"
node src/scripts/migrate.js 2>&1 || echo "Migrations may have already run"

echo "=== Starting backend with PM2 ==="
pm2 delete hotel-backend 2>/dev/null || true
cd "$APP_DIR/backend"
pm2 start src/index.js --name hotel-backend --env production
pm2 save

echo "=== Waiting for backend to start ==="
sleep 5
curl -sf http://127.0.0.1:3000/api/health && echo " Backend is healthy!" || echo " Backend health check pending..."

echo "=== Building web admin ==="
cd "$APP_DIR/web-admin"
npm install
npm run build

echo "=== Configuring Nginx ==="
sudo tee /etc/nginx/conf.d/hotelsaas.conf > /dev/null << 'NGINXCONF'
upstream backend_api {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location /api/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /socket.io/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /opt/hotelsaas/web-admin/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /opt/hotelsaas/web-admin/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
NGINXCONF

# Remove default nginx page if it exists
sudo rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "=== Setting up PM2 startup ==="
pm2 startup systemd -u ec2-user --hp /home/ec2-user 2>&1 | grep "sudo" | bash 2>/dev/null || true
pm2 save

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "  URL: http://$EC2_HOST"
echo "========================================="
echo ""

# Final health check
sleep 2
curl -sf http://127.0.0.1:3000/api/health && echo "Backend: OK" || echo "Backend: Starting..."
curl -sf -o /dev/null -w "Nginx: HTTP %{http_code}\n" http://127.0.0.1:80/ || echo "Nginx: Starting..."
