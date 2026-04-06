# 🚀 SafeRoute Production Setup Guide

## ⚡ QUICK ANSWER: Do You NEED Redis & TimescaleDB?

### For Testing (Current Setup): 
- ❌ Redis = Optional (works with memory fallback)
- ❌ TimescaleDB = Optional (regular PostgreSQL works)

### For Production (Real School with 20+ buses):
- 🔴 **Redis = REQUIRED** (WebSocket broadcasting breaks without it!)
- 🟡 **TimescaleDB = Recommended** (GPS queries get slow with 1M+ records)

---

## 🎯 Why Redis is CRITICAL for Production

### WITHOUT Redis (Memory Fallback):
```
❌ Problem 1: WebSocket broadcasting fails
   → Driver GPS updates don't reach Admin/Parent apps
   
❌ Problem 2: OTP codes lost on API restart
   → Parents can't login after deployment
   
❌ Problem 3: Rate limiting per server only
   → Users hit limits randomly
   
❌ Problem 4: Can't scale to multiple API servers
   → Stuck with 1 server = 500 users max
```

### WITH Redis:
```
✅ WebSocket pub/sub works across all servers
✅ OTP persists across restarts
✅ Global rate limiting
✅ Can scale to 10,000+ concurrent users
✅ Session management works properly
```

**VERDICT: Install Redis BEFORE going to production!**

---

## 🎯 Why TimescaleDB is RECOMMENDED for Scale

### Data Volume Math:
```
1 bus × 1 ping/sec × 8 hours/day × 20 days/month = 5.7M pings/month
50 buses = 288M pings/month = 3.4B pings/year!
```

### WITHOUT TimescaleDB:
```
⚠️ Regular PostgreSQL handles 100M rows OK
⚠️ Queries slow down after 500M rows
❌ Deleting old data is painful
```

### WITH TimescaleDB:
```
✅ Automatic time-based partitioning
✅ 10x faster time-range queries
✅ Built-in data retention (auto-delete old GPS)
✅ Compression saves 90% disk space
```

**VERDICT: Upgrade to TimescaleDB when you hit 50+ buses!**

---

## 📋 Port Allocation (NO CONFLICTS)

| Service | Port | Type | Status |
|---------|------|------|--------|
| **API Server** | 3001 | Node.js | ✅ Core backend |
| **GPS Service** | 3002 | Go | ✅ GPS WebSocket |
| **Admin Panel** | 3000 | Next.js | ✅ Web dashboard |
| **Driver App** | 19000 | Expo | 📱 Mobile (metro) |
| **Parent App** | 19001 | Expo | 📱 Mobile (metro) |
| **Redis** | 6379 | Redis | 🔴 Required for prod |
| **PostgreSQL** | 5432 | Database | ✅ Supabase |

---

## 🔧 Installing Redis (5 Minutes)

### Option 1: Docker (Easiest for Development)
```bash
# Install Docker Desktop first
# Then run:
docker run -d --name redis -p 6379:6379 redis:latest

# Redis now running on localhost:6379
```

### Option 2: Windows Native
```bash
# 1. Download: https://github.com/tporadowski/redis/releases
# 2. Install: Redis-x64-5.0.14.1.msi
# 3. Redis runs as Windows service
```

### Option 3: Upstash Cloud (Best for Production)
```
1. Go to https://console.upstash.com
2. Create FREE Redis database
3. Copy REDIS_URL
4. Paste in apps/api/.env and apps/gps-service/.env
```

---

## 🔧 Installing TimescaleDB (Optional)

### Option 1: Timescale Cloud (Recommended)
```
1. Go to https://console.timescale.com
2. Create database
3. Get connection string
4. Use for GPS data only
```

### Option 2: Keep Current Supabase (OK for <50 buses)
```
Your current PostgreSQL works fine!
Only upgrade if GPS queries get slow.
```

---

## ✅ Updated Configuration (Ports Fixed)

### apps/api/.env
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="your-supabase-url"
JWT_SECRET="your-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
REDIS_URL="redis://localhost:6379"  # ← Add this
CLIENT_URL="http://localhost:3000"
```

### apps/gps-service/.env
```env
NODE_ENV=development
PORT=3002  # ← Changed from 8081
TIMESCALEDB_URL="your-db-url"
REDIS_URL="redis://localhost:6379"  # ← Add this (remove redis:// for Go)
JWT_SECRET="your-secret"
```

### apps/driver/.env (create if not exists)
```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_WS_URL=ws://localhost:3001
```

### apps/parent/.env (create if not exists)
```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_WS_URL=ws://localhost:3001
```

---

## 🚀 Start Commands (All Ports Fixed)

```bash
# Start everything (3 services)
start.bat

# Or individually:
npm run dev:api      # Port 3001
npm run dev:gps      # Port 3002
npm run dev:admin    # Port 3000
npm run dev:driver   # Port 19000
npm run dev:parent   # Port 19001
```

---

## 📊 Capacity Planning

| Buses | Parents | Need Redis? | Need TimescaleDB? |
|-------|---------|-------------|-------------------|
| 1-5 | 50 | Optional | No |
| 5-20 | 200 | ✅ Yes | No |
| 20-50 | 500 | ✅ Yes | ✅ Yes |
| 50-100 | 1000 | ✅ Yes | ✅ Yes |
| 100+ | 2000+ | ✅ Yes + Cluster | ✅ Yes |

---

## 🎯 Summary

### MUST DO Before Production:
1. ✅ Install Redis (5 minutes with Docker)
2. ✅ Update all .env files with REDIS_URL
3. ✅ Test with health.bat

### SHOULD DO for Scale:
4. 🟡 Set up TimescaleDB (only when 50+ buses)
5. 🟡 Add connection pooling
6. 🟡 Set up load balancer

### Current Status:
- ✅ All ports fixed (no conflicts)
- ✅ Services start cleanly
- ⚠️ Install Redis for production!
- ⚠️ TimescaleDB = future upgrade

---

## 🔴 Critical Warning

**Without Redis in production:**
- WebSocket real-time updates WILL FAIL
- Driver locations won't show on Admin map
- Parents won't see live bus tracking
- System can't handle >500 concurrent users

**Install Redis NOW - it's FREE and takes 5 minutes!**

---

## ✅ Health Check After Setup

Run these to verify:
```bash
# 1. Check Redis
redis-cli ping
# Should return: PONG

# 2. Check all services
health.bat

# 3. Run full test
npm test
```

All should show ✅ for production-ready system!
