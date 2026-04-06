# SafeRoute Phase 1 - End-to-End Testing Plan

**Objective:** Validate complete GPS pipeline and all Phase 1 modules work correctly in real-time scenarios.

**Scope:** Authentication → School Setup → Fleet Management → Route Creation → Trip Start → GPS Streaming → Real-time Tracking → Attendance → Trip End

---

## 📋 Test Execution Order

```
PRE-TEST → MODULE TESTS → INTEGRATION → E2E SCENARIOS → VALIDATION
```

---

## 🎯 Pre-Test Setup (Must Pass Before All Tests)

### T0.1 - Service Health Check
- [ ] Run `health.bat` - All services show ✅
- [ ] API Server responding on :3001
- [ ] GPS Service responding on :3002  
- [ ] Admin Panel accessible on :3000
- [ ] Database connection verified
- [ ] Redis connection verified (if installed)

**Pass Criteria:** All health checks return 200 OK

### T0.2 - Database Seeding
- [ ] Run seed script to create test school
- [ ] Verify school exists in database
- [ ] Create test admin user
- [ ] Verify admin can login

**Command:**
```bash
node seed-test-data.js
```

### T0.3 - Clean Environment
- [ ] Clear browser cache/cookies
- [ ] Reset Expo app cache (if testing mobile)
- [ ] Verify no stale processes running
- [ ] Confirm fresh start state

---

## 🔐 M1 - Authentication Tests (T1.1 - T1.11)

### T1.1 - School Registration
- [ ] POST /auth/register-school creates school and admin
- [ ] School data saved correctly (name, address, lat, lng)
- [ ] Admin user linked to school
- [ ] JWT token returned with school_id
- [ ] Duplicate email returns 409 error

