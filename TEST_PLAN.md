# SafeRoute Phase 2 - Comprehensive Test Plan

## Pre-Testing Setup

### 1. Environment Variables (Check these are set in Railway)

**API Service:**
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Authentication
- `JWT_REFRESH_SECRET` - Token refresh
- `FCM_SERVER_KEY` - (Optional) For push notifications

**Admin Panel:**
- `NEXT_PUBLIC_API_URL` - `https://your-api.up.railway.app/api`

**Mobile Apps:**
- `EXPO_PUBLIC_API_URL` - `https://your-api.up.railway.app/api`

---

## Test Suite 1: Backend API (M28 & M29)

### 1.1 Geofence Engine Tests

**Test 1.1.1: Stop Arrival Detection**
```bash
# Start a trip via API
POST https://your-api.up.railway.app/api/trips/start
Body: {
  "busId": "your-bus-id",
  "routeId": "your-route-id",
  "shift": "MORNING"
}

# Send GPS location within 150m of a stop
POST https://your-api.up.railway.app/api/trips/{tripId}/location/batch
Body: {
  "points": [{
    "lat": stop.latitude + 0.001,  // ~110m
    "lng": stop.longitude,
    "timestamp": Date.now()
  }]
}
```
**Expected:** WebSocket event `stop:arrived` emitted

**Test 1.1.2: Route Deviation**
```bash
# Send GPS far from route (>200m)
POST /api/trips/{tripId}/location/batch
Body: {
  "points": [{
    "lat": stop.latitude + 0.003,  // ~330m off
    "lng": stop.longitude + 0.003,
    "timestamp": Date.now()
  }]
}
```
**Expected:** WebSocket event `alert:deviation` emitted

**Test 1.1.3: ETA Calculation**
```bash
# Check ETA in WebSocket messages
# Look for `eta` field in `stop:approaching` events
```
**Expected:** ETA calculated based on distance and 20km/h average

### 1.2 Notification Engine Tests

**Test 1.2.1: FCM Token Registration**
```bash
POST /api/auth/fcm-token
Headers: Authorization: Bearer {driver_token}
Body: {
  "token": "test-fcm-token-12345",
  "device": "android"
}
```
**Expected:** 200 OK, token stored in database

**Test 1.2.2: Stop Arrival Notification**
```bash
# Trigger stop arrival via GPS
# Check if notification log created
GET /api/notifications/history
```
**Expected:** NotificationLog entry created with `type: STOP_ARRIVED`

**Test 1.2.3: SOS Alert Broadcast**
```bash
POST /api/alerts/sos
Headers: Authorization: Bearer {driver_token}
Body: {
  "tripId": "trip-id",
  "message": "Test SOS"
}
```
**Expected:** All admins and parents receive notification

---

## Test Suite 2: Driver App (M13, M15, M16)

### 2.1 Device Precheck (M13)

**Test 2.1.1: GPS Accuracy Check**
1. Open Driver App
2. Login
3. Navigate to `/precheck` (or auto-redirect)
4. Observe GPS check
**Expected:** Shows accuracy in meters (<20m = green, <50m = yellow, >50m = red)

**Test 2.1.2: Location Permissions**
1. Deny location permission when prompted
2. Check precheck screen
**Expected:** Shows "Location permission denied" in red

**Test 2.1.3: Battery Check**
1. Check with battery >50% → Green
2. Check with battery 20-50% → Yellow
3. Check with battery <20% → Red

**Test 2.1.4: Network Check**
1. Connect to WiFi → Shows WiFi name
2. Connect to mobile → Shows "cellular (4G/5G)"
3. Disconnect all → Shows "No network connection"

### 2.2 Live Dashboard (M15)

**Test 2.2.1: Start Trip Flow**
1. Login as driver
2. Select Bus, Route, Shift
3. Click "Start Trip"
4. Navigate to Trip screen
**Expected:** Trip screen opens, GPS tracking starts

**Test 2.2.2: Telemetry Display**
1. During active trip
2. Observe header stats
**Expected:** Shows:
- Speed in km/h (real-time from GPS)
- Onboard count (students marked onboard)
- Pending count (students not yet onboard)

**Test 2.2.3: Route Progress**
1. View stop indicators
2. Stop at each stop
**Expected:** Stop dots turn blue as bus progresses

### 2.3 Stop Arrival & Attendance (M16)

**Test 2.3.1: Manual Attendance Marking**
1. At each stop
2. Tap "Onboard" for each student
**Expected:** Student moves to "Onboard" section

**Test 2.3.2: Drop Students**
1. At destination
2. Tap "Drop" for each student
**Expected:** Student marked as "Dropped"

