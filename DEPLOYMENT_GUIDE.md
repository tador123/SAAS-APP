# AWS Deployment Guide — HotelSaaS

**Step-by-step guide to deploy from zero to a running production app on AWS Free Tier.**  
**Estimated total time: 2–3 hours** | **Cost: ~$0.50/month (Route 53 only)**

> **Prerequisites:** An AWS account (free tier eligible), a registered domain name, and Git installed locally.

---

## Table of Contents

1. [Install AWS CLI & Configure Credentials](#step-1-install-aws-cli--configure-credentials)
2. [Create a Key Pair for SSH](#step-2-create-a-key-pair-for-ssh)
3. [Create a VPC with Subnets](#step-3-create-a-vpc-with-subnets)
4. [Create Security Groups](#step-4-create-security-groups)
5. [Launch RDS PostgreSQL](#step-5-launch-rds-postgresql)
6. [Launch EC2 Instance](#step-6-launch-ec2-instance)
7. [SSH into EC2 & Install Software](#step-7-ssh-into-ec2--install-software)
8. [Deploy Backend to EC2](#step-8-deploy-backend-to-ec2)
9. [Configure Nginx on EC2](#step-9-configure-nginx-on-ec2)
10. [Build & Deploy Web Admin to S3](#step-10-build--deploy-web-admin-to-s3)
11. [Set Up CloudFront (CDN + SSL)](#step-11-set-up-cloudfront-cdn--ssl)
12. [Configure DNS (Route 53 or Registrar)](#step-12-configure-dns)
13. [Set Up SES Email](#step-13-set-up-ses-email)
14. [Run Migrations & Seed Data](#step-14-run-migrations--seed-data)
15. [Verify Everything Works](#step-15-verify-everything-works)
16. [Set Up CI/CD (GitHub Actions)](#step-16-set-up-cicd-github-actions)
17. [Set Up Monitoring & Backups](#step-17-set-up-monitoring--backups)
18. [Post-Deployment Checklist](#step-18-post-deployment-checklist)

---

## Step 1: Install AWS CLI & Configure Credentials

### 1.1 Install AWS CLI

**Windows:**
```powershell
# Download and run the installer
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
# Verify
aws --version
```

**macOS:**
```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### 1.2 Create an IAM User (don't use root account)

1. Go to **AWS Console** → **IAM** → **Users** → **Create user**
2. Username: `hotelsaas-admin`
3. Check **"Provide user access to the AWS Management Console"**
4. Attach policies directly:
   - `AmazonEC2FullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `AmazonSESFullAccess`
   - `AmazonRoute53FullAccess` (if using Route 53)
5. Click **Create user**
6. Go to the user → **Security credentials** → **Create access key** → **CLI**
7. Save the **Access Key ID** and **Secret Access Key**

### 1.3 Configure CLI

```bash
aws configure
```
```
AWS Access Key ID: AKIA...............
AWS Secret Access Key: wJal...............
Default region name: us-east-1
Default output format: json
```

> **Why us-east-1?** Broadest free tier coverage, ACM certs must be in us-east-1 for CloudFront.

### 1.4 Verify

```bash
aws sts get-caller-identity
```
Should return your account ID and IAM user ARN.

---

## Step 2: Create a Key Pair for SSH

```bash
aws ec2 create-key-pair \
  --key-name hotelsaas-key \
  --query 'KeyMaterial' \
  --output text > hotelsaas-key.pem
```

**Set permissions (required for SSH):**
```bash
# Linux/macOS
chmod 400 hotelsaas-key.pem

# Windows PowerShell
icacls hotelsaas-key.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

> **Store this file safely.** You cannot download it again. If lost, you must create a new key pair.

---

## Step 3: Create a VPC with Subnets

### 3.1 Create VPC

```bash
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=hotelsaas-vpc}]' \
  --query 'Vpc.VpcId' --output text)

echo "VPC ID: $VPC_ID"
```

Enable DNS hostnames (needed for RDS):
```bash
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
```

### 3.2 Create Internet Gateway

```bash
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hotelsaas-igw}]' \
  --query 'InternetGateway.InternetGatewayId' --output text)

aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID
echo "IGW ID: $IGW_ID"
```

### 3.3 Create Subnets

```bash
# Public subnet (EC2 goes here)
PUBLIC_SUBNET=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hotelsaas-public-1a}]' \
  --query 'Subnet.SubnetId' --output text)

# Private subnet 1 (RDS)
PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hotelsaas-private-1a}]' \
  --query 'Subnet.SubnetId' --output text)

# Private subnet 2 (RDS requires 2 AZs for subnet group)
PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.3.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hotelsaas-private-1b}]' \
  --query 'Subnet.SubnetId' --output text)

echo "Public: $PUBLIC_SUBNET"
echo "Private 1: $PRIVATE_SUBNET_1"
echo "Private 2: $PRIVATE_SUBNET_2"
```

### 3.4 Create & Attach Route Table

```bash
RTB_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=hotelsaas-public-rt}]' \
  --query 'RouteTable.RouteTableId' --output text)

# Route all traffic to internet gateway
aws ec2 create-route --route-table-id $RTB_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

# Associate with public subnet
aws ec2 associate-route-table --route-table-id $RTB_ID --subnet-id $PUBLIC_SUBNET

# Enable auto-assign public IP for public subnet
aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET --map-public-ip-on-launch
```

---

## Step 4: Create Security Groups

### 4.1 EC2 Security Group

```bash
EC2_SG=$(aws ec2 create-security-group \
  --group-name hotelsaas-ec2-sg \
  --description "HotelSaaS EC2 - HTTP, HTTPS, SSH" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

# Allow SSH from your IP only
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress --group-id $EC2_SG \
  --protocol tcp --port 22 --cidr ${MY_IP}/32

# Allow HTTP from anywhere (CloudFront will connect here)
aws ec2 authorize-security-group-ingress --group-id $EC2_SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# Allow HTTPS from anywhere
aws ec2 authorize-security-group-ingress --group-id $EC2_SG \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

echo "EC2 SG: $EC2_SG"
```

### 4.2 RDS Security Group

```bash
RDS_SG=$(aws ec2 create-security-group \
  --group-name hotelsaas-rds-sg \
  --description "HotelSaaS RDS - PostgreSQL from EC2 only" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

# Allow PostgreSQL ONLY from EC2 security group
aws ec2 authorize-security-group-ingress --group-id $RDS_SG \
  --protocol tcp --port 5432 --source-group $EC2_SG

echo "RDS SG: $RDS_SG"
```

---

## Step 5: Launch RDS PostgreSQL

### 5.1 Create DB Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name hotelsaas-db-subnet \
  --db-subnet-group-description "HotelSaaS private subnets" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2
```

### 5.2 Generate a Strong DB Password

```bash
# Generate and save — you'll need this later
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
echo "DB Password: $DB_PASSWORD"
echo "⚠️  SAVE THIS PASSWORD SOMEWHERE SAFE"
```

### 5.3 Create RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier hotelsaas-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username hotelsaas_admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --db-name hotelrestaurant \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name hotelsaas-db-subnet \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --storage-encrypted \
  --no-multi-az
```

### 5.4 Wait for RDS to be Available (~10 minutes)

```bash
echo "Waiting for RDS to become available (takes ~10 min)..."
aws rds wait db-instance-available --db-instance-identifier hotelsaas-db
echo "✅ RDS is ready!"
```

### 5.5 Get the RDS Endpoint

```bash
DB_HOST=$(aws rds describe-db-instances \
  --db-instance-identifier hotelsaas-db \
  --query 'DBInstances[0].Endpoint.Address' --output text)

echo "DB Host: $DB_HOST"
echo "⚠️  SAVE THIS — you'll put it in .env"
```

---

## Step 6: Launch EC2 Instance

### 6.1 Find the Latest Amazon Linux 2023 AMI

```bash
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023*-x86_64" "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text)

echo "AMI: $AMI_ID"
```

### 6.2 Launch Instance

```bash
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t2.micro \
  --key-name hotelsaas-key \
  --security-group-ids $EC2_SG \
  --subnet-id $PUBLIC_SUBNET \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=hotelsaas-server}]' \
  --query 'Instances[0].InstanceId' --output text)

echo "Instance: $INSTANCE_ID"
```

### 6.3 Wait for Instance & Get Public IP

```bash
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

EC2_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "EC2 Public IP: $EC2_IP"
```

### 6.4 Allocate Elastic IP (Static IP)

```bash
EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)

aws ec2 associate-address --instance-id $INSTANCE_ID --allocation-id $EIP_ALLOC

ELASTIC_IP=$(aws ec2 describe-addresses \
  --allocation-ids $EIP_ALLOC \
  --query 'Addresses[0].PublicIp' --output text)

echo "Elastic IP: $ELASTIC_IP"
echo "⚠️  SAVE THIS — this is your server's permanent IP"
```

---

## Step 7: SSH into EC2 & Install Software

### 7.1 Connect via SSH

```bash
ssh -i hotelsaas-key.pem ec2-user@$ELASTIC_IP
```

> If prompted "Are you sure you want to continue connecting?", type `yes`.

### 7.2 Update System

```bash
sudo dnf update -y
```

### 7.3 Install Node.js 20 LTS

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### 7.4 Install Nginx

```bash
sudo dnf install -y nginx
sudo systemctl enable nginx
```

### 7.5 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 7.6 Install Git & PostgreSQL Client

```bash
sudo dnf install -y git postgresql15
```

### 7.7 Create Swap File (Memory Safety Net)

```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# Verify
free -h   # Should show ~1GB swap
```

### 7.8 Verify Installations

```bash
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo "Git: $(git --version)"
echo "psql: $(psql --version)"
```

---

## Step 8: Deploy Backend to EC2

### 8.1 Clone the Repository

```bash
sudo mkdir -p /opt/hotelsaas
sudo chown ec2-user:ec2-user /opt/hotelsaas
cd /opt/hotelsaas

git clone https://github.com/tador123/SAAS-APP.git .
```

### 8.2 Install Backend Dependencies

```bash
cd /opt/hotelsaas/backend
npm install --omit=dev
```

### 8.3 Generate JWT Secret

```bash
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "JWT Secret: $JWT_SECRET"
```

### 8.4 Create the .env File

```bash
cat > /opt/hotelsaas/backend/.env << EOF
# ── App ───────────────────────────────
NODE_ENV=production
PORT=3000
TRUST_PROXY=1

# ── Database (RDS) ───────────────────
DB_HOST=<YOUR_RDS_ENDPOINT>
DB_PORT=5432
DB_NAME=hotelrestaurant
DB_USER=hotelsaas_admin
DB_PASSWORD=<YOUR_RDS_PASSWORD>
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
DB_POOL_MAX=10
DB_POOL_MIN=2

# ── JWT ──────────────────────────────
JWT_SECRET=$JWT_SECRET
ACCESS_TOKEN_EXPIRY=1h

# ── CORS ─────────────────────────────
CORS_ORIGINS=https://yourdomain.com

# ── Frontend URL ─────────────────────
FRONTEND_URL=https://yourdomain.com

# ── Email (SES) ─────────────────────
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<SES_SMTP_USER>
SMTP_PASS=<SES_SMTP_PASS>
EMAIL_FROM=noreply@yourdomain.com

# ── Stripe (optional) ───────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ── Logging ──────────────────────────
LOG_LEVEL=info
EOF
```

**Now edit the file and fill in your actual values:**
```bash
nano /opt/hotelsaas/backend/.env
```

Replace:
- `<YOUR_RDS_ENDPOINT>` → the `DB_HOST` from Step 5.5
- `<YOUR_RDS_PASSWORD>` → the password from Step 5.2
- `yourdomain.com` → your actual domain
- `<SES_SMTP_USER>` / `<SES_SMTP_PASS>` → from Step 13 (you can leave blank for now)

**Set strict permissions:**
```bash
chmod 600 /opt/hotelsaas/backend/.env
```

### 8.5 Test Database Connection

```bash
cd /opt/hotelsaas/backend
node -e "
  require('dotenv').config();
  const { Sequelize } = require('sequelize');
  const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST, port: 5432, dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
  });
  s.authenticate().then(() => { console.log('✅ DB connected!'); process.exit(0); })
    .catch(e => { console.error('❌ DB failed:', e.message); process.exit(1); });
"
```

If you see `✅ DB connected!`, continue. If not, check your Security Groups and RDS settings.

### 8.6 Start with PM2

```bash
cd /opt/hotelsaas/backend
pm2 start src/index.js --name hotelsaas-api --max-memory-restart 700M
pm2 save

# Set PM2 to auto-start on reboot
pm2 startup
# Copy-paste the command it outputs and run it (it will start with 'sudo')
```

### 8.7 Verify Backend

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"...","db":"connected"}
```

---

## Step 9: Configure Nginx on EC2

### 9.1 Create Nginx Config

```bash
sudo tee /etc/nginx/conf.d/hotelsaas.conf << 'NGINX'
upstream backend_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml text/javascript image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API proxy
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

    # WebSocket proxy
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

    # Health check endpoint (for CloudFront/monitoring)
    location = /health {
        proxy_pass http://backend_api/api/health;
        access_log off;
    }

    # Default: return 404 (SPA is on S3/CloudFront, not here)
    location / {
        return 404 '{"error":"Not found. API is at /api/"}';
        add_header Content-Type application/json;
    }
}
NGINX
```

### 9.2 Remove Default Config & Test

```bash
sudo rm -f /etc/nginx/conf.d/default.conf
sudo nginx -t
```

Expected output: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

### 9.3 Start Nginx

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 9.4 Test from Outside

From your **local machine** (not the EC2):
```bash
curl http://<YOUR_ELASTIC_IP>/api/health
# Expected: {"status":"ok","timestamp":"...","db":"connected"}
```

If this works, your backend is live on the internet! 🎉

---

## Step 10: Build & Deploy Web Admin to S3

> **Run these commands from your local machine** (not EC2).

### 10.1 Create S3 Bucket

```bash
# Use your AWS account ID to make the bucket name unique
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="hotelsaas-web-${AWS_ACCOUNT_ID}"

aws s3 mb s3://$BUCKET_NAME --region us-east-1
echo "Bucket: $BUCKET_NAME"
```

### 10.2 Block Public Access (CloudFront will serve it)

```bash
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 10.3 Configure the Web Admin API URL

The web-admin uses relative `/api` URLs in production (CloudFront routes `/api/*` to EC2). No config change needed — it works automatically.

### 10.4 Build the Web Admin

```bash
cd web-admin
npm ci
npm run build
```

### 10.5 Upload to S3

```bash
# Upload all assets with long-term cache (hashed filenames = immutable)
aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html with no-cache (so updates are immediate)
aws s3 cp dist/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

echo "✅ Web admin deployed to S3"
```

---

## Step 11: Set Up CloudFront (CDN + SSL)

### 11.1 Request an SSL Certificate (ACM)

```bash
# MUST be in us-east-1 for CloudFront
CERT_ARN=$(aws acm request-certificate \
  --domain-name "yourdomain.com" \
  --subject-alternative-names "*.yourdomain.com" \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' --output text)

echo "Certificate ARN: $CERT_ARN"
```

### 11.2 Validate the Certificate via DNS

```bash
# Get the CNAME record needed for validation
aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

This outputs something like:
```json
{
  "Name": "_abc123.yourdomain.com",
  "Type": "CNAME",
  "Value": "_xyz789.acm-validations.aws"
}
```

**Add this CNAME record to your domain's DNS** (at your registrar or Route 53). Wait 5–15 minutes for validation.

```bash
# Check status
aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1 \
  --query 'Certificate.Status' --output text
# Wait until it shows "ISSUED"
```

### 11.3 Create CloudFront Origin Access Identity (OAI)

```bash
OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config \
  CallerReference=$(date +%s),Comment="HotelSaaS S3 Access" \
  --query 'CloudFrontOriginAccessIdentity.Id' --output text)

echo "OAI ID: $OAI_ID"
```

### 11.4 Allow CloudFront to Read S3

```bash
cat > /tmp/s3-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFront",
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity $OAI_ID"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
  }]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/s3-policy.json
```

### 11.5 Create CloudFront Distribution

> **This is easiest via the AWS Console.** Go to **CloudFront** → **Create Distribution**.

**Origin 1 — S3 (static web):**
| Setting | Value |
|---------|-------|
| Origin domain | `hotelsaas-web-XXXX.s3.amazonaws.com` |
| Origin access | Origin access identity (OAI) → select yours |
| Viewer protocol policy | Redirect HTTP to HTTPS |

**Origin 2 — EC2 (API):**
| Setting | Value |
|---------|-------|
| Origin domain | `<YOUR_ELASTIC_IP>` |
| Protocol | HTTP only |
| HTTP port | 80 |

**Behaviors (in this order — order matters!):**

| Priority | Path Pattern | Origin | Cache Policy | Headers Forwarded |
|----------|-------------|--------|-------------|-------------------|
| 1 | `/api/*` | EC2 | CachingDisabled | All |
| 2 | `/socket.io/*` | EC2 | CachingDisabled | All (+ WebSocket) |
| 3 (default) | `*` | S3 | CachingOptimized | None |

**For the `/api/*` and `/socket.io/*` behaviors:**
- Cache policy: **CachingDisabled**
- Origin request policy: **AllViewer**
- Allowed HTTP methods: **GET, HEAD, OPTIONS, PUT, PATCH, POST, DELETE**

**Custom Error Responses (for SPA routing):**
| HTTP Error Code | Response Page | Response Code | TTL |
|----------------|---------------|---------------|-----|
| 403 | `/index.html` | 200 | 0 |
| 404 | `/index.html` | 200 | 0 |

**Settings:**
| Setting | Value |
|---------|-------|
| Alternate domain name (CNAME) | `yourdomain.com`, `www.yourdomain.com` |
| SSL certificate | Custom → select your ACM certificate |
| Security policy | TLSv1.2_2021 |
| Default root object | `index.html` |
| Standard logging | Off (or enable to S3 for debugging) |

**Click Create Distribution.** Takes 5–15 minutes to deploy.

```bash
# Get your CloudFront domain
CF_DOMAIN=$(aws cloudfront list-distributions \
  --query 'DistributionList.Items[0].DomainName' --output text)
echo "CloudFront URL: https://$CF_DOMAIN"
```

---

## Step 12: Configure DNS

### Option A: Route 53 ($0.50/month)

```bash
# Create hosted zone
ZONE_ID=$(aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference $(date +%s) \
  --query 'HostedZone.Id' --output text | sed 's|/hostedzone/||')

# Get the CloudFront distribution ID
CF_DIST_ID=$(aws cloudfront list-distributions \
  --query 'DistributionList.Items[0].Id' --output text)

# Create A record pointing to CloudFront
cat > /tmp/dns-record.json << EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "yourdomain.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "$CF_DOMAIN",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
EOF

aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID \
  --change-batch file:///tmp/dns-record.json
```

> **Update nameservers** at your domain registrar to point to the Route 53 NS records:
```bash
aws route53 get-hosted-zone --id $ZONE_ID \
  --query 'DelegationSet.NameServers'
```

### Option B: Your Domain Registrar's DNS (Free)

Add a **CNAME** record at your registrar:
| Type | Name | Value |
|------|------|-------|
| CNAME | `yourdomain.com` (or `app`) | `d123abc.cloudfront.net` (your CF domain) |

> Note: Some regitrars don't allow CNAME on root domain. Use a subdomain like `app.yourdomain.com` instead, or use Route 53 / Cloudflare (free tier).

---

## Step 13: Set Up SES Email

### 13.1 Verify Your Domain

```bash
aws ses verify-domain-identity --domain yourdomain.com --region us-east-1
```

This returns a TXT record. **Add it to your DNS:**
| Type | Name | Value |
|------|------|-------|
| TXT | `_amazonses.yourdomain.com` | `(the verification token)` |

### 13.2 Set Up DKIM

```bash
aws ses verify-domain-dkim --domain yourdomain.com --region us-east-1
```

This returns 3 CNAME tokens. **Add all 3 to DNS:**
| Type | Name | Value |
|------|------|-------|
| CNAME | `token1._domainkey.yourdomain.com` | `token1.dkim.amazonses.com` |
| CNAME | `token2._domainkey.yourdomain.com` | `token2.dkim.amazonses.com` |
| CNAME | `token3._domainkey.yourdomain.com` | `token3.dkim.amazonses.com` |

### 13.3 Request Production Access

By default, SES is in **sandbox mode** (can only send to verified emails).

1. Go to **AWS Console → SES → Account Dashboard**
2. Click **"Request production access"**
3. Fill out the form:
   - Mail type: **Transactional**
   - Website URL: your domain
   - Use case: *"Transactional emails for hotel reservation confirmations, checkout summaries, and password resets. Expected volume: <1000/month."*
4. Wait 24–48 hours for approval.

### 13.4 Create SMTP Credentials

1. Go to **AWS Console → SES → SMTP Settings**
2. Click **"Create SMTP credentials"**
3. Username: `hotelsaas-ses-smtp`
4. **Save the SMTP username and password** — shown only once!

### 13.5 Update Backend .env on EC2

```bash
ssh -i hotelsaas-key.pem ec2-user@$ELASTIC_IP

nano /opt/hotelsaas/backend/.env
# Update these lines:
# SMTP_HOST=email-smtp.us-east-1.amazonaws.com
# SMTP_PORT=587
# SMTP_USER=<your SES SMTP username>
# SMTP_PASS=<your SES SMTP password>
# EMAIL_FROM=noreply@yourdomain.com

# Restart the app
pm2 restart hotelsaas-api
```

---

## Step 14: Run Migrations & Seed Data

### 14.1 SSH into EC2

```bash
ssh -i hotelsaas-key.pem ec2-user@$ELASTIC_IP
cd /opt/hotelsaas/backend
```

### 14.2 Run Database Migrations

```bash
npm run migrate
```

Expected output:
```
Running migrations...
Executed: 20260308000001-initial-schema.js
Executed: 20260308000002-add-soft-delete.js
Executed: 20260310000001-multi-tenancy-propertyid.js
Executed: 20260310000002-create-stripe-events-table.js
All migrations completed successfully
```

### 14.3 Seed Initial Data (First Time Only)

```bash
SEED_DB=true node src/seeders/seed.js
```

This creates:
- A default Property ("Default Hotel")
- An admin user: `admin@hotel.com` / `Admin@Hotel2024!`
- Sample rooms, guests, and menu items

> **⚠️ IMPORTANT:** Change the admin password immediately after first login!

### 14.4 Restart PM2

```bash
pm2 restart hotelsaas-api
```

---

## Step 15: Verify Everything Works

### 15.1 Health Check

```bash
# From EC2 (local)
curl http://localhost:3000/api/health
# Expected: {"status":"ok","db":"connected"}

# From your local machine (via Elastic IP)
curl http://<ELASTIC_IP>/api/health

# Via CloudFront (once DNS propagates)
curl https://yourdomain.com/api/health
```

### 15.2 Login Test

```bash
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hotel.com","password":"Admin@Hotel2024!"}'
```

Expected: JSON with `token` and `user` object.

### 15.3 Web Admin

Open `https://yourdomain.com` in your browser. You should see the login page.

Log in with: `admin@hotel.com` / `Admin@Hotel2024!`

### 15.4 Full API Test

```bash
# Login and get token
TOKEN=$(curl -s -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hotel.com","password":"Admin@Hotel2024!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Test endpoints
curl -s https://yourdomain.com/api/rooms -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -5
curl -s https://yourdomain.com/api/dashboard/stats -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## Step 16: Set Up CI/CD (GitHub Actions)

The repo already includes `.github/workflows/deploy.yml`. You just need to add secrets.

### 16.1 Add GitHub Secrets

Go to **GitHub → tador123/SAAS-APP → Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

| Secret Name | Value | Where to Get It |
|------------|-------|-----------------|
| `EC2_HOST` | `<YOUR_ELASTIC_IP>` | Step 6.4 |
| `EC2_SSH_KEY` | Contents of `hotelsaas-key.pem` | Step 2 (paste the entire file) |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Step 1.2 |
| `AWS_SECRET_ACCESS_KEY` | `wJal...` | Step 1.2 |
| `S3_BUCKET` | `hotelsaas-web-XXXX` | Step 10.1 |
| `CF_DISTRIBUTION_ID` | `E1ABC2DEF3GH` | CloudFront console |

### 16.2 Test the Pipeline

```bash
# Make a small change locally
cd /path/to/SAAS-APP
echo "" >> README.md
git add -A
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

Go to **GitHub → Actions** tab to watch the pipeline run:
1. ✅ Backend tests (with PostgreSQL service)
2. ✅ Web admin tests + build
3. ✅ Deploy backend to EC2 (via SSH)
4. ✅ Deploy web admin to S3 + CloudFront invalidation

### 16.3 How Deployments Work After This

```
You push to main → GitHub Actions runs tests → If tests pass:
  - Backend: SSH into EC2 → git pull → npm install → migrate → pm2 restart
  - Web Admin: Build → sync to S3 → invalidate CloudFront cache
```

**Zero-downtime:** PM2 restarts take <2 seconds. S3 syncs are atomic per file.

---

## Step 17: Set Up Monitoring & Backups

### 17.1 CloudWatch Alarms (Free — up to 10 alarms)

```bash
# Create SNS topic for alerts
SNS_ARN=$(aws sns create-topic --name hotelsaas-alerts --query 'TopicArn' --output text)

# Subscribe your email
aws sns subscribe --topic-arn $SNS_ARN --protocol email --notification-endpoint your@email.com
# Check your email and confirm the subscription!

# Alarm: EC2 CPU > 80% for 10 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name "hotelsaas-cpu-high" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --alarm-actions $SNS_ARN

# Alarm: RDS storage < 2GB
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
  --alarm-actions $SNS_ARN
```

### 17.2 UptimeRobot (Free External Monitoring)

1. Go to [uptimerobot.com](https://uptimerobot.com) → Create free account
2. Add monitor:
   - Type: **HTTPS**
   - URL: `https://yourdomain.com/api/health`
   - Interval: **5 minutes**
   - Alert contacts: your email
3. You'll get email/SMS if the site goes down

### 17.3 Automated Database Backups to S3

**RDS already does daily automated backups** (7-day retention). For extra safety, add pg_dump to S3:

```bash
# SSH into EC2
ssh -i hotelsaas-key.pem ec2-user@$ELASTIC_IP

# Create backup bucket
aws s3 mb s3://hotelsaas-backups-$(aws sts get-caller-identity --query Account --output text)

# Create backup script
cat > /opt/hotelsaas/scripts/backup.sh << 'SCRIPT'
#!/bin/bash
source /opt/hotelsaas/backend/.env
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/hotelsaas_${TIMESTAMP}.sql.gz"
BUCKET="hotelsaas-backups-$(aws sts get-caller-identity --query Account --output text)"

PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-privileges | gzip > "$BACKUP_FILE"

aws s3 cp "$BACKUP_FILE" "s3://${BUCKET}/daily/${TIMESTAMP}.sql.gz"
rm -f "$BACKUP_FILE"
echo "$(date): Backup completed → ${TIMESTAMP}.sql.gz"
SCRIPT

chmod +x /opt/hotelsaas/scripts/backup.sh

# Test it
/opt/hotelsaas/scripts/backup.sh

# Schedule daily at 3 AM UTC
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/hotelsaas/scripts/backup.sh >> /var/log/hotelsaas-backup.log 2>&1") | crontab -
```

### 17.4 PM2 Monitoring

```bash
# View live logs
pm2 logs hotelsaas-api

# View process status
pm2 status

# View detailed metrics
pm2 monit
```

---

## Step 18: Post-Deployment Checklist

Run through this checklist after deployment:

### Security
- [ ] Changed default admin password (`admin@hotel.com`)
- [ ] EC2 SSH restricted to your IP only
- [ ] RDS not publicly accessible
- [ ] `.env` file has `chmod 600`
- [ ] S3 bucket has block public access enabled
- [ ] CloudFront uses TLS 1.2+
- [ ] HTTPS redirect enabled in CloudFront

### Functionality
- [ ] `https://yourdomain.com` loads the login page
- [ ] Login works with admin credentials
- [ ] Dashboard shows stats
- [ ] Can create/edit/delete rooms
- [ ] Can create/edit reservations
- [ ] Can create/edit restaurant orders
- [ ] WebSocket real-time updates work (open 2 tabs, make a change)

### Email
- [ ] SES domain verified
- [ ] SES out of sandbox (production access)
- [ ] SPF record added: `v=spf1 include:amazonses.com ~all`
- [ ] DKIM CNAME records added (3 records)
- [ ] Test: create a reservation → confirmation email received

### Monitoring
- [ ] CloudWatch CPU alarm configured
- [ ] CloudWatch RDS storage alarm configured
- [ ] UptimeRobot health check active
- [ ] SNS email alert subscription confirmed

### CI/CD
- [ ] GitHub Actions secrets configured
- [ ] Test push triggers pipeline
- [ ] Backend deploys successfully
- [ ] Web admin syncs to S3

### Backups
- [ ] RDS automated backups enabled (7-day retention)
- [ ] pg_dump cron job running daily
- [ ] Tested backup restore (download from S3, restore to local)

---

## Troubleshooting

### "Cannot connect to RDS"
```bash
# Check EC2 can reach RDS
psql -h $DB_HOST -U hotelsaas_admin -d hotelrestaurant
# If timeout → check Security Groups (RDS SG must allow EC2 SG on port 5432)
```

### "502 Bad Gateway" on /api
```bash
# Check if Node.js is running
pm2 status
# If not running:
pm2 restart hotelsaas-api
pm2 logs hotelsaas-api --lines 50
```

### "CloudFront returns 403"
- Check S3 bucket policy allows your OAI
- Check CloudFront has the correct S3 origin
- Wait 15 min for distribution to fully deploy

### "SPA routes return 404"
- Check CloudFront custom error responses: 403 → `/index.html` (200), 404 → `/index.html` (200)

### "WebSocket not connecting"
- Verify CloudFront `/socket.io/*` behavior exists and forwards `Upgrade` header
- Check Nginx config has the `proxy_set_header Upgrade` directive

### "Out of memory on EC2"
```bash
free -h
pm2 monit
# If Node.js > 700MB, PM2 will auto-restart. If OS is swapping heavily:
# Consider upgrading to t3.small (2GB RAM, ~$15/mo)
```

### "Deployment failed — SSH connection refused"
- Verify EC2 is running: `aws ec2 describe-instances --instance-ids $INSTANCE_ID`
- Check Security Group allows SSH from GitHub Actions IPs (or use `0.0.0.0/0` for port 22 temporarily)
- Verify the SSH key in GitHub secrets matches `hotelsaas-key.pem`

---

## Quick Reference Card

| What | Command / URL |
|------|--------------|
| SSH into server | `ssh -i hotelsaas-key.pem ec2-user@<ELASTIC_IP>` |
| View logs | `pm2 logs hotelsaas-api` |
| Restart backend | `pm2 restart hotelsaas-api` |
| Run migrations | `cd /opt/hotelsaas/backend && npm run migrate` |
| Check status | `pm2 status` |
| Manual deploy | `cd /opt/hotelsaas && git pull && cd backend && npm i --omit=dev && npm run migrate && pm2 restart hotelsaas-api` |
| Nginx logs | `sudo tail -f /var/log/nginx/access.log` |
| Health check | `curl https://yourdomain.com/api/health` |
| S3 deploy web | `aws s3 sync dist/ s3://$BUCKET --cache-control "public,max-age=31536000,immutable" --exclude index.html` |
| Invalidate CDN | `aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/index.html"` |
| Backup DB now | `/opt/hotelsaas/scripts/backup.sh` |
| Memory check | `free -h && pm2 monit` |

---

## Cost Summary

| Period | Monthly Cost |
|--------|-------------|
| **Months 1–12 (Free Tier)** | **~$0.50** (Route 53 only) |
| **Month 13+** | **~$24** (EC2 + RDS on-demand) |
| **Month 13+ (Reserved)** | **~$14** (1-year no-upfront RI) |

You're live! 🚀
