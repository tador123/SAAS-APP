# AWS Free Tier Architecture — HotelSaaS

**Date:** March 10, 2026  
**Estimated Monthly Cost:** $0 – $5 (within Free Tier limits, 12-month eligibility)  
**Target:** ≤ 5 properties, ≤ 50 concurrent users, ≤ 1,000 API requests/minute

---

## Architecture Overview

```
                          ┌─────────────────────────────────┐
                          │          Route 53 (DNS)         │
                          │     hotelsaas.yourdomain.com    │
                          └──────────────┬──────────────────┘
                                         │
                          ┌──────────────▼──────────────────┐
                          │     CloudFront (CDN + SSL)      │
                          │   ACM Certificate (free TLS)    │
                          └──────┬───────────────┬──────────┘
                                 │               │
                    ┌────────────▼───┐   ┌───────▼────────────┐
                    │  S3 Bucket     │   │  EC2 t2.micro       │
                    │  (Static SPA)  │   │  (API + WebSocket)  │
                    │  Web Admin     │   │                     │
                    │  Mobile Web    │   │  ┌───────────────┐  │
                    └────────────────┘   │  │  Nginx (rev   │  │
                                         │  │  proxy + gzip)│  │
                                         │  └───────┬───────┘  │
                                         │          │          │
                                         │  ┌───────▼───────┐  │
                                         │  │  Node.js      │  │
                                         │  │  Express API  │  │
                                         │  │  Socket.io    │  │
                                         │  └───────┬───────┘  │
                                         └──────────┼──────────┘
                                                    │
                            ┌───────────────────────┼───────────────┐
                            │                       │               │
                   ┌────────▼─────────┐   ┌────────▼─────┐  ┌──────▼──────┐
                   │  RDS db.t3.micro │   │  SES (Email) │  │  S3 Bucket  │
                   │  PostgreSQL 15   │   │  SMTP relay  │  │  (Uploads)  │
                   │  20GB SSD        │   │  62k/month   │  │  5GB free   │
                   │  Auto. backups   │   └──────────────┘  └─────────────┘
                   └──────────────────┘
```

---

## AWS Free Tier Services Used

| Service | Free Tier Allowance | Our Usage | Fits? |
|---------|-------------------|-----------|-------|
| **EC2 t2.micro** | 750 hrs/month (1 vCPU, 1GB RAM) | API server + Nginx, 24/7 | ✅ Yes |
| **RDS db.t3.micro** | 750 hrs/month, 20GB SSD | PostgreSQL 15, 24/7 | ✅ Yes |
| **S3** | 5GB storage, 20k GET, 2k PUT/month | Static SPA + uploads | ✅ Yes |
| **CloudFront** | 1TB transfer out, 10M requests/month | CDN + SSL termination | ✅ Yes |
| **ACM** | Unlimited free certificates | TLS for domain | ✅ Yes |
| **SES** | 62,000 emails/month (from EC2) | Reservation/checkout emails | ✅ Yes |
| **Route 53** | NOT free — $0.50/hosted zone/month | DNS management | ⚠️ $0.50/mo |
| **EBS** | 30GB gp3/month | EC2 root volume (20GB) | ✅ Yes |
| **Elastic IP** | 1 free (when attached to running instance) | Static IP for EC2 | ✅ Yes |

> **Note:** Free Tier eligibility lasts 12 months from account creation. After that, expect ~$15–25/month for the same setup on-demand, or use Reserved Instances for ~$8/month.

---

## Service Configuration Details

### 1. EC2 Instance (t2.micro)

**Purpose:** Runs the Node.js backend API + Nginx reverse proxy  
**OS:** Amazon Linux 2023 or Ubuntu 22.04 LTS  
**Memory strategy:** ~200MB Nginx + Node.js, ~300MB OS overhead ≈ 500MB used / 1GB available

