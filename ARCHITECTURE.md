# SafeRoute Production Architecture

## Port Allocation (NO CONFLICTS)

| Service | Port | Purpose | Type |
|---------|------|---------|------|
| **API Server** | 3001 | Backend API + WebSocket | Node.js |
| **GPS Service** | 3002 | GPS WebSocket handler | Go |
| **Admin Panel** | 3000 | Web dashboard | Next.js |
| **Driver App** | 19000 | Expo Metro bundler | React Native |
| **Parent App** | 19001 | Expo Metro bundler | React Native |
| **Redis** | 6379 | Cache + Pub/Sub | Redis |
| **PostgreSQL** | 5432 | Main database | PostgreSQL |

---

## Do You NEED Redis? 

### SHORT ANSWER: YES FOR PRODUCTION ⚠️

**Without Redis (Current State):**
- ✅ Works for testing (< 100 concurrent users)
- ⚠️ OTP stored in memory (lost on restart)
- ⚠️ Rate limiting per instance only
- ⚠️ No distributed WebSocket broadcasting
- ⚠️ Session data lost on API restart
- ❌ Cannot scale to multiple API servers

**With Redis (Production Required):**
- ✅ Handles 10,000+ concurrent users
- ✅ OTP persists across restarts
- ✅ Global rate limiting across all servers
- ✅ Real-time pub/sub for all connected clients
- ✅ Session persistence
- ✅ Can scale horizontally (multiple API servers)

### For Your Use Case (School Bus Tracking):

| Scenario | Need Redis? |
|----------|-------------|
| 1 school, 5 buses, 50 parents | Optional (memory fallback OK) |
| 1 school, 20 buses, 500 parents | **YES** - Recommended |
| Multiple schools, 100+ buses | **YES - REQUIRED** |
| District level (1000+ buses) | **YES - REQUIRED + Cluster** |

---

## Do You NEED TimescaleDB?

### SHORT ANSWER: OPTIONAL BUT RECOMMENDED FOR SCALE ⚠️

**Current Setup (Regular PostgreSQL):**
- ✅ GPS pings store normally
- ✅ Queries work fine
- ⚠️ Slower with millions of GPS records
- ⚠️ Table bloat over time
- ⚠️ Hard to query time ranges efficiently

**With TimescaleDB:**
- ✅ 10x faster time-series queries
- ✅ Automatic data partitioning (by time)
- ✅ Efficient data compression
- ✅ Built-in retention policies
- ✅ Better for 1M+ GPS records

### GPS Data Volume Calculation:

```
1 bus × 1 ping/second × 8 hours/day = 28,800 pings/day
20 buses = 576,000 pings/day
100 buses = 2,880,000 pings/day (86M/month!)
```

| Bus Fleet | PostgreSQL OK? | TimescaleDB Recommended? |
|-----------|---------------|--------------------------|
| < 10 buses | ✅ Yes | ⚪ Optional |
| 10-50 buses | ⚠️ OK short term | ✅ Yes |
| 50+ buses | ❌ Will struggle | ✅ **REQUIRED** |

---

## Recommended Production Stack

### Minimum Production (1 School, < 20 buses):
```
✅ PostgreSQL (Supabase) - Database
✅ Redis (Upstash or self-hosted) - Cache + Pub/Sub
⚠️ TimescaleDB - Nice to have but not critical
✅ 1 API Server (Node.js)
✅ 1 GPS Service (Go)
```

### Standard Production (1 School, 20-100 buses):
```
✅ PostgreSQL (managed with connection pooling)
✅ **Redis (REQUIRED)** - Upstash or AWS ElastiCache
✅ **TimescaleDB (REQUIRED)** - For GPS data
✅ 2-3 API Servers (load balanced)
✅ 1 GPS Service (can handle high load)
```

### Enterprise (District, 100+ buses):
```
✅ PostgreSQL (RDS/Cloud SQL with read replicas)
✅ **Redis Cluster (REQUIRED)**
✅ **TimescaleDB (REQUIRED)**
✅ API Servers (auto-scaling group)
✅ GPS Services (multiple instances)
✅ CDN for static assets
✅ Message Queue (BullMQ + Redis) for notifications
```

---

## Installing Redis (Windows)

### Option 1: Redis for Windows (Easiest)
```bash
# Download from: https://github.com/tporadowski/redis/releases
# Install redis-x64-5.0.14.1.msi
# Redis will run as Windows service on port 6379
```

### Option 2: Docker (Recommended for development)
```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

### Option 3: Upstash (Cloud - Best for production)
```
1. Go to https://upstash.com
2. Create free Redis database
3. Get REDIS_URL
4. No installation needed!
```

---

## Installing TimescaleDB

### Option 1: Self-hosted (Complex)
```bash
# Requires PostgreSQL with TimescaleDB extension
# Install on Linux server
```

### Option 2: Timescale Cloud (Recommended)
```
1. Go to https://www.timescale.com/cloud
2. Create free database (30-day trial)
3. Get connection string
4. Use instead of Supabase for GPS data only
```

### Option 3: Skip For Now (Current setup works!)
```
Your Supabase PostgreSQL handles GPS data fine.
Only upgrade to TimescaleDB when you hit performance issues
with 50+ buses.
```

---

## Summary: What You NEED Now

### For Immediate Testing (Current State):
- ✅ Everything works as-is!
- ⚠️ Redis = nice to have (install if you want)
- ⚠️ TimescaleDB = not needed yet

### For Production Launch (Real School):
| Component | Priority | Why |
|-----------|----------|-----|
| **Redis** | 🔴 CRITICAL | WebSocket broadcasting, OTP, sessions |
| **TimescaleDB** | 🟡 MEDIUM | GPS data at scale (50+ buses) |
| **Connection Pooling** | 🟡 MEDIUM | Database performance |
| **Load Balancer** | 🟢 LOW | Only if 1000+ users |

### My Recommendation:
```
1. Install Redis NOW (5 minutes, fixes all pub/sub issues)
   → Use Docker or Upstash (free tier)

2. Keep TimescaleDB in mind
   → Upgrade when you have 20+ buses running daily

3. Current Supabase PostgreSQL is fine for now
   → Can handle 10-20 buses easily
```

---

## Next Steps

1. **Fix ports** - I'll update all .env files now
2. **Install Redis** - Use Docker or Upstash
3. **Test with load** - Simulate multiple buses
4. **Monitor performance** - Watch database size

**Want me to set up Redis for you now?**
