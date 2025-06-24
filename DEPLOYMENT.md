# 🚀 Brainer Deployment Guide

Complete deployment strategy for the Brainer application with all its components working together.

## 📋 Architecture Overview

Your Brainer app consists of:
- **Frontend**: Next.js 15 with React 19
- **Database**: PostgreSQL with pgvector extension (Docker)
- **AWS Services**: S3 (file storage) + Transcribe (voice processing)
- **Authentication**: Firebase Auth + Admin SDK
- **Payments**: Stripe integration
- **AI**: OpenAI API integration

## 🎯 Deployment Options

### Option 1: Vercel (Recommended for MVP)
**Best for**: Quick deployment, automatic scaling, integrated with Next.js

### Option 2: AWS (Production Ready)
**Best for**: Full control, enterprise scale, AWS service integration

### Option 3: Railway/Render (Alternative)
**Best for**: Simple full-stack deployment with database

---

## 🚀 Option 1: Vercel Deployment (Recommended)

### Step 1: Database Setup
```bash
# Use a managed PostgreSQL service
# Choose one:
# - Neon (recommended): https://neon.tech
# - Supabase: https://supabase.com
# - Railway: https://railway.app
# - Aiven: https://aiven.io
```

### Step 2: Environment Variables Setup
Create these environment variables in Vercel:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/brainer?sslmode=require"

# Firebase
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY_ID="key-id"
FIREBASE_CLIENT_ID="client-id"
FIREBASE_CLIENT_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"

# AWS Services
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET_NAME="brainer-audio-uploads"

# OpenAI
OPENAI_API_KEY="sk-..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App Config
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-nextauth-secret"
```

### Step 3: Prepare for Deployment
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Build and test locally
npm run build
npm run start

# 3. Deploy to Vercel
vercel

# 4. Set up production database
npx prisma migrate deploy
npx prisma generate
```

### Step 4: Vercel Configuration
Create `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 🏗️ Option 2: AWS Deployment (Production)

### Architecture
```
Internet → CloudFront → ALB → ECS/Fargate → RDS PostgreSQL
                            ↓
                        S3 + Transcribe
```

### Step 1: Infrastructure Setup
```bash
# 1. Create RDS PostgreSQL instance with pgvector
# 2. Create S3 bucket for audio files
# 3. Set up ECS cluster
# 4. Configure CloudFront distribution
# 5. Set up Application Load Balancer
```

### Step 2: Docker Configuration
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Step 3: ECS Task Definition
```json
{
  "family": "brainer-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "brainer-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/brainer:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:brainer/database-url"
        }
      ]
    }
  ]
}
```

---

## 🛠️ Option 3: Railway/Render Deployment

### Railway (Simplified)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and create project
railway login
railway init

# 3. Add PostgreSQL service
railway add postgresql

# 4. Deploy
railway up
```

### Render (Alternative)
```yaml
# render.yaml
services:
  - type: web
    name: brainer-app
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: brainer-db
          property: connectionString

databases:
  - name: brainer-db
    databaseName: brainer
    user: brainer
```

---

## 🔧 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] AWS services configured and tested
- [ ] Firebase project set up
- [ ] Stripe webhooks configured

### 2. Security
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] API rate limiting implemented
- [ ] Environment secrets secured

### 3. Performance
- [ ] Images optimized
- [ ] Bundle size analyzed
- [ ] Database queries optimized
- [ ] CDN configured for static assets

### 4. Monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (Vercel Analytics)
- [ ] Performance monitoring
- [ ] Database monitoring

---

## 🔄 CI/CD Pipeline

### GitHub Actions (for Vercel)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 🌐 Domain & DNS Setup

### Custom Domain
```bash
# 1. Purchase domain
# 2. Configure DNS records:
#    - A record: @ → Your deployment IP
#    - CNAME: www → your-app.vercel.app
# 3. Add domain to Vercel/AWS
# 4. Configure SSL certificate
```

---

## 📊 Production Monitoring

### Essential Monitoring
```bash
# 1. Application Performance
# - Response times
# - Error rates
# - Database performance

# 2. Infrastructure
# - CPU/Memory usage
# - Database connections
# - AWS service costs

# 3. Business Metrics
# - User signups
# - Voice note uploads
# - Transcription success rates
```

---

## 🚨 Troubleshooting

### Common Issues
1. **Database Connection**: Check connection string and network access
2. **AWS Services**: Verify credentials and permissions
3. **Firebase Auth**: Ensure service account key is properly formatted
4. **Stripe Webhooks**: Check endpoint URL and secret
5. **Build Failures**: Review dependencies and environment variables

### Debug Commands
```bash
# Check database connection
npx prisma db pull

# Test AWS services
npm run test:aws

# Verify Firebase config
npm run test:firebase

# Check build locally
npm run build && npm run start
```

---

## 🎯 Recommended Deployment Flow

1. **Start with Vercel** (fastest to market)
2. **Use Neon for PostgreSQL** (serverless, auto-scaling)
3. **Configure AWS services** (S3 + Transcribe)
4. **Set up monitoring** (Vercel Analytics + Sentry)
5. **Scale to AWS** when needed

This approach gets you deployed quickly while maintaining the ability to scale and optimize later.

## 🔗 Quick Start Commands

```bash
# 1. Prepare environment
cp .env.local.example .env.local
# Fill in your environment variables

# 2. Set up database
npm run db:migrate
npm run db:seed

# 3. Test locally
npm run dev

# 4. Deploy to Vercel
vercel --prod

# 5. Run post-deployment setup
npm run db:migrate:deploy
```

Your Brainer app will be live and ready to help users build their digital brains! 🧠✨ 