```
┌─────────────────── EC2 t2.micro ───────────────────┐
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │  Nginx (port 80/443)                       │     │
│  │  • Reverse proxy → localhost:3000           │     │
│  │  • Gzip compression                        │     │
│  │  • Security headers                        │     │
│  │  • WebSocket upgrade (/socket.io/)         │     │
│  └─────────────┬──────────────────────────────┘     │
│                │                                    │
│  ┌─────────────▼──────────────────────────────┐     │
│  │  Node.js (PM2 managed, port 3000)          │     │
│  │  • Express API                             │     │
│  │  • Socket.io (WebSocket)                   │     │
│  │  • In-memory cache (no Redis needed)       │     │
│  │  • Winston file logging                    │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  crontab:                                           │
│  • Log rotation (logrotate.d)                       │
│  • Optional: pg_dump to S3 (daily)                  │
└─────────────────────────────────────────────────────┘
```

> **Why no Docker on EC2?** The t2.micro has only 1GB RAM. Docker overhead (~100MB daemon + per-container overhead) wastes precious memory. Running Node.js and Nginx natively is more efficient for this tier.

> **Why no Redis?** The app already has an in-memory cache fallback. For ≤50 concurrent users, in-memory cache is sufficient and saves ~100MB RAM. Add ElastiCache later when you scale.

**Key settings:**
- `NODE_ENV=production`
- PM2 with `--max-memory-restart 700M` (safety net)
- Swap file: 1GB (safety for memory spikes)
- Security Group: inbound 80, 443, 22 (your IP only)

---

### 2. RDS PostgreSQL (db.t3.micro)

**Purpose:** Managed PostgreSQL database with automated backups  
**Engine:** PostgreSQL 15  
**Storage:** 20GB gp2 (free tier allows up to 20GB)

**Why RDS instead of PostgreSQL on EC2?**
- Automated daily backups (7-day retention, free)
- Automatic minor version patches
- Monitoring via CloudWatch (free basic metrics)
- Point-in-time recovery
- Frees EC2 RAM for the application

**Configuration:**
```
Engine:              PostgreSQL 15
Instance class:      db.t3.micro (1 vCPU, 1GB RAM)
Storage:             20GB gp2 (general purpose SSD)
Multi-AZ:            No (free tier = single AZ)
Backup retention:    7 days (free)
Public access:       No (private subnet)
Security Group:      Allow inbound 5432 from EC2 SG only
Encryption:          Yes (AWS managed key, free)
```

