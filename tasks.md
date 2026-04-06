# SafeRoute (BusTrackr) - Detailed Task List

## Phase 1 — Foundation (P0 - Critical)

### M27 — Backend — GPS Pipeline
- [ ] **T27.1** — Set up Go service with `gorilla/websocket`. Authenticated via JWT.
- [ ] **T27.2** — Build GPS ping handler JSON: `{ trip_id, lat, lng, speed, heading, accuracy, battery, timestamp }`. Write to TimescaleDB.
- [ ] **T27.3** — Build Redis publisher to channel `trip:{tripId}:location`.
- [ ] **T27.4** — Build batch sync endpoint `POST /location/batch` in Node.js service.
- [ ] **T27.5** — Set up TimescaleDB hypertable for `gps_pings` (1 hour chunk interval).

### M1 — Authentication (All Apps)
- [ ] **T1.1** — Set up Node.js auth service (Express + JWT + bcrypt).
- [ ] **T1.2** — Build `POST /auth/register-school` endpoint.
- [ ] **T1.3** — Build `POST /auth/login` endpoint (Returns access + refresh tokens).
- [ ] **T1.4** — Build `POST /auth/refresh` endpoint.
- [ ] **T1.5** — Build `POST /auth/otp/send` & `POST /auth/otp/verify` (Redis TTL 5m).
- [ ] **T1.6** — Build Auth middleware (vaildate JWT, attach `req.user`).
- [ ] **T1.7** — Build Admin Login page (Next.js).
- [ ] **T1.8** — Build Admin Forgot Password flow.
- [ ] **T1.9** — Build Driver Login screen (React Native).
- [ ] **T1.10** — Build Parent Signup screen (React Native).
- [ ] **T1.11** — Build Parent Login screen (React Native).

### M2 — School Setup (Admin Panel)
- [ ] **T2.1** — Build school registration page with map picker (Mapbox/Leaflet).
- [ ] **T2.2** — Build school profile settings page (Logo upload, contact info).
- [ ] **T2.3** — Build `PATCH /schools/:id` endpoint.
- [ ] **T2.4** — File upload endpoint (Cloudflare R2 / Supabase Storage).

### M6 — Bus Management (Admin Panel)
- [ ] **T6.1** — Build buses list page (Table: status, plate, capacity).
- [ ] **T6.2** — Build create/edit bus form.
- [ ] **T6.3** — Build CRUD endpoints for buses.

### M4 — Driver Management (Admin Panel)
- [ ] **T4.1** — Build drivers list page.
- [ ] **T4.2** — Build create/edit driver form.
- [ ] **T4.3** — Build `POST /users` (driver creation) endpoint.
- [ ] **T4.4** — Build driver attendance view.
- [ ] **T4.5** — Build driver detail page (History, alerts, summary).

### M5 — Student Management (Admin Panel)
- [ ] **T5.1** — Build students list page.
- [ ] **T5.2** — Build create/edit student form.
- [ ] **T5.3** — Build `POST /students` endpoint (Auto-link or create parent).
- [ ] **T5.4** — Build CSV bulk import for students.
- [ ] **T5.5** — Build attendance report page (Calendar grid).
- [ ] **T5.6** — Build `GET /attendance` endpoint.

### M3 — Route and Stop Management (Admin Panel)
- [ ] **T3.1** — Build routes list page.
- [ ] **T3.2** — Build create/edit route page with interactive map (Add stops, drag-to-reorder).
- [ ] **T3.3** — Build `POST /routes` endpoint (Auto-calculate distance via OSRM).
- [ ] **T3.4** — Build `PATCH /routes/:id` endpoint (Broadcast update event).
- [ ] **T3.5** — Build Stop CRUD endpoints.
- [ ] **T3.6** — Build real-time route sync (WebSocket broadcast on change).
- [ ] **T3.7** — Build route preview (Animated line, estimated time).

---

## Phase 2 — The Core Trip (Whole Product Value)

