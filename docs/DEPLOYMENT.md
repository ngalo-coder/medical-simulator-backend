# Deployment Guide

## Render.com Deployment

1. Push code to GitHub
2. Connect repository to Render.com
3. Configure environment variables
4. Deploy using render.yaml configuration

## Environment Variables

Required variables:
- MONGODB_URI
- JWT_SECRET
- SENDGRID_API_KEY
- FRONTEND_URL

See .env.example for complete list.

## Database Setup

1. Create MongoDB Atlas cluster
2. Configure network access
3. Create database user
4. Get connection string

## Post-Deployment

1. Test health endpoint
2. Seed database
3. Create admin user
4. Verify all endpoints

For detailed instructions, see the main deployment guide.
