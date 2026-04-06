# SafeRoute Project Structure

## Overview
SafeRoute is a complete school bus tracking system with 3 integrated applications:
- **Admin Panel** (Next.js) - School management web interface
- **Driver App** (React Native/Expo) - Mobile app for bus drivers
- **Parent App** (React Native/Expo) - Mobile app for parents
- **Backend API** (Node.js/Express) - REST API + WebSocket server

## Directory Structure

```
saferoute/
├── apps/
│   ├── api/                    # Backend API (Node.js + Express)
│   │   ├── src/
│   │   │   ├── routes/         # API route handlers
│   │   │   │   ├── auth.ts     # Authentication endpoints
│   │   │   │   ├── bus.ts      # Bus management
│   │   │   │   ├── driver.ts   # Driver management
│   │   │   │   ├── student.ts  # Student management
│   │   │   │   ├── route.ts    # Route & stop management
│   │   │   │   ├── trip.ts     # Trip management
│   │   │   │   ├── attendance.ts # Attendance tracking
│   │   │   │   ├── alert.ts    # Alerts & SOS
│   │   │   │   └── dashboard.ts # Dashboard stats
│   │   │   ├── middleware/     # Express middleware
│   │   │   │   ├── auth.ts     # JWT authentication
│   │   │   │   ├── error.ts    # Error handling
│   │   │   │   └── rateLimit.ts # Rate limiting
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts   # Prisma client
│   │   │   ├── websocket.ts    # Socket.io handlers
│   │   │   └── index.ts        # Server entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── admin/                   # Admin Panel (Next.js 14)
│   │   ├── app/                # App Router
│   │   │   ├── login/          # Login page
│   │   │   ├── register/       # School registration
│   │   │   ├── dashboard/      # Dashboard page
│   │   │   ├── buses/          # Bus management
│   │   │   ├── drivers/        # Driver management
│   │   │   ├── students/       # Student management
│   │   │   ├── routes/         # Route management
│   │   │   ├── trips/          # Trip history
│   │   │   ├── fleet/          # Live fleet map
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── page.tsx        # Home redirect
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   └── toaster.tsx
│   │   │   ├── providers.tsx   # Query client provider
│   │   │   ├── sidebar.tsx     # Navigation sidebar
│   │   │   ├── header.tsx      # Top header
│   │   │   ├── fleet-map.tsx   # Live map component
│   │   │   └── data-table.tsx  # Reusable data table
│   │   ├── lib/
│   │   │   ├── api.ts          # API client
│   │   │   └── utils.ts        # Utility functions
│   │   ├── store/
│   │   │   └── auth.ts         # Zustand auth store
│   │   ├── hooks/
│   │   │   └── use-toast.ts    # Toast hook
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   ├── driver/                  # Driver Mobile App (Expo)
│   │   ├── app/                 # Expo Router
│   │   │   ├── _layout.tsx      # Root layout
│   │   │   ├── index.tsx        # Entry redirect
│   │   │   ├── login.tsx        # Driver login
│   │   │   ├── dashboard.tsx    # Trip selection
│   │   │   ├── trip.tsx         # Active trip screen
│   │   │   └── precheck.tsx     # Device precheck
│   │   ├── components/
│   │   │   ├── map.tsx          # Map component
│   │   │   ├── student-card.tsx # Student attendance card
│   │   │   ├── sos-button.tsx   # Emergency button
│   │   │   └── telemetry-bar.tsx # Speed/ETA display
│   │   ├── lib/
│   │   │   ├── api.ts           # API client
│   │   │   └── socket.ts        # WebSocket client
│   │   ├── store/
│   │   │   └── auth.ts          # Auth + trip state
│   │   ├── hooks/
│   │   │   ├── use-location.ts  # GPS tracking hook
│   │   │   └── use-sync.ts      # Offline sync hook
│   │   ├── assets/
│   │   ├── app.json             # Expo config
│   │   ├── package.json
│   │   └── babel.config.js
│   │
│   └── parent/                  # Parent Mobile App (Expo)
│       ├── app/
│       │   ├── _layout.tsx
│       │   ├── index.tsx
│       │   ├── login.tsx        # Parent login
│       │   ├── signup.tsx       # Parent registration
│       │   ├── dashboard.tsx    # Child status
│       │   ├── tracking.tsx     # Live tracking map
│       │   ├── history.tsx      # Trip history
│       │   └── settings.tsx     # Notification settings
│       ├── components/
│       │   ├── map.tsx
│       │   ├── child-card.tsx
│       │   ├── eta-pill.tsx
│       │   └── notification-list.tsx
│       ├── lib/
│       ├── store/
│       ├── hooks/
│       ├── assets/
│       ├── app.json
│       ├── package.json
│       └── babel.config.js
│
├── packages/
│   └── db/                     # Database Package
│       ├── prisma/
│       │   └── schema.prisma   # Database schema
│       ├── src/
│       │   └── index.ts        # Prisma client export
│       └── package.json
│
├── package.json                # Workspace root
├── turbo.json                  # Turbo config
└── README.md                   # Documentation

## Key Features

### Real-Time Tracking
- Sub-500ms GPS updates via WebSocket
- Background location tracking
- Offline queue with automatic sync
- Live fleet map for admins
- Parent tracking view

### Management Features
- School registration & setup
- Bus fleet management
- Driver accounts & assignments
- Student enrollment with parent linking
- Route planning with stops
- Trip scheduling

### Attendance System
- One-tap onboard/drop
- Automatic stop detection
- Offline mode support
- Daily trip summaries

### Safety Features
- SOS emergency button
- Speed monitoring
- Off-route alerts
- Real-time parent notifications

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL + Prisma ORM
- Socket.io for real-time
- JWT authentication
- Zod validation

### Admin Panel
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query
- Zustand state management
- Leaflet maps

### Mobile Apps
- React Native + Expo
- Expo Router
- React Native Maps
- AsyncStorage
- Expo Location
- Socket.io client

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up database:
   ```bash
   cd packages/db
   npx prisma migrate dev
   ```

3. Start development:
   ```bash
   # Start all apps
   npm run dev
   
   # Or individually:
   cd apps/api && npm run dev      # API on :3001
   cd apps/admin && npm run dev     # Admin on :3000
   cd apps/driver && npm start      # Driver app
   cd apps/parent && npm start      # Parent app
   ```

## Environment Variables

### API (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
REDIS_URL=redis://...
```

### Admin (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Mobile (.env)
```
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_WS_URL=ws://localhost:3001
```

## Deployment

### Free Tier Options
- Database: Supabase (500MB free)
- API: Railway ($5 credit) or Render (free)
- Admin: Vercel (free for Next.js)
- Mobile: Expo EAS (free tier)