### M13 — Driver App — Device Precheck
- [ ] **T13.1** — Build precheck screen (Animated status indicators).
- [ ] **T13.2** — GPS accuracy check (< 20m).
- [ ] **T13.3** — Permissions checks (Foreground + Background).
- [ ] **T13.4** — Battery check (Warn < 20%).
- [ ] **T13.5** — Network check.
- [ ] **T13.6** — Post precheck log to server.

### M14 — Driver App — Duty Start and Trip
- [ ] **T14.1** — Build duty start screen (Select Bus, Route, Shift).
- [ ] **T14.2** — Build `GET /driver/available-buses` endpoint.
- [ ] **T14.3** — Build `GET /driver/routes` endpoint.
- [ ] **T14.4** — Build `POST /trips/start` endpoint (Returns full trip object).
- [ ] **T14.5** — Cache route and student data locally (AsyncStorage).

### M28 — Backend — Geofence Engine
- [ ] **T28.1** — Build geofence check in Location Service (PostGIS `ST_DWithin`).
- [ ] **T28.2** — Build `stop:arrived` event consumer in Trip Service.
- [ ] **T28.3** — Build pre-alert check in Notification Service.
- [ ] **T28.4** — Build off-route deviation check (200m threshold).

### M16 — Driver App — Stop Arrival and Attendance
- [ ] **T16.1** — Build stop arrival detection (Haversine formula).
- [ ] **T16.2** — Build auto-open student list (Bottom sheet).
- [ ] **T16.3** — Build Student List UI (Single tap = onboard, Double tap = absent).
- [ ] **T16.4** — Build auto-close logic (Speed > 10 km/h or Distance > 150m).
- [ ] **T16.5** — Build `POST /attendance/onboard` endpoint.
- [ ] **T16.6** — Build `POST /attendance/drop` endpoint.
- [ ] **T16.7** — Build offline attendance queue (IndexedDB/AsyncStorage).
- [ ] **T16.8** — Build "Drop all" bulk action at school.

### M15 — Driver App — Live Dashboard
- [ ] **T15.1** — Build live dashboard layout (Map + Telemetry Bar).
- [ ] **T15.2** — Build GPS streaming (1 second interval).
- [ ] **T15.3** — Build WebSocket connection manager (Exponential backoff).
- [ ] **T15.4** — Build Telemetry Bar (Live speed, distance, ETA).
- [ ] **T15.5** — Build animated bus marker on map.
- [ ] **T15.6** — Build stop list bottom drawer.
- [ ] **T15.7** — Build ETA recalculation (Every 10 seconds via OSRM).

### M17 — Driver App — SOS and Alerts
- [ ] **T17.1** — Build SOS button UI (2-second hold).
- [ ] **T17.2** — Wire SOS to `POST /alerts/sos`.
- [ ] **T17.3** — Show sent SOS status in driver dashboard.

### M18 — Driver App — End Trip and Summary
- [ ] **T18.1** — Build end trip confirmation (Warn if students still onboard).
- [ ] **T18.2** — Build `POST /trips/:id/end` endpoint (Summary calculation).
- [ ] **T18.3** — Build trip summary screen (Stats cards + full trace map).

### M19 — Driver App — Offline Resilience
- [ ] **T19.1** — Build local GPS queue (Sync to AsyncStorage BEFORE sending).
- [ ] **T19.2** — Build connection state manager (WS states).
- [ ] **T19.3** — Build batch sync on reconnect.
- [ ] **T19.4** — Build trip state persistence (Restore on app crash/restart).
- [ ] **T19.5** — Build `POST /location/batch` endpoint.

---

## Phase 3 — Admin Visibility

### M7 — Admin Dashboard
- [ ] **T7.1** — Build dashboard layout (KPI cards + Active trips table).
- [ ] **T7.2** — Build `GET /dashboard/stats` endpoint.
- [ ] **T7.3** — Wire dashboard to WebSocket (Real-time KPI refreshes).
- [ ] **T7.4** — Build active trips table (Click for live view).

