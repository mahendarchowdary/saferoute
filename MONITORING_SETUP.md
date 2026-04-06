# Monitoring Setup Guide - SafeRoute Production

## 🎯 Complete Monitoring Stack (All FREE)

We use **3 tools** to monitor everything perfectly:
1. **Winston** - Structured logging (local files)
2. **Logtail** - Centralized log aggregation (1GB/month free)
3. **Sentry** - Error tracking & alerts (5,000 errors/month free)

**Total Cost: $0/month**

---

## 📦 What Was Installed

```bash
✅ winston - Structured logging library
✅ @logtail/node - Logtail client
✅ @logtail/winston - Winston transport for Logtail
✅ @sentry/node - Sentry error tracking
```

---

## 🔧 Configuration

### 1. Environment Variables (Add to Railway)

```env
# Logging
LOG_LEVEL=info

# Logtail (Centralized Logs)
LOGTAIL_SOURCE_TOKEN=your_logtail_token_here

# Sentry (Error Tracking)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## 🚀 Setup Steps (5 minutes each)

### Step 1: Logtail Setup (Centralized Logs)

**What it does:** Collects all logs from API, GPS, and Admin in one place

**Setup:**
1. Go to https://logtail.com
2. Sign up (free, no credit card)
3. Click "Create Source"
4. Name it: "SafeRoute Production"
5. Copy the "Source Token"
6. Add to Railway: `LOGTAIL_SOURCE_TOKEN=your_token`

**What you'll see:**
- All API requests logged
- Errors highlighted in red
- Search any log by keyword
- Filter by service (API/GPS/Admin)

---

### Step 2: Sentry Setup (Error Tracking)

**What it does:** Captures errors with stack traces, alerts you immediately

**Setup:**
1. Go to https://sentry.io
2. Sign up (free developer plan)
3. Create project: "saferoute-api"
4. Choose platform: Node.js
5. Copy the DSN (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)
6. Add to Railway: `SENTRY_DSN=your_dsn_here`

**What you'll see:**
- Every error with full stack trace
- Which user caused the error
- Request details (URL, body, headers)
- Performance monitoring
- Email/Slack alerts when errors occur

---

## 📊 What Gets Logged

### API Requests (Every Request)
```json
{
  "timestamp": "2026-04-07 10:30:00",
  "service": "saferoute-api",
  "level": "info",
  "method": "POST",
  "url": "/api/auth/login",
  "status": 200,
  "duration": "150ms",
  "ip": "192.168.1.1",
  "userId": "user_123",
  "schoolId": "school_456"
}
```

### Errors (With Full Context)
```json
{
  "timestamp": "2026-04-07 10:30:00",
  "service": "saferoute-api",
  "level": "error",
  "message": "Database connection failed",
  "error": "Connection timeout",
  "stack": "Error: Connection timeout\n    at ...",
  "method": "POST",
  "url": "/api/trips/start",
  "body": { "busId": "bus_123" },
  "userId": "driver_789",
  "schoolId": "school_456"
}
```

### GPS Tracking (GPS Service)
```json
{
  "timestamp": "2026-04-07 10:30:00",
  "service": "saferoute-gps",
  "level": "info",
  "message": "GPS ping received",
  "tripId": "trip_123",
  "driverId": "driver_456",
  "lat": 12.9716,
  "lng": 77.5946,
  "speed": 25.5,
  "battery": 85
}
```

---

## 🔔 Alerts Setup

### Sentry Alerts (Email/Slack)

**Alert 1: New Error**
- Trigger: Any new error occurs
- Action: Send email immediately

**Alert 2: High Error Rate**
- Trigger: >10 errors in 1 hour
- Action: Send Slack notification

**Alert 3: API Down**
- Trigger: API not responding for 5 minutes
- Action: Call/SMS (paid feature, optional)

**Setup:**
1. Sentry dashboard → Alerts → Create Alert Rule
2. Set conditions as above
3. Add your email/Slack webhook

---

### Logtail Alerts

**Alert: Error Spike**
- Trigger: >50 error logs in 10 minutes
- Action: Send email

**Setup:**
1. Logtail dashboard → Alerts
2. Create alert for "level:error"
3. Set threshold: 50 in 10 minutes

---

## 📱 Mobile App Monitoring (Phase 2)

When you build Driver/Parent apps, add:

### Sentry for React Native
```bash
npm install @sentry/react-native
```

**Tracks:**
- App crashes
- JavaScript errors
- Slow performance
- ANR (Application Not Responding)
- Battery drain issues

---

## 🎯 Dashboard URLs (Bookmark These)

| Tool | URL | What You See |
|------|-----|--------------|
| Railway | https://railway.app | Service health, logs |
| Logtail | https://logtail.com | All logs, search |
| Sentry | https://sentry.io | Errors, performance |
| Upstash | https://console.upstash.com | Redis status |

---

## 🚨 When Errors Happen

### You'll Know Immediately:

1. **Sentry Email:** "New error in saferoute-api"
   - Shows: Error message, stack trace, user info
   - Link: Click to see full details

2. **Logtail Dashboard:** Red error logs
   - Shows: When, where, what caused it
   - Search: Find similar errors

3. **Railway Dashboard:** Service health
   - Shows: CPU spike, memory usage
   - Action: Restart if needed

### Example Error Flow:
```
1. Driver tries to start trip
2. Database connection fails
3. API returns 500 error
4. Sentry captures error immediately
5. You get email: "Error: Database timeout"
6. Logtail shows: Full request details
7. Railway shows: DB connection issue
8. You fix: Restart DB or check network
9. Error resolved in 5 minutes
```

---

## 💰 Cost Summary

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| Winston (local) | Unlimited | Logs to files | $0 |
| Logtail | 1GB/month | ~100MB/month | $0 |
| Sentry | 5,000 errors/month | ~500/month | $0 |
| Railway Dashboard | Unlimited | All services | $0 |
| **TOTAL** | - | - | **$0** |

---

## ✅ Checklist: Monitoring Ready

Before deploying, verify:
- [ ] Winston logger installed (`src/lib/logger.ts` created)
- [ ] Logtail account created
- [ ] Logtail source token added to Railway
- [ ] Sentry account created
- [ ] Sentry DSN added to Railway
- [ ] Railway dashboard bookmarked
- [ ] Logtail dashboard bookmarked
- [ ] Sentry dashboard bookmarked
- [ ] Email alerts configured in Sentry
- [ ] Test: Trigger error, verify it appears in Sentry

---

## 🎉 You're Ready!

With this monitoring setup:
- ✅ Every error is tracked
- ✅ Every request is logged
- ✅ You'll know before users report issues
- ✅ Debug problems in minutes, not hours
- ✅ All FREE

**Next: Deploy to Railway with monitoring enabled!**
