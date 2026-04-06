# SafeRoute - Railway Deployment Guide

## 🎯 Goal: Deploy Phase 1 to Production (FREE)

**Platform:** Railway ($5/month free credit)  
**What gets deployed:**
- ✅ API Server (Node.js)
- ✅ Admin Panel (Next.js)
- ✅ PostgreSQL Database
- ✅ Redis (Upstash - free tier)
- ✅ GPS Service (Go) - optional for now

**Estimated Time:** 30-45 minutes  
**Cost:** $0/month (within free tier)

---

## 📝 Prerequisites

Before starting, ensure you have:
- [ ] GitHub account
- [ ] Railway account (sign up at railway.app)
- [ ] Code pushed to GitHub
- [ ] All tests passing locally

---

## 🚀 Step-by-Step Deployment

### STEP 1: Push Code to GitHub (5 min)

```bash
# If not already done
cd D:\BusTrack\saferoute
git init
git add .
git commit -m "Phase 1 complete - ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/saferoute.git
git push -u origin main
```

**Verify:** Check GitHub repo has all files

---

### STEP 2: Create Railway Project (5 min)

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `saferoute` repository
5. Click "Deploy"

**Railway will auto-detect:**
- Node.js API (from package.json)
- Next.js Admin (from apps/admin/package.json)
- Go service (from apps/gps-service/main.go)

---

### STEP 3: Add PostgreSQL Database (2 min)

1. In Railway dashboard, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway creates database automatically
4. Click on the database service
5. Go to "Connect" tab
6. Copy the "Postgres Connection URL"

**Save this URL - you'll need it!**

---

### STEP 4: Add Redis (Upstash) (3 min)

1. Go to https://console.upstash.com
2. Sign up (free, no credit card)
3. Click "Create Database"
4. Select region closest to your users (e.g., ap-south-1 for India)
5. Choose "Free" tier
6. After creation, go to "Database Details"
7. Copy the "redis://..." URL

**Save this URL - you'll need it!**

---

### STEP 5: Configure Environment Variables (10 min)

**In Railway dashboard:**

#### API Service Variables:
```
NODE_ENV=production
PORT=3001
DATABASE_URL=<paste from Step 3>
REDIS_URL=<paste from Step 4>
JWT_SECRET=<generate_random_32_char_string>
JWT_REFRESH_SECRET=<generate_different_32_char_string>
CLIENT_URL=<will_fill_after_admin_deploy>
```

#### Admin Panel Variables:
```
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=<will_fill_after_api_deploy>/api
```

#### GPS Service Variables:
```
NODE_ENV=production
PORT=3002
TIMESCALEDB_URL=<same as DATABASE_URL>
REDIS_URL=<same as Step 4>
JWT_SECRET=<same as API JWT_SECRET>
```

**Generate secrets:**
```bash
# Run this in PowerShell to generate random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### STEP 6: Deploy API Server (5 min)

1. In Railway, click on your API service
2. Click "Settings"
3. Under "Start Command", enter: `cd apps/api && npm start`
4. Click "Deploy"
5. Wait for deployment (2-3 minutes)
6. Railway gives you a URL: `https://saferoute-api.up.railway.app`

**Test it:**
```bash
curl https://saferoute-api.up.railway.app/api/health
# Should return: {"status":"ok"}
```

---

### STEP 7: Deploy Admin Panel (5 min)

1. In Railway, click "New" → "Service"
2. Select your GitHub repo again
3. Click on the new service
4. Settings → Start Command: `cd apps/admin && npm start`
5. Add variable: `NEXT_PUBLIC_API_URL=https://saferoute-api.up.railway.app/api`
6. Click "Deploy"
7. Railway gives you URL: `https://saferoute-admin.up.railway.app`

**Test it:**
Open the URL in browser - should see login page

---

### STEP 8: Update API with Admin URL (2 min)

1. Go back to API service in Railway
2. Add variable: `CLIENT_URL=https://saferoute-admin.up.railway.app`
3. Redeploy API (click "Deploy")

---