### M8 — Live Fleet Map (Admin Panel)
- [ ] **T8.1** — Build live fleet map page (Map centered at school).
- [ ] **T8.2** — Build animated bus markers.
- [ ] **T8.3** — Subscribe to fleet WebSocket channel.
- [ ] **T8.4** — Build bus info popup.
- [ ] **T8.5** — Build terminal-style stop status sidebar.

### M9 — Trip Monitoring (Admin Panel)
- [ ] **T9.1** — Build trip detail page.
- [ ] **T9.2** — Build live GPS trace (Polyline trail).
- [ ] **T9.3** — Build live student attendance panel.
- [ ] **T9.4** — Build `GET /trips/:id/detail` endpoint.

### M10 — Alerts and Violations (Admin Panel)
- [ ] **T10.1** — Build alerts list page.
- [ ] **T10.2** — Build speed threshold configuration.
- [ ] **T10.3** — Build alert detail page (Resolution log).
- [ ] **T10.4** — Build `POST /alerts/sos` handler (Fan-out to admin/parents).
- [ ] **T10.5** — Build auto-speeding alert in Location Service.
- [ ] **T10.6** — Build `PATCH /alerts/:id/resolve` endpoint.

---

## Phase 4 — Parent Experience

### M29 — Backend — Notification Engine
- [ ] **T29.1** — Set up BullMQ worker for notifications.
- [ ] **T29.2** — Build FCM token registration endpoint.
- [ ] **T29.3** — Build notification job publisher helper.
- [ ] **T29.4** — Build high-priority channel for alerts.
- [ ] **T29.5** — Build notification logging.

### M21 — Parent App — Signup and Child Setup
- [ ] **T21.1** — Build parent signup screen.
- [ ] **T21.2** — Build child-route-stop selector.
- [ ] **T21.3** — Build `POST /parents/register` (Atomic transaction).
- [ ] **T21.4** — Build add/edit child screen.

### M22 — Parent App — Dashboard
- [ ] **T22.1** — Build parent dashboard screen (Child status card).
- [ ] **T22.2** — Subscribe to child's trip WebSocket.
- [ ] **T22.3** — Build ETA-to-stop calculation.
- [ ] **T22.4** — Build no-trip empty state.

### M23 — Parent App — Live Tracking
- [ ] **T23.1** — Build live map screen (Highlight child's stop).
- [ ] **T23.2** — Animate bus marker.
- [ ] **T23.3** — Build ETA overlay pill.
- [ ] **T23.4** — Build stop-passed indicator.

### M24 — Parent App — Notifications
- [ ] **T24.1** — Build notification preferences screen.
- [ ] **T24.2** — Build `PATCH /parent/notification-settings` endpoint.
- [ ] **T24.3** — Build notification trigger logic.
- [ ] **T24.4** — Build high-priority FCM channel.
- [ ] **T24.5** — Build notification history screen.

---

## Phase 5 — Polish and Analytics

### M11 — Trip History and Replay (Admin Panel)
- [ ] **T11.1** — Build trip history list.
- [ ] **T11.2** — Build trip detail/summary page.
- [ ] **T11.3** — Build GPS replay feature (Scrubber + Playback speed).
- [ ] **T11.4** — Build `GET /trips/:id/gps-log` endpoint.

### M12 — Analytics (Admin Panel)
- [ ] **T12.1** — Build analytics page layout (Tabs: Route/Driver/Student/Fleet).
- [ ] **T12.2** — Build `GET /analytics/delays` endpoint (Python/FastAPI or Node).
- [ ] **T12.3** — Build `GET /analytics/speeding` endpoint.
- [ ] **T12.4** — Build `GET /analytics/distance` endpoint.
- [ ] **T12.5** — Build `GET /analytics/attendance` endpoint.
- [ ] **T12.6** — Render charts (Recharts/Chart.js).

### M30 — Backend — Offline Sync
- [ ] **T30.1** — Build idempotency on GPS batch insert.
- [ ] **T30.2** — Build replay geofence on batch pings.
- [ ] **T30.3** — Build `POST /attendance/batch` endpoint.