**Connection from backend:**
```env
DB_HOST=hotelsaas-db.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=hotelrestaurant
DB_USER=hotelsaas_admin
DB_PASSWORD=<strong-generated-password>
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

---

### 3. S3 + CloudFront (Static Hosting + CDN)

**Purpose:** Host web-admin SPA + mobile web build + file uploads + SSL termination

#### S3 Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `hotelsaas-web` | Web-admin React SPA build (`dist/`) | CloudFront OAI only |
| `hotelsaas-uploads` | Guest photos, invoices, receipts | Signed URLs via API |

#### CloudFront Distribution

```
Distribution 1 — hotelsaas.yourdomain.com
├── Behavior: /api/*  → EC2 origin (Elastic IP:80)
│   ├── Cache Policy: CachingDisabled
│   ├── Origin Request: AllViewer
│   └── WebSocket: Allowed (Upgrade header forwarded)
│
├── Behavior: /socket.io/* → EC2 origin (Elastic IP:80)
│   ├── Cache Policy: CachingDisabled
│   └── WebSocket: Allowed
│
└── Behavior: Default (*) → S3 origin (hotelsaas-web)
    ├── Cache Policy: CachingOptimized (TTL 24h)
    ├── Error pages: 403/404 → /index.html (SPA routing)
    └── Compress: Yes (gzip + brotli)
```

**SSL:** ACM certificate for `*.yourdomain.com` attached to CloudFront (free, auto-renewing).

This means:
- `https://hotelsaas.yourdomain.com/` → serves React SPA from S3
- `https://hotelsaas.yourdomain.com/api/*` → proxies to EC2 backend
- `https://hotelsaas.yourdomain.com/socket.io/*` → WebSocket to EC2

> **Single domain, zero CORS issues.** Everything served from one CloudFront distribution.

---

### 4. SES (Email)

**Purpose:** Transactional emails (reservation confirmation, checkout summary, password reset)

**Setup:**
1. Verify your domain in SES
2. Request production access (moves out of sandbox)
3. Configure SMTP credentials

**Backend .env:**
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=<SES-SMTP-username>
EMAIL_PASS=<SES-SMTP-password>
EMAIL_FROM=noreply@yourdomain.com
```

**Free Tier:** 62,000 emails/month when sent from EC2. More than enough for a starting SaaS.

---

### 5. Route 53 (DNS)

**Purpose:** DNS management for your domain

**Records:**
| Type | Name | Value |
|------|------|-------|
| A | hotelsaas.yourdomain.com | CloudFront distribution (Alias) |
| CNAME | _acme.hotelsaas.yourdomain.com | ACM validation |
| MX | yourdomain.com | SES inbound (optional) |
| TXT | _dmarc.yourdomain.com | DMARC policy |
| TXT | yourdomain.com | SPF: `v=spf1 include:amazonses.com ~all` |

> **Cost:** $0.50/month per hosted zone (only non-free item). Alternatively, use your domain registrar's DNS for free and point an A record to the Elastic IP.

---

## Network Architecture

```
┌─────────────────── VPC (10.0.0.0/16) ─────────────────────┐
│                                                            │
│  ┌──────── Public Subnet (10.0.1.0/24) ───────────┐       │
│  │                                                 │       │
│  │  ┌─────────────────┐    ┌──────────────────┐    │       │
│  │  │  EC2 t2.micro   │    │  NAT Gateway     │    │       │
│  │  │  Elastic IP     │    │  (not needed —   │    │       │
│  │  │  SG: 80,443,22  │    │   EC2 is public) │    │       │
│  │  └────────┬────────┘    └──────────────────┘    │       │
│  │           │                                     │       │
│  └───────────┼─────────────────────────────────────┘       │
│              │   Port 5432                                 │
│  ┌───────────▼─── Private Subnet (10.0.2.0/24) ───┐       │
│  │                                                 │       │
│  │  ┌─────────────────┐                            │       │
│  │  │  RDS db.t3.micro│                            │       │
│  │  │  PostgreSQL 15  │                            │       │
│  │  │  SG: 5432 from  │                            │       │
│  │  │  EC2 SG only    │                            │       │
│  │  └─────────────────┘                            │       │
│  │                                                 │       │
│  └─────────────────────────────────────────────────┘       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Security Groups:**

| SG Name | Inbound Rules |
|---------|---------------|
| `sg-ec2-web` | 80 from CloudFront prefix list; 443 from CloudFront; 22 from your IP |
| `sg-rds-db` | 5432 from `sg-ec2-web` only |

---

## Deployment Steps

### Step 1: AWS Account Setup (15 min)

```bash
# Install AWS CLI
# Configure credentials
aws configure
# Set default region (us-east-1 has broadest Free Tier support)
```

### Step 2: VPC + Networking (20 min)

```bash
# Create VPC with public + private subnets
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=hotelsaas-vpc}]'

# Create public subnet (for EC2)
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.1.0/24 --availability-zone us-east-1a

# Create private subnet (for RDS — need 2 AZs for DB subnet group)
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.2.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.3.0/24 --availability-zone us-east-1b

# Internet Gateway + Route Table for public subnet
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --vpc-id <vpc-id> --internet-gateway-id <igw-id>
```

### Step 3: RDS PostgreSQL (15 min)

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name hotelsaas-db-subnet \
  --db-subnet-group-description "HotelSaaS DB subnets" \
  --subnet-ids <private-subnet-1> <private-subnet-2>

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier hotelsaas-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username hotelsaas_admin \
  --master-user-password '<strong-password>' \
  --allocated-storage 20 \
  --db-name hotelrestaurant \
  --vpc-security-group-ids <sg-rds-db> \
  --db-subnet-group-name hotelsaas-db-subnet \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --storage-encrypted
```

### Step 4: EC2 Instance (20 min)

```bash
# Launch EC2
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \  # Amazon Linux 2023 us-east-1
  --instance-type t2.micro \
  --key-name hotelsaas-key \
  --security-group-ids <sg-ec2-web> \
  --subnet-id <public-subnet> \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]'

# Allocate and associate Elastic IP
aws ec2 allocate-address --domain vpc
aws ec2 associate-address --instance-id <i-xxx> --allocation-id <eipalloc-xxx>
```

**EC2 User Data / Setup Script:**

```bash
#!/bin/bash
set -e

# --- System setup ---
sudo dnf update -y
sudo dnf install -y nginx git

# --- Node.js 20 LTS ---
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# --- PM2 (process manager) ---
sudo npm install -g pm2

# --- Swap file (1GB safety net for memory spikes) ---
sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# --- App deployment ---
sudo mkdir -p /opt/hotelsaas
sudo chown ec2-user:ec2-user /opt/hotelsaas
cd /opt/hotelsaas

git clone https://github.com/yourorg/hotelsaas.git .
cd backend
npm install --omit=dev

# --- Environment ---
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DB_HOST=hotelsaas-db.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=hotelrestaurant
DB_USER=hotelsaas_admin
DB_PASSWORD=<rds-password>
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=<64-byte-hex-secret>
CORS_ORIGINS=https://hotelsaas.yourdomain.com
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=<ses-smtp-user>
EMAIL_PASS=<ses-smtp-pass>
EMAIL_FROM=noreply@yourdomain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
EOF

# --- Run migrations ---
npm run migrate

# --- Seed initial data (first time ONLY) ---
# SEED_DB=true node src/seeders/seed.js

# --- PM2 start ---
pm2 start src/index.js --name hotelsaas-api --max-memory-restart 700M
pm2 save
pm2 startup

# --- Nginx config ---
sudo tee /etc/nginx/conf.d/hotelsaas.conf << 'NGINX'
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
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

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
    }

    location /socket.io/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    location / {
        return 404;
    }
}
NGINX

sudo nginx -t && sudo systemctl enable nginx && sudo systemctl restart nginx
```

### Step 5: S3 + CloudFront for Web Admin (15 min)

```bash
# Create S3 bucket for static SPA
aws s3 mb s3://hotelsaas-web-<account-id> --region us-east-1

# Build web-admin locally
cd web-admin
npm run build

# Upload to S3
aws s3 sync dist/ s3://hotelsaas-web-<account-id>/ \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

aws s3 cp dist/index.html s3://hotelsaas-web-<account-id>/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# Create CloudFront distribution (see AWS Console for easier setup)
# - Origin 1: S3 bucket (with OAI)
# - Origin 2: EC2 Elastic IP (custom origin, HTTP port 80)
# - Behavior: /api/* → EC2, /socket.io/* → EC2, Default → S3
# - SSL: ACM certificate
# - Custom error response: 403 → /index.html (200) for SPA routing
```

### Step 6: SES Email Setup (10 min)

```bash
# Verify domain
aws ses verify-domain-identity --domain yourdomain.com

# Add DNS TXT record from output ^
# Request production access via AWS Console → SES → Account Dashboard
# Create SMTP credentials via AWS Console → SES → SMTP Settings
```

### Step 7: First Run (5 min)

```bash
# SSH into EC2
ssh -i hotelsaas-key.pem ec2-user@<elastic-ip>

# Run migrations
cd /opt/hotelsaas/backend
npm run migrate

# Seed demo data (first time only)
SEED_DB=true node src/seeders/seed.js

# Verify
curl http://localhost:3000/api/health
# → {"status":"ok","db":"connected"}
```

---

## Memory Budget (t2.micro — 1GB RAM)

| Component | Estimated RAM |
|-----------|--------------|
| Amazon Linux 2023 OS | ~150 MB |
| Nginx | ~20 MB |
| Node.js (Express + Socket.io) | ~150 MB |
| PM2 daemon | ~30 MB |
| **Subtotal (used)** | **~350 MB** |
| **Buffer available** | **~650 MB** |
| Swap file (overflow safety) | 1 GB |

> Comfortable headroom. The app uses in-memory cache (maps/objects), not Redis, so no additional memory for a cache daemon. Under load, Node.js may grow to ~300MB — still well within limits with swap available.

---

## Scaling Path (When You Outgrow Free Tier)

```
Phase 1: Free Tier (0-5 properties, ~$0/mo)
  └── EC2 t2.micro + RDS db.t3.micro + S3/CloudFront

Phase 2: Small Growth (5-25 properties, ~$25/mo)
  └── EC2 t3.small (2GB RAM) + RDS db.t3.small
  └── Add ElastiCache t3.micro (Redis)
  └── Enable RDS Multi-AZ

Phase 3: Production Scale (25-100 properties, ~$80/mo)
  └── EC2 t3.medium (4GB RAM) or ECS Fargate
  └── RDS db.t3.medium + Read Replica
  └── ElastiCache t3.small (Redis cluster)
  └── ALB (Application Load Balancer)

Phase 4: Enterprise (100+ properties, ~$200+/mo)
  └── ECS Fargate (auto-scaling containers)
  └── RDS db.r6g.large + Multi-AZ + Read Replicas
  └── ElastiCache cluster mode
  └── WAF + Shield
  └── Aurora PostgreSQL (if needed)
```

---

## CI/CD Pipeline (GitHub Actions → EC2)

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: hotelrestaurant_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: testpass
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Backend tests
        working-directory: backend
        run: |
          npm ci
          npm test
        env:
          DB_HOST: localhost
          DB_NAME: hotelrestaurant_test
          DB_USER: postgres
          DB_PASSWORD: testpass
          JWT_SECRET: test-secret-key

      - name: Web admin tests + build
        working-directory: web-admin
        run: |
          npm ci
          npx vitest run
          npm run build

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /opt/hotelsaas
            git pull origin main
            cd backend
            npm install --omit=dev
            npm run migrate
            pm2 restart hotelsaas-api

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Build web-admin
        working-directory: web-admin
        run: |
          npm ci
          npm run build
      - name: Sync to S3
        uses: jakejarvis/s3-sync-action@v0.5.1
        with:
          args: --cache-control "public, max-age=31536000, immutable" --exclude "index.html"
        env:
          AWS_S3_BUCKET: ${{ secrets.S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SOURCE_DIR: web-admin/dist
      - name: Upload index.html (no-cache)
        run: |
          aws s3 cp web-admin/dist/index.html s3://${{ secrets.S3_BUCKET }}/index.html \
            --cache-control "no-cache, no-store, must-revalidate"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} \
            --paths "/index.html"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## Automated Backups

Even though RDS handles daily snapshots, add an extra pg_dump to S3 for safety:

```bash
# /opt/hotelsaas/scripts/backup.sh
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/hotelsaas_${TIMESTAMP}.sql.gz"
S3_BUCKET="hotelsaas-backups-<account-id>"

# Dump and compress
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges | gzip > "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/daily/${TIMESTAMP}.sql.gz"

# Cleanup local
rm -f "$BACKUP_FILE"

# Cleanup old S3 backups (keep 30 days)
aws s3 ls "s3://${S3_BUCKET}/daily/" | \
  awk '{print $4}' | \
  sort | head -n -30 | \
  xargs -I {} aws s3 rm "s3://${S3_BUCKET}/daily/{}"

echo "Backup completed: ${TIMESTAMP}"
```

```bash
# Crontab — daily at 3 AM UTC
0 3 * * * /opt/hotelsaas/scripts/backup.sh >> /var/log/hotelsaas-backup.log 2>&1
```

---

## Monitoring (Free)

| Tool | What It Monitors | Cost |
|------|-----------------|------|
| **CloudWatch Basic** | EC2 CPU, RDS metrics, S3 requests | Free (5-min intervals) |
| **CloudWatch Alarms** | CPU > 80%, RDS storage < 2GB, health check fail | Free (up to 10 alarms) |
| **PM2 Monitoring** | Node.js memory, restart count, error logs | Free (pm2 monit) |
| **UptimeRobot** | HTTPS health check every 5 min | Free plan |

**Recommended CloudWatch Alarms:**

```bash
# EC2 CPU > 80% for 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name "hotelsaas-cpu-high" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=<i-xxx> \
  --alarm-actions <sns-topic-arn>

# RDS free storage < 2GB
aws cloudwatch put-metric-alarm \
  --alarm-name "hotelsaas-rds-storage-low" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 2000000000 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=hotelsaas-db \
  --alarm-actions <sns-topic-arn>
```

---

## Security Checklist

- [ ] EC2 SSH key — restricted to your IP only (Security Group)
- [ ] RDS — not publicly accessible, SG allows only EC2
- [ ] S3 buckets — block public access, CloudFront OAI only
- [ ] Secrets stored in EC2 `.env` file (chmod 600) — NOT in git
- [ ] SES — production mode (out of sandbox), SPF/DKIM/DMARC configured
- [ ] CloudFront — TLS 1.2 minimum, HTTPS redirect
- [ ] IAM — no root account usage, least-privilege IAM user for CI/CD
- [ ] Enable CloudTrail (free for management events)
- [ ] Enable AWS Config basic rules (optional, free tier has 3 rules)

---

## Cost Summary

### During Free Tier (Months 1–12)

| Service | Monthly Cost |
|---------|-------------|
| EC2 t2.micro (750 hrs) | $0.00 |
| RDS db.t3.micro (750 hrs) | $0.00 |
| EBS 20GB gp3 | $0.00 |
| S3 (5GB) | $0.00 |
| CloudFront (1TB) | $0.00 |
| SES (62k emails) | $0.00 |
| Route 53 (1 zone) | $0.50 |
| **Total** | **~$0.50/month** |

### After Free Tier (Month 13+)

| Service | Monthly Cost |
|---------|-------------|
| EC2 t2.micro on-demand | $8.35 |
| RDS db.t3.micro on-demand | $12.41 |
| EBS 20GB gp3 | $1.60 |
| S3 | $0.12 |
| CloudFront | ~$1.00 |
| SES | ~$0.00 |
| Route 53 | $0.50 |
| **Total** | **~$24/month** |

> **Tip:** Purchase EC2 + RDS Reserved Instances (1-year, no upfront) to reduce to ~$14/month after Free Tier.

---

## Quick Start Summary

```bash
# 1. Create AWS account (free tier eligible)
# 2. Set up VPC with public + private subnets
# 3. Launch RDS db.t3.micro (PostgreSQL 15)
# 4. Launch EC2 t2.micro + Elastic IP + setup script
# 5. Create S3 bucket + build & upload web-admin
# 6. Create CloudFront distribution (S3 + EC2 origins, ACM cert)
# 7. Configure Route 53 (or registrar DNS) → CloudFront
# 8. Verify SES domain + create SMTP credentials
# 9. SSH into EC2 → run migrations → seed → verify health
# 10. Set up GitHub Actions CI/CD (optional but recommended)

# Total setup time: ~2 hours
# Monthly cost: ~$0.50 (Free Tier) → ~$24 (after 12 months)
```