**Test 2.3.3: Mark Absent**
```bash
# TODO: Implement absent marking UI
# Currently needs API call directly
POST /api/attendance/absent
Body: { "tripId": "id", "studentId": "id" }
```

**Test 2.3.4: Drop All at School**
1. End trip with students still onboard
2. Click "End Trip"
3. Confirm "Drop All & End"
**Expected:** All remaining students marked dropped, trip ended

---

## Test Suite 3: Admin Panel (M8 - Partial)

### 3.1 Live Fleet Map

**Test 3.1.1: View Active Trips**
1. Login as admin
2. Navigate to Fleet page
3. View map
**Expected:** Shows active bus markers

**Test 3.1.2: Real-time Position Updates**
1. Driver starts trip
2. Watch admin map
**Expected:** Bus marker moves every 1-5 seconds

**Test 3.1.3: Stop Status Panel**
1. Click on bus marker
**Expected:** Shows:
- Current speed
- Next stop
- ETA to next stop
- Students onboard

---

## Test Suite 4: Parent App (M22/M23)

### 4.1 Real-time Tracking

**Test 4.1.1: Child's Trip View**
1. Login as parent
2. Select child
3. View tracking screen
**Expected:** Shows:
- Bus location on map
- Current stop
- ETA to child's stop

**Test 4.1.2: Stop Arrived Notification**
1. Bus arrives at child's stop
**Expected:** Push notification received

---

## Test Suite 5: Integration Tests

### 5.1 End-to-End Trip Flow

**Scenario:** Complete morning pickup trip

**Steps:**
1. Admin creates route with 5 stops
2. Admin assigns 20 students to stops
3. Driver logs in, runs precheck (all green)
4. Driver starts trip (MORNING shift)
5. Driver arrives at Stop 1
   - Geofence triggers
   - Parents at Stop 1 get "approaching" notification (500m)
   - Parents get "arrived" notification (150m)
   - Admin sees stop arrival on fleet map
6. Driver marks 5 students as onboard
7. Driver proceeds to Stop 2
8. Repeat for all stops
9. Driver arrives at school
10. Driver marks all remaining students as dropped
11. Driver ends trip

**Expected Results:**
- All GPS points logged
- All attendance recorded
- All parents notified
- Admin has complete trip log

### 5.2 Offline Mode Test

**Test 5.2.1: Offline GPS Queue**
1. Driver starts trip
2. Turn off mobile data
3. Drive around for 5 minutes
4. Turn data back on
**Expected:** GPS points sync when reconnected

---

## Test Suite 6: Edge Cases

### 6.1 Error Handling

**Test 6.1.1: Invalid GPS Data**
```bash
POST /api/trips/{id}/location/batch
Body: { "points": [{ "lat": 999, "lng": 999 }] }
```
**Expected:** Gracefully rejects invalid coordinates

**Test 6.1.2: Duplicate Stop Arrival**
1. Bus stops at same location twice
**Expected:** Only one arrival event (debounced)

**Test 6.1.3: Battery Dies During Trip**
1. Start trip
2. Simulate phone dying
3. Restart app
**Expected:** Trip restored from state (if M14 implemented)

---

## Automated Testing Commands

### Run API Tests
```bash
cd apps/api
npm test
```

### Test WebSocket
```bash
node test-websocket.js
```

### Test Geofence
```bash
node test-geofence.js
```

---

## Performance Benchmarks

| Metric | Target | Test Method |
|--------|--------|-------------|
| GPS→WebSocket latency | <500ms | Measure time from location:stream to fleet:update |
| Stop arrival detection | <2s | Time from entering 150m radius to stop:arrived event |
| Notification delivery | <5s | Time from event to FCM send |
| App start time | <3s | Time from tap to interactive |
| API response time | <200ms | Average API call response |

---

## Bug Reporting Template

```markdown
**Module:** MXX - Module Name
**Test:** Test X.X.X - Test Name
**Expected:** What should happen
**Actual:** What actually happened
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Logs:**
```
Paste relevant logs here
```

**Screenshots:**
Attach if UI-related
```

---

## Sign-off Checklist

- [ ] M28 Geofence Engine tested
- [ ] M29 Notification Engine tested
- [ ] M13 Device Precheck tested
- [ ] M15 Live Dashboard tested
- [ ] M16 Stop Arrival tested
- [ ] Integration tests passed
- [ ] Performance benchmarks met
- [ ] No critical bugs open
- [ ] Ready for deployment

**Tester Name:** _________________
**Date:** _________________
**Signature:** _________________

---

## Next Steps After Testing

1. Fix any bugs found
2. Re-run failed tests
3. Performance optimization if needed
4. **DEPLOY when you say!**

**Ready to test? Start with Test Suite 1!**
