# GRC Platform Installation Guide

## Overview

This guide provides step-by-step instructions for installing and deploying the GRC (Governance, Risk, and Compliance) Platform on-premise. The platform consists of three main components:

- **Backend API** (Go): RESTful API server handling business logic
- **Internal Platform** (Next.js): Web interface for internal users and administrators
- **External Portal** (Next.js): Customer-facing ticket submission portal

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+), macOS (10.15+), or Windows Server 2019+
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 20GB free space
- **Network**: Stable internet connection for updates and external integrations

### Software Dependencies

- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 2.0 or later
- **PostgreSQL**: Version 15 (provided via Docker)
- **SSL Certificate**: For production HTTPS (Let's Encrypt recommended)

### Network Requirements

- **Inbound Ports**:
  - 80/443: HTTP/HTTPS for web interfaces
  - 5432: PostgreSQL (internal only, can be firewalled)
- **Outbound**: SMTP port 587 (for email notifications)

## Installation Steps

### Step 1: Prepare the Environment

1. **Create a dedicated user** (recommended):
   ```bash
   sudo useradd -m -s /bin/bash grc-user
   sudo usermod -aG docker grc-user
   su - grc-user
   ```

2. **Clone or download the application**:
   ```bash
   git clone https://github.com/your-org/grc-platform.git
   cd grc-platform
   ```

3. **Create the environment configuration**:
   ```bash
   cp .env.example .env
   nano .env  # Edit with your specific values
   ```

### Step 2: Configure Environment Variables

Edit the `.env` file with your production values:

```bash
# Database (generate secure password)
POSTGRES_PASSWORD=your-secure-db-password-here

# Security (generate secure JWT secret)
JWT_SECRET=your-32-character-jwt-secret-here

# API Keys (generate secure API key)
EXTERNAL_API_KEY=your-secure-api-key-here

# Email (configure your SMTP settings)
SMTP_HOST=smtp.yourcompany.com
SMTP_PORT=587
SMTP_USER=grc@yourcompany.com
SMTP_PASS=your-smtp-password

# URLs (your production domains)
PLATFORM_URL=https://grc.yourcompany.com
PORTAL_URL=https://portal.yourcompany.com
```

### Step 3: SSL Certificate Setup

For production, set up SSL certificates:

1. **Using Let's Encrypt** (recommended):
   ```bash
   sudo apt install certbot
   sudo certbot certonly --standalone -d grc.yourcompany.com -d portal.yourcompany.com
   ```

2. **Update nginx configuration** (if using reverse proxy):
   ```nginx
   server {
       listen 443 ssl;
       server_name grc.yourcompany.com;

       ssl_certificate /etc/letsencrypt/live/grc.yourcompany.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/grc.yourcompany.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Step 4: Database Setup

The database will be automatically created when you start the containers. However, you can pre-configure it:

```bash
# Create database directory
sudo mkdir -p /opt/grc/data
sudo chown grc-user:grc-user /opt/grc/data
```

### Step 5: Deploy the Application

1. **Build and start the services**:
   ```bash
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Monitor the startup process**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

3. **Verify services are running**:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

### Step 6: Initial Configuration

1. **Access the platform**:
   - Internal Platform: https://grc.yourcompany.com
   - External Portal: https://portal.yourcompany.com

2. **Create the first admin user**:
   ```bash
   # The application will automatically create default users on first startup
   # Default admin credentials (change immediately):
   # Email: admin@company.com
   # Password: admin123
   ```

3. **Configure additional settings**:
   - Set up email notifications
   - Configure API keys for external integrations
   - Set up backup schedules

## Post-Installation Tasks

### Step 7: Security Hardening

1. **Change default passwords** immediately after first login

2. **Configure firewall**:
   ```bash
   sudo ufw enable
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw allow ssh
   ```

3. **Set up log rotation**:
   ```bash
   sudo nano /etc/logrotate.d/grc-platform
   ```

   Add:
   ```
   /opt/grc/logs/*.log {
       daily
       rotate 30
       compress
       delaycompress
       missingok
       notifempty
   }
   ```

### Step 8: Backup Configuration

Set up automated backups:

```bash
# Create backup script
sudo nano /opt/grc/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/grc/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec grc-platform_db_1 pg_dump -U grc_user grc_db > $BACKUP_DIR/grc_db_$DATE.sql

# Backup configuration
cp /opt/grc/.env $BACKUP_DIR/env_$DATE.backup

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete
```

Make executable and set up cron:
```bash
sudo chmod +x /opt/grc/backup.sh
sudo crontab -e
# Add: 0 2 * * * /opt/grc/backup.sh
```

### Step 9: Monitoring Setup

1. **Health checks**:
   ```bash
   # Check all services
   curl -f https://grc.yourcompany.com/api/health
   curl -f https://portal.yourcompany.com/api/health
   ```

2. **Log monitoring**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=100 backend
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   sudo netstat -tulpn | grep :3000
   # Change ports in .env if needed
   ```

2. **Database connection issues**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs db
   # Check POSTGRES_PASSWORD in .env
   ```

3. **SSL certificate issues**:
   ```bash
   sudo certbot renew
   docker-compose -f docker-compose.prod.yml restart
   ```

### Logs and Debugging

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.prod.yml logs backend

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f
```

### Performance Tuning

For high-traffic deployments:

1. **Increase Docker resources**:
   ```bash
   # In docker-compose.prod.yml
   backend:
     deploy:
       resources:
         limits:
           memory: 1G
           cpus: '1.0'
   ```

2. **Database optimization**:
   - Increase PostgreSQL shared_buffers
   - Configure connection pooling

## Support

For technical support:
- Check the logs: `docker-compose -f docker-compose.prod.yml logs`
- Review the configuration guide
- Contact the development team

## Maintenance

### Regular Tasks

- **Daily**: Monitor logs and performance
- **Weekly**: Review backup integrity
- **Monthly**: Update SSL certificates, security patches
- **Quarterly**: Review and optimize database performance

### Updates

To update the platform:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations if needed
docker-compose -f docker-compose.prod.yml exec backend ./migrate up
```

---

**Installation completed successfully!** 🎉

Your GRC Platform is now running at:
- Internal Platform: https://grc.yourcompany.com
- External Portal: https://portal.yourcompany.com