**Test Data:**
```json
{
  "name": "Test Admin",
  "email": "test@school.com",
  "phone": "9876543210",
  "password": "TestPass123",
  "schoolName": "Test School",
  "schoolAddress": "123 Test St",
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

### T1.2 - Admin Login
- [ ] POST /auth/login with email/password returns tokens
- [ ] Access token valid for 15 minutes
- [ ] Refresh token valid for 7 days
- [ ] Invalid credentials return 401
- [ ] Token contains school_id

### T1.3 - Token Refresh
- [ ] POST /auth/refresh with valid refresh token
- [ ] New access token issued
- [ ] Invalid refresh token rejected

### T1.4 - OTP Flow
- [ ] POST /auth/otp/send generates 6-digit code
- [ ] OTP stored in Redis (or memory) with 5min TTL
- [ ] POST /auth/otp/verify validates correct code
- [ ] Wrong code returns error
- [ ] Expired code returns error

### T1.5 - Forgot Password
- [ ] POST /auth/forgot-password creates reset token
- [ ] Token expires after 1 hour
- [ ] POST /auth/reset-password with valid token updates password
- [ ] Invalid token rejected

### T1.6 - Auth Middleware
- [ ] All protected routes require valid token
- [ ] Invalid/expired token returns 401
- [ ] Token without Bearer prefix rejected
- [ ] User attached to req.user correctly

---

## 🏫 M2 - School Setup Tests (T2.1 - T2.4)

### T2.1 - School Profile Update
- [ ] PATCH /schools/:id updates school details
- [ ] Only admin of school can update
- [ ] Other schools' admins cannot modify
- [ ] Logo upload works (if implemented)

### T2.2 - School Data Validation
- [ ] School name required (min 2 chars)
- [ ] Address required (min 5 chars)
- [ ] Valid latitude (-90 to 90)
- [ ] Valid longitude (-180 to 180)

---

## 🚌 M6 - Bus Management Tests (T6.1 - T6.3)

### T6.1 - Bus CRUD Operations
- [ ] GET /buses returns only school's buses
- [ ] POST /buses creates new bus with school_id
- [ ] Plate number must be unique
- [ ] PATCH /buses/:id updates bus details
- [ ] DELETE /buses/:id removes bus
- [ ] Bus status enum: ACTIVE, MAINTENANCE, INACTIVE

**Test Data:**
```json
{
  "plateNumber": "KA-01-AB-1234",
  "model": "Tata Starbus",
  "capacity": 40,
  "status": "ACTIVE"
}
```

### T6.2 - Bus Query Scoping
- [ ] Admin only sees buses from their school
- [ ] Bus count shows in dashboard
- [ ] Cannot access other schools' buses

---

## 👨‍💼 M4 - Driver Management Tests (T4.1 - T4.5)

### T4.1 - Driver CRUD
- [ ] POST /drivers creates driver with role=DRIVER
- [ ] Phone must be unique
- [ ] Password hashed with bcrypt
- [ ] Driver linked to school
- [ ] GET /drivers returns only school's drivers

**Test Data:**
```json
{
  "name": "Test Driver",
  "email": "driver@school.com",
  "phone": "9876543211",
  "password": "DriverPass123"
}
```

### T4.2 - Driver App Resources
- [ ] GET /drivers/available-resources returns buses & routes
- [ ] Only ACTIVE buses shown
- [ ] All routes from school included

### T4.3 - Driver Stats
- [ ] GET /drivers/stats shows trip count
- [ ] Shows active trip if any
- [ ] Shows today's trip count

---

## 👨‍🎓 M5 - Student Management Tests (T5.1 - T5.6)

### T5.1 - Student CRUD
- [ ] POST /students creates student
- [ ] Auto-creates parent if not exists
- [ ] Parent linked to student
- [ ] Student linked to school
- [ ] GET /students returns only school's students

**Test Data:**
```json
{
  "name": "Test Student",
  "rollNumber": "STD001",
  "grade": "5th",
  "parentName": "Parent Name",
  "parentEmail": "parent@email.com",
  "parentPhone": "9876543212",
  "routeId": "route-uuid",
  "stopId": "stop-uuid"
}
```

### T5.2 - Bulk Import
- [ ] POST /students/bulk-import accepts array
- [ ] Creates students + parents atomically
- [ ] Returns success/failure per student
- [ ] Duplicate handling works correctly

### T5.3 - Attendance Reports
- [ ] GET /attendance returns student attendance
- [ ] Filter by date range
- [ ] Shows onboard/dropped/pending/absent counts

---

## 🛣️ M3 - Route & Stop Management (T3.1 - T3.7)

### T3.1 - Route Creation
- [ ] POST /routes creates route with stops
- [ ] Stops ordered by sequence
- [ ] Route linked to school
- [ ] Distance and time estimates calculated

**Test Data:**
```json
{
  "name": "Morning Route A",
  "distanceKm": 12.5,
  "estimatedMin": 45,
  "stops": [
    {
      "name": "Stop 1 - School",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "arrivalMin": 0
    },
    {
      "name": "Stop 2 - Main Gate",
      "latitude": 12.9816,
      "longitude": 77.6046,
      "arrivalMin": 10
    }
  ]
}
```

### T3.2 - Stop Management
- [ ] POST /routes/:id/stops adds stop
- [ ] Sequence numbers auto-assigned
- [ ] Stops geocoded correctly

### T3.3 - Route Scoping
- [ ] GET /routes returns only school's routes
- [ ] Includes stops in response
- [ ] Student count per route shown

---

## 🚀 M27 - GPS Pipeline Tests (T27.1 - T27.5)

### T27.1 - WebSocket Connection
- [ ] Driver can connect to WebSocket with valid JWT
- [ ] Connection rejected without token
- [ ] Connection rejected with invalid token
- [ ] Driver joins trip room on connection

### T27.2 - GPS Ping Reception
- [ ] Driver sends GPS ping every 1 second
- [ ] Ping contains: trip_id, lat, lng, speed, heading, accuracy, battery, timestamp
- [ ] Server receives and validates ping
- [ ] Invalid data rejected

**Test Ping:**
```json
{
  "tripId": "trip-uuid",
  "lat": 12.9716,
  "lng": 77.5946,
  "speed": 25.5,
  "heading": 90,
  "accuracy": 5,
  "battery": 85,
  "timestamp": 1712345678901
}
```

### T27.3 - GPS Storage
- [ ] Ping saved to PostgreSQL (gps_pings table)
- [ ] school_id included in record
- [ ] Timestamp recorded accurately
- [ ] Query by trip_id returns chronologically

### T27.4 - Real-time Broadcasting
- [ ] Admin receives `fleet:update` event
- [ ] Event contains: tripId, driverId, lat, lng, speed, heading
- [ ] Parent receives `trip:location` for child's trip
- [ ] Updates broadcast within 500ms

### T27.5 - Geofence Detection
- [ ] Stop arrival detected within 200m radius
- [ ] `stop:arrived` event fired
- [ ] Alert sent to admin and parents
- [ ] Route deviation detected (>200m from route)
- [ ] `alert:deviation` event fired

### T27.6 - Batch Sync (Offline)
- [ ] POST /trips/:id/location/batch accepts array of pings
- [ ] Stored when online
- [ ] Duplicate detection works

---

## 🚍 M13-M19 - Driver App Tests

### M13 - Device Precheck
- [ ] GPS accuracy check (<20m)
- [ ] Location permissions verified
- [ ] Battery level check
- [ ] Network connectivity check
- [ ] All checks pass before allowing trip start

### M14 - Trip Start
- [ ] Driver selects bus from available list
- [ ] Driver selects route from available list
- [ ] Driver selects shift (MORNING/AFTERNOON)
- [ ] POST /trips/start creates active trip
- [ ] Attendance records auto-created for route students
- [ ] Cannot start second trip while one active

### M15 - Live Dashboard
- [ ] Real-time speed displayed
- [ ] Student count (onboard/pending) shown
- [ ] Route progress indicator
- [ ] Next stop name displayed
- [ ] ETA calculated and updated

### M16 - Attendance Marking
- [ ] Single tap marks student ONBOARD
- [ ] Double tap marks student ABSENT
- [ ] Tap on onboard student marks DROPPED
- [ ] POST /attendance/onboard called
- [ ] POST /attendance/drop called
- [ ] WebSocket broadcasts attendance:update
- [ ] Offline queue works (stored locally, syncs when online)

### M17 - SOS Button
- [ ] Long press (2 seconds) triggers SOS
- [ ] POST /alerts/sos called
- [ ] Alert sent to all school admins
- [ ] Confirmation shown to driver

### M18 - Trip End
- [ ] Warns if students still onboard
- [ ] Option to "Drop All at School"
- [ ] POST /trips/:id/end called
- [ ] Trip status changed to COMPLETED
- [ ] Summary shown (distance, time, attendance)

### M19 - Offline Resilience
- [ ] GPS pings queued in AsyncStorage when offline
- [ ] Queue syncs when connection restored
- [ ] Attendance changes queued offline
- [ ] Trip state persisted (survives app crash)

---

## 🎛️ M7-M10 - Admin Panel Tests

### M7 - Admin Dashboard
- [ ] Shows KPI cards:
  - Active buses count
  - Total students
  - Today's trips
  - Alerts count
- [ ] Real-time updates via WebSocket
- [ ] Click trips table for live view

### M8 - Live Fleet Map
- [ ] Map shows all active buses
- [ ] Bus markers update in real-time (sub-500ms)
- [ ] Marker shows bus plate, driver name, speed
- [ ] Click marker shows bus details
- [ ] Shows last update timestamp
- [ ] Terminal-style stop status sidebar

### M9 - Trip Monitoring
- [ ] Trip detail page shows:
  - Bus info
  - Driver info
  - Route with stops
  - Live GPS trace (polyline)
  - Student attendance panel
- [ ] Attendance updates in real-time
- [ ] GPS trace updates as bus moves

### M10 - Alerts & Violations
- [ ] Alerts list shows:
  - SOS alerts
  - Speeding alerts
  - Route deviation alerts
  - Stop arrival/departure
- [ ] Filter by type, severity, date
- [ ] Mark alerts as resolved
- [ ] Alert detail shows resolution log

---

## 🔗 Integration Test Scenarios

### I1 - Complete Trip Flow
```
Setup: School with 1 bus, 1 driver, 5 students, 1 route with 3 stops

