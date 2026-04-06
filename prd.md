# SafeRoute (BusTrackr) - Product Requirements Document (PRD)

## Product Name: BusTrackr (Working Title: SafeRoute)
**Version:** 1.0 — Pilot Release
**Goal:** Deploy to one real school, validate, then scale.
**Platforms:**
- **Web (Admin Panel):** Next.js
- **Driver App:** React Native + Expo (iOS + Android)
- **Parent App:** React Native + Expo (iOS + Android)
**Model:** Free for pilot, SaaS subscription after validation.

---

## Product Vision
A school bus tracking system that gives parents real-time peace of mind, gives school admins full fleet control, and gives drivers a simple tool that works even in poor network conditions. Built the way Uber and Zomato build tracking — event-driven, offline-resilient, sub-500ms updates.

---

## Three Apps, One System

| App | Who Uses It | Platform |
| :--- | :--- | :--- |
| **Admin Panel** | School admin / principal | Web (Next.js) |
| **Driver App** | Bus driver | iOS + Android (React Native) |
| **Parent App** | Parent / guardian | iOS + Android (React Native) |

---

## Roles and Permissions Summary

| Action | Admin | Driver | Parent |
| :--- | :--- | :--- | :--- |
| Register school | Yes | No | No |
| Create routes/stops | Yes | No | No |
| Create driver accounts | Yes | No | No |
| Create student accounts | Yes | No | Yes (own child) |
| Start/end trip | No | Yes | No |
| Send GPS pings | No | Yes | No |
| View live fleet map | Yes (all) | No | No |
| Track own child's bus| No | No | Yes |
| View attendance | Yes (all) | Yes (own trip) | Yes (own child) |
| Configure alerts | Yes | No | Yes (own) |
| View analytics | Yes | No | No |
| Trigger SOS | No | Yes | No |

---

## Tech Stack (The "Vibe" Stack)
- **Frameworks:** Next.js 14 (Admin), React Native + Expo (Mobile Apps)
- **Backend:** Node.js + Express (API Services), Go (Location Service)
- **Database:** PostgreSQL + Supabase (Primary), TimescaleDB (GPS Time-series)
- **Real-time:** Redis + Upstash (Pub/Sub + Session), Socket.io (WebSockets)
- **Storage:** Cloudflare R2 / Supabase Storage (Photos, Exports)
- **Notifications:** FCM (Android) + APNs (iOS) via Firebase Admin SDK, BullMQ for job queueing.
- **Infrastructure:** Railway / Fly.io (Docker Containers), Cloudflare (CDN/SSL)
