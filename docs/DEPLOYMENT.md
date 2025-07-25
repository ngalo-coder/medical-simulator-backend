# Medical Case Simulator - Production Deployment Guide

## Overview

This guide covers deploying the Medical Case Simulator backend to production environments with enterprise-grade security, monitoring, and scalability.

## Prerequisites

### System Requirements

**Minimum Production Requirements:**
- Node.js 18+ LTS
- MongoDB 5.0+
- Redis 6.0+
- 2GB RAM minimum (4GB+ recommended)
- 20GB disk space
- SSL certificate

**Recommended Production Setup:**
- Load balancer (nginx/HAProxy)
- Multiple application instances
- Dedicated database server
- Redis cluster for high availability
- CDN for static assets
- Monitoring and logging infrastructure

### Required Services

1. **Database**: MongoDB Atlas or self-hosted MongoDB
2. **Cache**: Redis Cloud or self-hosted Redis
3. **Email**: SendGrid, AWS SES, or similar
4. **File Storage**: AWS S3, Cloudinary, or similar
5. **Monitoring**: Sentry, DataDog, or similar (optional)

## Environment Configuration

### 1. Environment Variables

Create a production `.env` file:

```bash
# Server Configuration
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend-domain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical-case-simulator?retryWrites=true&w=majority

# Security (Generate strong secrets!)
JWT_SECRET=your-super-secure-256-bit-secret-key-here-minimum-32-characters
JWT_REFRESH_SECRET=your-different-refresh-secret-key-here-also-32-chars-min
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
ENCRYPTION_KEY=exactly-32-character-key-for-data

# Redis
REDIS_URL=redis://username:password@redis-host:6379
REDIS_PASSWORD=your-redis-password

# Email Service
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
FROM_EMAIL=noreply@your-domain.com
ADMIN_EMAIL=admin@your-domain.com

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=medical-case-simulator-files

# Security Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Feature Flags
ENABLE_REAL_TIME_COLLABORATION=true
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_GAMIFICATION=true
ENABLE_EMAIL_NOTIFICATIONS=true

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn-for-error-tracking
LOG_LEVEL=info
```

### 2. Security Checklist

**Before Deployment:**

- [ ] Generate strong, unique JWT secrets (minimum 32 characters)
- [ ] Use HTTPS/TLS certificates
- [ ] Configure CORS for your frontend domain only
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Configure firewall rules
- [ ] Set up database authentication
- [ ] Enable Redis authentication
- [ ] Review and remove debug/development code
- [ ] Set up monitoring and alerting

## Deployment Options

### Option 1: Render.com (Recommended for Quick Start)

1. **Prepare Repository**
   ```bash
   # Ensure build and start scripts are executable
   chmod +x build.sh start.sh
   
   # Commit all changes
   git add .
   git commit -m "Production deployment setup"
   git push origin main
   ```

2. **Deploy to Render**
   - Connect your GitHub repository
   - Use the provided `render.yaml` configuration
   - Set environment variables in Render dashboard
   - Deploy automatically on git push

3. **Configure Custom Domain**
   - Add your custom domain in Render dashboard
   - Update DNS records to point to Render
   - SSL certificate is automatically provisioned

### Option 2: AWS/DigitalOcean/VPS

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx for reverse proxy
sudo apt install nginx -y

# Install certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

#### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/medical-case-simulator-backend.git
cd medical-case-simulator-backend

# Install dependencies
npm ci --only=production

# Create environment file
cp .env.example .env
# Edit .env with your production values

# Build application
chmod +x build.sh
./build.sh

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 3. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'medical-case-simulator',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

#### 4. Nginx Configuration