1. Driver logs in → Token received ✅
2. Driver starts trip → Trip active ✅
3. GPS streaming begins → Admin sees bus on map ✅
4. Driver marks students onboard → Attendance updates ✅
5. Bus approaches stop → Geofence alert ✅
6. Parent sees real-time location ✅
7. Driver drops students → Attendance updated ✅
8. Driver ends trip → Summary shown ✅
```

### I2 - Multi-Bus Real-time Tracking
```
Setup: 3 buses, 3 drivers, all with active trips

1. All 3 drivers start trips ✅
2. Admin opens fleet map ✅
3. All 3 buses visible with live updates ✅
4. Updates happen simultaneously ✅
5. No data cross-contamination between buses ✅
```

### I3 - Offline to Online Sync
```
Setup: Driver app, trip active

1. Driver goes offline (airplane mode) ✅
2. Driver marks attendance (stored locally) ✅
3. GPS pings queued ✅
4. Driver goes online ✅
5. All data syncs to server ✅
6. Admin sees updated attendance ✅
```

### I4 - School Data Isolation
```
Setup: 2 schools, School A and School B

1. Admin A logs in → Only sees School A data ✅
2. Admin B logs in → Only sees School B data ✅
3. Driver A cannot access School B trips ✅
4. GPS pings scoped to correct school ✅
```

---

## 📊 Performance Tests

### P1 - GPS Throughput
- [ ] System handles 10 GPS pings/second (10 buses)
- [ ] Database write latency < 100ms
- [ ] WebSocket broadcast latency < 100ms
- [ ] No memory leaks over 1 hour

### P2 - Concurrent Users
- [ ] 50 admin users viewing fleet map
- [ ] 50 drivers streaming GPS
- [ ] 500 parents viewing tracking
- [ ] System remains responsive

### P3 - Database Performance
- [ ] GPS ping query by trip_id < 50ms
- [ ] Attendance query by trip_id < 50ms
- [ ] Route with 20 stops loads < 200ms

---

## 🔒 Security Tests

### S1 - Authentication
- [ ] Invalid JWT rejected
- [ ] Expired token rejected
- [ ] Token without role rejected
- [ ] Refresh token rotation works

### S2 - Authorization
- [ ] Driver cannot access admin endpoints
- [ ] Parent cannot access driver endpoints
- [ ] Admin cannot modify other schools' data
- [ ] school_id scoping enforced on all queries

### S3 - Input Validation
- [ ] SQL injection prevented
- [ ] XSS prevention in all inputs
- [ ] File upload validation (type, size)
- [ ] Rate limiting enforced

---

## 🧪 Test Data Requirements

### Minimum Test Data:
```
- 1 School
- 1 Admin
- 2 Buses
- 2 Drivers  
- 10 Students
- 2 Routes (each with 3-5 stops)
- 2 Trips (1 active, 1 completed)
```

### Load Test Data:
```
- 1 School
- 20 Buses
- 20 Drivers
- 500 Students
- 20 Routes
- 20 Active Trips (simultaneous)
```

---

## ✅ Test Completion Criteria

### Phase 1 Ready When:
- [ ] All M1-M6 module tests pass
- [ ] All M27 GPS pipeline tests pass
- [ ] All Integration scenarios pass
- [ ] Performance benchmarks met
- [ ] Security tests pass
- [ ] 0 critical bugs
- [ ] < 5 minor bugs (documented)

### Sign-off Checklist:
- [ ] Test report generated
- [ ] All failing tests fixed or documented
- [ ] Performance metrics recorded
- [ ] Security scan completed
- [ ] Deployment guide validated

---

## 📝 Test Reporting Template

### For Each Failed Test:
```
Test ID: T-X.X
Description: What was being tested
Expected: Expected behavior
Actual: Actual behavior
Steps to Reproduce: 1... 2... 3...
Screenshots: [if applicable]
Priority: Critical/High/Medium/Low
Assigned To: Developer name
```

### Daily Test Summary:
```
Date: YYYY-MM-DD
Tests Run: X
Passed: Y
Failed: Z
Blockers: [List any]
Next Steps: [Plan for tomorrow]
```

---

**Start Testing:** Run `health.bat` → Verify all ✅ → Begin with T1.1

**Good luck! 🚌**