### STEP 9: Deploy GPS Service (Optional - 3 min)

If you want real-time GPS in production:

1. Railway → New → Service → GitHub repo
2. Settings → Start Command: `cd apps/gps-service && go run main.go`
3. Add all GPS environment variables
4. Deploy

---

## ✅ Post-Deployment Verification

### Test Checklist:
- [ ] API health: `GET https://your-api.up.railway.app/api/health`
- [ ] Admin loads: Open admin URL in browser
- [ ] Register school: Create test school via admin
- [ ] Database: Check data saved in Railway PostgreSQL
- [ ] Redis: Check Upstash dashboard for connections

---

## 🔒 Security Precautions

### 1. Environment Variables
- ✅ Never commit .env files to GitHub
- ✅ Use strong JWT secrets (32+ random chars)
- ✅ Different secrets for dev and production
- ✅ Restrict database access (Railway does this)

### 2. Database Security
- ✅ Railway PostgreSQL is private (no public access)
- ✅ Only your services can connect
- ✅ SSL encryption enabled by default

### 3. API Security
- ✅ CORS configured (CLIENT_URL variable)
- ✅ Rate limiting enabled (Redis-backed)
- ✅ JWT tokens expire in 15 minutes
- ✅ Input validation on all endpoints

---

## 📊 Monitoring & Health Checks

### Railway Built-in:
- ✅ Automatic restarts on crash
- ✅ Health checks every 100 seconds
- ✅ Logs streaming (real-time)
- ✅ Metrics dashboard

### Add Custom Monitoring:
1. Railway → Service → Metrics
2. Watch for:
   - CPU usage < 80%
   - Memory usage < 80%
   - Response time < 500ms
   - Error rate < 1%

---

## 🔄 Continuous Deployment

### Auto-deploy on Git push:
Railway automatically deploys when you push to GitHub main branch.

### Manual deploy:
Railway dashboard → Service → Deploy

---

## 💰 Cost Management (Stay FREE)

### Railway Free Tier ($5/month):
| Service | Cost | Within Free? |
|---------|------|--------------|
| API Server | ~$2/mo | ✅ Yes |
| Admin Panel | ~$1/mo | ✅ Yes |
| PostgreSQL | ~$1/mo | ✅ Yes |
| Redis (Upstash) | $0 | ✅ Free tier |
| **Total** | ~$4/mo | ✅ **FREE** |

### Tips to stay free:
1. Don't add extra services
2. Use free Upstash Redis (not Railway Redis)
3. Monitor usage in Railway dashboard
4. Set up billing alerts at $4

---

## 🆘 Troubleshooting

### Problem: API won't start
**Solution:**
1. Check logs: Railway → Service → Logs
2. Verify DATABASE_URL is correct
3. Ensure schema is migrated: `npx prisma db push`

### Problem: Admin can't connect to API
**Solution:**
1. Check NEXT_PUBLIC_API_URL has /api at end
2. Verify CORS: CLIENT_URL must match admin domain
3. Check API health endpoint

### Problem: Database connection failed
**Solution:**
1. Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
2. Check Railway database is "Available"
3. Redeploy after fixing URL

### Problem: Out of free credits
**Solution:**
1. Railway gives $5/month - usually enough
2. If exceeded, upgrade to $5 paid plan
3. Or optimize: remove unused services

---

## 📋 Final Checklist Before Going Live

- [ ] All services deployed and healthy
- [ ] Environment variables set correctly
- [ ] Database migrated with Prisma
- [ ] Redis connected and working
- [ ] API responding to health checks
- [ ] Admin panel loading in browser
- [ ] Test user can register/login
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (Railway provides)
- [ ] Monitoring alerts set up

---

## 🎉 You're Live!

Once everything is green:
1. Share the admin URL with your team
2. Register your first school
3. Start using the system
4. Build mobile apps (Phase 2) while users use admin

**Questions?** Check Railway docs: https://docs.railway.app

---

**Ready to deploy?** Start with Step 1 (GitHub push) and I'll guide you through each step!