Create `/etc/nginx/sites-available/medical-case-simulator`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Main Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Files
    location /uploads/ {
        alias /path/to/your/app/public/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health Check
    location /health {
        access_log off;
        proxy_pass http://localhost:3000/health;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/medical-case-simulator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Option 3: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Bundle app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create necessary directories
RUN mkdir -p logs uploads temp
RUN chown -R nodejs:nodejs /usr/src/app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "server.js"]
```

#### 2. Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    volumes:
      - ./logs:/usr/src/app/logs
      - ./uploads:/usr/src/app/uploads

  mongodb:
    image: mongo:5.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    command: redis-server --requirepass password
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
```

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster**
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new cluster
   - Choose appropriate tier (M10+ for production)

2. **Configure Security**
   - Create database user with read/write permissions
   - Configure IP whitelist (or 0.0.0.0/0 for cloud deployments)
   - Enable authentication

3. **Get Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/medical-case-simulator?retryWrites=true&w=majority
   ```

### Self-Hosted MongoDB

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongo
> use medical-case-simulator
> db.createUser({
    user: "appuser",
    pwd: "secure-password",
    roles: [{ role: "readWrite", db: "medical-case-simulator" }]
  })
```

## Monitoring and Logging

### 1. Application Monitoring

**Health Check Endpoint:**
```bash
curl https://your-domain.com/health
```

**PM2 Monitoring:**
```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# Restart application
pm2 restart medical-case-simulator
```

### 2. Log Management

**Centralized Logging with Winston:**
- Logs are automatically written to `logs/` directory
- Configure log rotation to prevent disk space issues
- Consider using external log management (ELK stack, Splunk)

**Log Rotation Setup:**
```bash
# Install logrotate
sudo apt install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/medical-case-simulator
```

```
/path/to/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. Performance Monitoring

**System Metrics:**
```bash
# Install htop for system monitoring
sudo apt install htop

# Monitor system resources
htop

# Monitor disk usage
df -h

# Monitor network connections
netstat -tulpn
```

**Application Metrics:**
- Built-in performance monitoring middleware
- Redis-based metrics storage
- API endpoint: `GET /api/admin/metrics`

## Backup and Recovery

### 1. Database Backup

**MongoDB Atlas:**
- Automatic backups are included
- Configure backup schedule in Atlas dashboard
- Test restore procedures regularly

**Self-Hosted MongoDB:**
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --host localhost --port 27017 --db medical-case-simulator --out $BACKUP_DIR/backup_$DATE

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

### 2. File Backup

```bash
# Backup uploaded files
rsync -av /path/to/app/uploads/ /backups/uploads/

# Backup application code
git archive --format=tar.gz --output=/backups/app_$(date +%Y%m%d).tar.gz HEAD
```

### 3. Automated Backup

Add to crontab:
```bash
# Daily database backup at 2 AM
0 2 * * * /path/to/backup-script.sh

# Weekly file backup on Sundays at 3 AM
0 3 * * 0 rsync -av /path/to/app/uploads/ /backups/uploads/
```

## Security Hardening

### 1. Server Security

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh

# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 2. Application Security

- JWT tokens with short expiration
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS configuration
- Security headers
- SQL injection protection
- XSS protection

### 3. Database Security

- Enable authentication
- Use strong passwords
- Limit network access
- Regular security updates
- Encrypt data at rest (MongoDB Atlas includes this)

## Performance Optimization

### 1. Application Optimization

- **Clustering**: Use PM2 cluster mode
- **Caching**: Redis for session and data caching
- **Database Indexing**: Ensure proper indexes are created
- **Connection Pooling**: MongoDB connection pooling
- **Compression**: Gzip compression in nginx

### 2. Database Optimization

```javascript
// Ensure indexes are created (done automatically in connectDB)
await db.collection('users').createIndex({ email: 1 }, { unique: true });
await db.collection('cases').createIndex({ specialty: 1, difficulty: 1 });
await db.collection('progress').createIndex({ userId: 1, caseId: 1 });
```

### 3. CDN and Static Assets

- Use CDN for static file delivery
- Optimize images and media files
- Enable browser caching
- Minify CSS/JS assets

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: nginx, HAProxy, or cloud load balancer
2. **Multiple App Instances**: PM2 cluster mode or multiple servers
3. **Database Scaling**: MongoDB replica sets or sharding
4. **Redis Clustering**: Redis Cluster for high availability

### Vertical Scaling

1. **Increase Server Resources**: More CPU, RAM, storage
2. **Database Performance**: Faster storage, more memory
3. **Network Optimization**: Better network connectivity

## Troubleshooting

### Common Issues

**Application Won't Start:**
```bash
# Check logs
pm2 logs medical-case-simulator

# Check environment variables
pm2 env 0

# Restart application
pm2 restart medical-case-simulator
```

**Database Connection Issues:**
```bash
# Test MongoDB connection
mongo "mongodb+srv://cluster.mongodb.net/test" --username username

# Check network connectivity
telnet cluster.mongodb.net 27017
```

**High Memory Usage:**
```bash
# Monitor memory usage
pm2 monit

# Restart if memory leak suspected
pm2 restart medical-case-simulator
```

**SSL Certificate Issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test nginx configuration
sudo nginx -t
```

### Performance Issues

1. **Slow Database Queries**: Check indexes and query optimization
2. **High CPU Usage**: Monitor with htop, consider scaling
3. **Memory Leaks**: Monitor with PM2, restart if necessary
4. **Network Latency**: Use CDN, optimize database queries

## Maintenance

### Regular Tasks

**Daily:**
- Monitor application logs
- Check system resources
- Verify backup completion

**Weekly:**
- Review performance metrics
- Update dependencies (after testing)
- Clean up old log files

**Monthly:**
- Security updates
- Database maintenance
- Performance optimization review
- Backup restoration testing

### Update Procedure

1. **Test Updates in Staging**
2. **Backup Current Version**
3. **Deploy During Low Traffic**
4. **Monitor After Deployment**
5. **Rollback if Issues Occur**

```bash
# Update procedure
git pull origin main
npm ci --only=production
pm2 reload medical-case-simulator
```

## Support and Monitoring

### Monitoring Dashboards

Set up monitoring for:
- Application uptime and response times
- Database performance
- Server resources (CPU, memory, disk)
- Error rates and logs
- User activity and engagement

### Alerting

Configure alerts for:
- Application downtime
- High error rates
- Database connection issues
- Server resource exhaustion
- Security incidents

### Support Contacts

- **Technical Issues**: tech-support@your-domain.com
- **Security Issues**: security@your-domain.com
- **Emergency**: +1-XXX-XXX-XXXX

---

This deployment guide ensures your Medical Case Simulator backend runs reliably and securely in production. Regular monitoring and maintenance are key to long-term success.