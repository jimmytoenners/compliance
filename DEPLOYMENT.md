# GRC Compliance Platform - Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [SSL Certificate Setup](#ssl-certificate-setup)
4. [Docker Deployment](#docker-deployment)
5. [Database Initialization](#database-initialization)
6. [Health Checks](#health-checks)
7. [Monitoring](#monitoring)
8. [Backup Strategy](#backup-strategy)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- Docker Engine 24.0+
- Docker Compose 2.20+
- At least 4GB RAM available
- 20GB disk space (10GB for Docker images + 10GB for data)

### Domain Names
- `platform.yourcompany.com` - Admin/internal platform
- `portal.yourcompany.com` - Customer portal
- Update DNS A records to point to your server IP

## Environment Configuration

### 1. Create Production Environment File

```bash
cp grc-backend/.env.example .env.prod
```

### 2. Configure Required Variables

Edit `.env.prod`:

```bash
# Database Configuration (REQUIRED)
POSTGRES_DB=grc_db
POSTGRES_USER=grc_user
POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_123!

# JWT Authentication (REQUIRED)
JWT_SECRET=CHANGE_THIS_RANDOM_STRING_MIN_32_CHARS

# API Configuration
API_PORT=8080

# SMTP Configuration (OPTIONAL)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourcompany.com
SMTP_FROM_NAME=GRC Compliance Platform

# Frontend URLs
NEXT_PUBLIC_API_URL=https://platform.yourcompany.com/api/v1
```

### 3. Generate Strong Secrets

```bash
# Generate JWT Secret (32+ characters)
openssl rand -base64 32

# Generate Database Password (16+ characters)
openssl rand -base64 16
```

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended for Production)

#### Install Certbot
```bash
# Ubuntu/Debian
sudo apt-get install certbot

# macOS
brew install certbot
```

#### Generate Certificates
```bash
# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Generate certificates
sudo certbot certonly --standalone \
  -d platform.yourcompany.com \
  -d portal.yourcompany.com \
  --email admin@yourcompany.com \
  --agree-tos \
  --no-eff-email

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/platform.yourcompany.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/platform.yourcompany.com/privkey.pem nginx/ssl/key.pem
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem

# Restart nginx
docker-compose -f docker-compose.prod.yml start nginx
```

#### Auto-renewal Setup
```bash
# Add to crontab
sudo crontab -e

# Add this line (runs twice daily)
0 0,12 * * * certbot renew --quiet --deploy-hook "docker-compose -f /path/to/compliance/docker-compose.prod.yml restart nginx"
```

### Option 2: Self-Signed Certificate (Development/Testing Only)

```bash
# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=*.yourcompany.com"

chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

**Note**: Self-signed certificates will show browser warnings. Only use for development.

### Option 3: Commercial SSL Certificate

1. Generate CSR (Certificate Signing Request):
```bash
openssl req -new -newkey rsa:2048 -nodes \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=platform.yourcompany.com"
```

2. Submit `cert.csr` to your SSL provider (DigiCert, Sectigo, etc.)
3. Download certificate files from provider
4. Copy to `nginx/ssl/cert.pem`

## Docker Deployment

### 1. Build and Start Services

```bash
# Load environment variables
export $(cat .env.prod | xargs)

# Build images
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 2. Verify Services

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                  STATUS        PORTS
# grc-backend           Up (healthy)  
# grc-frontend-platform Up (healthy)
# grc-frontend-portal   Up (healthy)
# grc-nginx             Up (healthy)  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# grc-postgres          Up (healthy)  0.0.0.0:5432->5432/tcp
```

### 3. Test Health Endpoints

```bash
# Nginx health
curl http://localhost/health

# Backend health
curl -k https://platform.yourcompany.com/api/v1/dashboard/summary

# Frontend health (should return HTML)
curl -k https://platform.yourcompany.com
```

## Database Initialization

### Automatic Initialization

The database schema is automatically initialized on first startup using:
- `grc-backend/schema.sql` - Creates all tables and functions
- Seed data is loaded by the Go backend on startup

### Manual Database Access

```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec db psql -U grc_user -d grc_db

# Useful queries
SELECT COUNT(*) FROM control_library;  -- Check seeded controls
SELECT * FROM users;  -- Check users
SELECT * FROM activated_controls;  -- Check activated controls
```

### Backup Database

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U grc_user grc_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U grc_user -d grc_db < backup_20250114_120000.sql
```

## Health Checks

All services include health checks:

### PostgreSQL
- **Check**: `pg_isready` command
- **Interval**: Every 10 seconds
- **Timeout**: 5 seconds
- **Retries**: 5

### Backend API
- **Check**: HTTP GET to `/api/v1/dashboard/summary`
- **Interval**: Every 30 seconds
- **Timeout**: 10 seconds
- **Start Period**: 40 seconds

### Frontend Services
- **Check**: HTTP GET to root URL
- **Interval**: Every 30 seconds
- **Timeout**: 10 seconds
- **Start Period**: 60 seconds

### Nginx
- **Check**: HTTP GET to `/health`
- **Interval**: Every 30 seconds
- **Timeout**: 10 seconds

### View Health Status

```bash
# Check health status
docker-compose -f docker-compose.prod.yml ps

# View specific service health
docker inspect grc-backend --format='{{json .State.Health}}'
```

## Monitoring

### Docker Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Nginx Access Logs

```bash
# Real-time access logs
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log

# Error logs
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/error.log
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Backup Strategy

### 1. Database Backups (Daily)

Create a backup script `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/grc"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
docker-compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U grc_user grc_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Uploads backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz \
  -C /var/lib/docker/volumes/compliance_backend_uploads/_data .

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/grc_backup.log 2>&1
```

### 2. Backup to S3/Cloud Storage

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Upload to S3
aws s3 sync /backups/grc s3://your-backup-bucket/grc/
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common issues:
# - Database not ready: Wait for health check
# - Missing environment variables: Check .env.prod
# - Port already in use: Stop conflicting service
```

### Database Connection Errors

```bash
# Verify database is healthy
docker-compose -f docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Test connection manually
docker-compose -f docker-compose.prod.yml exec db \
  psql -U grc_user -d grc_db -c "SELECT 1;"
```

### SSL Certificate Issues

```bash
# Verify certificate files exist
ls -l nginx/ssl/

# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect platform.yourcompany.com:443
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Prune unused Docker resources
docker system prune -a
```

### Email Not Sending

```bash
# Check backend logs for SMTP errors
docker-compose -f docker-compose.prod.yml logs backend | grep -i smtp

# Test SMTP connection (from backend container)
docker-compose -f docker-compose.prod.yml exec backend sh
# Inside container:
telnet $SMTP_HOST $SMTP_PORT
```

## Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Verify all services are healthy
docker-compose -f docker-compose.prod.yml ps
```

## Security Checklist

- [ ] Change default passwords in `.env.prod`
- [ ] Generate strong JWT secret (32+ characters)
- [ ] Install valid SSL certificates (not self-signed)
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Enable automatic security updates
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Review Nginx security headers
- [ ] Enable rate limiting (already configured)
- [ ] Set up monitoring/alerting

## Production Hardening

### 1. Restrict Database Access
```yaml
# In docker-compose.prod.yml, remove db ports exposure:
# Comment out or remove:
# ports:
#   - "5432:5432"
```

### 2. Use Docker Secrets
For sensitive data, use Docker secrets instead of environment variables.

### 3. Enable Log Rotation
```bash
# /etc/logrotate.d/docker-containers
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
```

## Support

For issues or questions:
- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- Review this guide
- Check GitHub issues: https://github.com/yourcompany/compliance/issues
