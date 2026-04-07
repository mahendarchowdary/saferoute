# SafeRoute Phase 2 - Implementation Roadmap

## Current Status Overview

### ✅ COMPLETED (Phase 1)
- [x] API Server with all core endpoints
- [x] Admin Panel (Next.js) - Fully functional
- [x] Database with all tables
- [x] Authentication (JWT, OTP, Password reset)
- [x] School/Bus/Driver/Student/Routes management
- [x] Basic Driver App structure (Login, Dashboard, Trip)
- [x] Basic Parent App structure (Login, Dashboard, Tracking)
- [x] WebSocket for real-time GPS tracking
- [x] Alert/SOS system

### 🔄 PHASE 2 - MISSING IMPLEMENTATIONS

## Driver App Modules

### M13 - Device Precheck (MISSING)
**Status:** ⚠️ NOT IMPLEMENTED
**Location:** `apps/driver/app/precheck.tsx` (DOESN'T EXIST)
**Features Needed:**
- [ ] GPS accuracy check (< 20m)
- [ ] Location permissions check
- [ ] Battery level check (warn < 20%)
- [ ] Network connectivity check
- [ ] Animated status indicators UI
- [ ] Pre-check log posting to server

### M14 - Driver Trip Start (PARTIAL)
**Status:** ⚠️ PARTIALLY DONE
**Location:** `apps/driver/app/dashboard.tsx`
**What's Done:**
- [x] Select Bus and Route
- [x] Start trip button
- [x] API integration
**What's Missing:**
- [ ] Shift selection UI (MORNING/AFTERNOON toggle)
- [ ] Duty start screen with animations
- [ ] Cache route and student data locally (AsyncStorage)
- [ ] Trip state persistence (restore on crash)

### M15 - Driver Live Dashboard (PARTIAL)
**Status:** ⚠️ PARTIALLY DONE
**Location:** `apps/driver/app/trip.tsx`
**What's Done:**
- [x] Basic layout
- [x] GPS streaming
- [x] WebSocket connection
- [x] Attendance list
**What's Missing:**
- [ ] Telemetry bar (Live speed, distance, ETA)
- [ ] Animated bus marker on map
- [ ] Stop list bottom drawer
- [ ] ETA recalculation (OSRM integration)
- [ ] Connection state manager (exponential backoff)
- [ ] Offline GPS queue (sync when reconnected)

### M16 - Stop Arrival & Attendance (PARTIAL)
**Status:** ⚠️ PARTIALLY DONE
**Location:** `apps/driver/app/trip.tsx`
**What's Done:**
- [x] Mark attendance (onboard/drop/absent)
- [x] Student list view
**What's Missing:**
- [ ] Stop arrival detection (Haversine formula)
- [ ] Auto-open student list at stop
- [ ] Single tap = onboard, Double tap = absent
- [ ] Auto-close logic (speed > 10km/h or distance > 150m)
- [ ] Offline attendance queue
- [ ] "Drop all" bulk action at school

### M17 - SOS and Alerts (DONE)
**Status:** ✅ COMPLETE
**Location:** `apps/driver/app/trip.tsx`
**Features:**
- [x] SOS button UI
- [x] 2-second hold detection
- [x] API integration for SOS

### M18 - End Trip & Summary (MISSING)
**Status:** ⚠️ NOT IMPLEMENTED
**Location:** `apps/driver/app/trip.tsx` (partial)
**Features Needed:**
- [ ] End trip confirmation (warn if students still onboard)
- [ ] Trip summary screen (stats cards + full trace map)
- [ ] Show trip statistics

### M19 - Offline Resilience (MISSING)
**Status:** ⚠️ NOT IMPLEMENTED
**Features Needed:**
- [ ] Local GPS queue (AsyncStorage)
- [ ] Connection state manager
- [ ] Batch sync on reconnect
- [ ] Trip state persistence

---

## Backend Modules

### M28 - Geofence Engine (MISSING)
**Status:** ⚠️ NOT IMPLEMENTED
**Location:** Should be in `apps/api/src/lib/geofence.ts`
**Features Needed:**
- [ ] PostGIS ST_DWithin for geofence check
- [ ] Stop arrival detection (200m radius)
- [ ] Off-route deviation check (200m threshold)
- [ ] Stop:arrived event consumer
- [ ] Pre-alert check (notify before arrival)
- [ ] Speeding detection

### M29 - Notification Engine (MISSING)
**Status:** ⚠️ NOT IMPLEMENTED
**Location:** Should be in `apps/api/src/lib/notifications.ts`
**Features Needed:**
- [ ] FCM token registration endpoint
- [ ] BullMQ worker for notifications
- [ ] High-priority notification channel
- [ ] Notification trigger logic
- [ ] Fan-out to admin/parents
- [ ] Notification history

---

## Admin Panel Modules

### M7 - Admin Dashboard (PARTIAL)
**Status:** ⚠️ PARTIALLY DONE
**Location:** `apps/admin/app/dashboard/`
**What's Done:**
- [x] Basic layout
- [x] Stats cards
**What's Missing:**
- [ ] Real-time KPI refreshes (WebSocket)
- [ ] Active trips table with live view
- [ ] Better data visualization

### M8 - Live Fleet Map (MISSING)
**Status:** ⚠️ NOT IMPLEMENTED
**Location:** `apps/admin/app/fleet/` (exists but basic)
**Features Needed:**
- [ ] Animated bus markers
- [ ] Fleet WebSocket channel subscription
- [ ] Bus info popup
- [ ] Terminal-style stop status sidebar
- [ ] Real-time position updates

### M9 - Trip Monitoring (PARTIAL)
**Status:** ⚠️ PARTIALLY DONE
**Location:** `apps/admin/app/trips/`
**What's Done:**
- [x] Trip list
- [x] Trip detail page
**What's Missing:**
- [ ] Live GPS trace (polyline trail)
- [ ] Live student attendance panel (real-time updates)
- [ ] Better trip visualization

### M10 - Alerts & Violations (PARTIAL)
**Status:** ⚠️ PARTIALLY DONE
**Location:** `apps/admin/app/alerts/`
**What's Done:**
- [x] Alert list page
- [x] Resolve alerts
**What's Missing:**
- [x] Speed threshold configuration (already in schema?)
- [x] Alert detail page (resolution log)
- [ ] Auto-speeding alert integration

### M11 - Trip History & Replay (MISSING)
**Status:** ⚠️ NOT IMPLEMENTED
**Location:** Should be `apps/admin/app/trips/history/`
**Features Needed:**
- [ ] Trip history list
- [ ] GPS replay feature (scrubber + playback speed)
- [ ] GET /trips/:id/gps-log endpoint
- [ ] Historical trace visualization

### M12 - Analytics (MISSING)
**Status:** ⚠️ NOT IMPLEMENTED
**Location:** Should be `apps/admin/app/analytics/`
**Features Needed:**
- [ ] Analytics page layout (tabs: Route/Driver/Student/Fleet)
- [ ] GET /analytics/delays endpoint
- [ ] GET /analytics/speeding endpoint
- [ ] GET /analytics/distance endpoint
- [ ] GET /analytics/attendance endpoint
- [ ] Charts (Recharts/Chart.js)

---

## Parent App Modules

### M21 - Parent Signup & Child Setup (PARTIAL)
**Status:** ⚠️ PARTIALLY DONE
**Location:** `apps/parent/app/signup.tsx`
**What's Done:**
- [x] Signup screen
- [x] Login screen
**What's Missing:**
- [ ] Child-route-stop selector
- [ ] Add/edit child screen
- [ ] Better registration flow

### M22 - Parent Dashboard (PARTIAL)
**Status:** ⚠️ PARTIALLY DONE
**Location:** `apps/parent/app/dashboard.tsx`
**What's Done:**
- [x] Basic dashboard
- [x] Child status display
**What's Missing:**
- [ ] WebSocket subscription to child's trip
- [ ] ETA-to-stop calculation
- [ ] Better empty state
- [ ] Real-time updates

### M23 - Live Tracking (PARTIAL)
**Status:** ⚠️ PARTIALLY DONE
**Location:** `apps/parent/app/tracking.tsx`
**What's Done:**
- [x] Basic map view
- [x] Bus position display
**What's Missing:**
- [ ] Highlight child's stop
- [ ] Animated bus marker
- [ ] ETA overlay pill
- [ ] Stop-passed indicator
- [ ] WebSocket real-time updates

### M24 - Notifications (MISSING)
**Status:** ⚠️ NOT IMPLEMENTED
**Features Needed:**
- [ ] Notification preferences screen
- [ ] FCM integration
- [ ] Notification trigger logic
- [ ] High-priority FCM channel
- [ ] Notification history screen

---

## Implementation Priority Order

### HIGH PRIORITY (Core Functionality)
1. **M28 - Geofence Engine** (Backend)
2. **M29 - Notification Engine** (Backend)
3. **M15 - Driver Live Dashboard** (Complete features)
4. **M16 - Stop Arrival & Attendance** (Complete features)
5. **M13 - Device Precheck** (Driver App)

### MEDIUM PRIORITY (Experience)
6. **M8 - Live Fleet Map** (Admin Panel)
7. **M9 - Trip Monitoring** (Complete)
8. **M22/M23 - Parent App** (Real-time features)
9. **M14 - Driver Trip Start** (Caching & persistence)

### LOWER PRIORITY (Nice to Have)
10. **M7 - Admin Dashboard** (Real-time)
11. **M10 - Alerts** (Complete)
12. **M11 - Trip History** (Analytics)
13. **M12 - Analytics Dashboard**
14. **M18 - End Trip Summary**
15. **M19 - Offline Resilience**
16. **M21 - Parent Signup** (Polish)
17. **M24 - Notifications** (FCM)

---

## Files to Create/Modify

### New Backend Files
- `apps/api/src/lib/geofence.ts` - Geofence engine
- `apps/api/src/lib/notifications.ts` - Notification service
- `apps/api/src/routes/analytics.ts` - Analytics endpoints
- `apps/api/src/websocket/parent.ts` - Parent WebSocket handlers

### New Driver App Files
- `apps/driver/app/precheck.tsx` - Device precheck screen
- `apps/driver/lib/offline.ts` - Offline queue management
- `apps/driver/lib/geofence.ts` - Client-side geofence

### Modified Driver App Files
- `apps/driver/app/dashboard.tsx` - Add caching
- `apps/driver/app/trip.tsx` - Add telemetry, ETA, offline support
- `apps/driver/store/auth.ts` - Add trip persistence

### New Admin Panel Files
- `apps/admin/app/fleet/live-map.tsx` - Real-time fleet map
- `apps/admin/app/analytics/page.tsx` - Analytics dashboard
- `apps/admin/app/trips/history/page.tsx` - Trip history

### Modified Admin Panel Files
- `apps/admin/app/dashboard/page.tsx` - WebSocket integration
- `apps/admin/app/trips/page.tsx` - Real-time updates

### Modified Parent App Files
- `apps/parent/app/dashboard.tsx` - WebSocket integration
- `apps/parent/app/tracking.tsx` - Real-time tracking
- `apps/parent/lib/api.ts` - Add WebSocket

---

## Testing Checklist

### Unit Tests
- [ ] Geofence calculations
- [ ] Distance calculations (Haversine)
- [ ] ETA calculations
- [ ] Notification triggers

### Integration Tests
- [ ] End-to-end trip flow
- [ ] GPS tracking pipeline
- [ ] WebSocket connections
- [ ] Alert generation

### E2E Tests
- [ ] Driver starts trip → GPS tracking → Stop arrival → Attendance
- [ ] Parent receives notifications
- [ ] Admin sees live fleet
- [ ] Offline mode sync

---

## Deployment Order

1. **Backend** (API + Geofence + Notifications)
2. **Admin Panel** (Update with new features)
3. **Driver App** (Build APK after implementation)
4. **Parent App** (Build APK after implementation)
5. **Test all integrations**
6. **Submit to app stores** (if needed)

---

## Time Estimates (Rough)

| Module | Estimated Time |
|--------|---------------|
| M28 - Geofence Engine | 4-6 hours |
| M29 - Notification Engine | 4-6 hours |
| M13 - Device Precheck | 2-3 hours |
| M15 - Live Dashboard (complete) | 6-8 hours |
| M16 - Stop Arrival | 4-6 hours |
| M8 - Live Fleet Map | 4-6 hours |
| M22/M23 - Parent Real-time | 4-6 hours |
| Others | 8-12 hours |
| **TOTAL** | **~40-50 hours** |

---

## Next Steps

1. Start with **M28 - Geofence Engine** (backend foundation)
2. Then **M29 - Notification Engine** (backend)
3. Then complete **Driver App** features
4. Then **Admin Panel** real-time features
5. Then **Parent App** real-time features
6. Test everything
7. Deploy

**Ready to start implementation? Which module first?**
