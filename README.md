# SafeRoute - School Bus Tracking System

## ⚡ QUICK START - 3 Simple Commands

**New to SafeRoute? Just do this:**

1. **Start everything:** Double-click `start.bat` (or run `npm start`)
2. **Stop everything:** Double-click `stop.bat` (or run `npm run stop`)
3. **Check health:** Double-click `health.bat` (or run `npm run health`)

That's it! No confusion, no complexity.

📖 **[Full Service Management Guide →](SERVICE_MANAGEMENT.md)**

---

## 🚌 What is SafeRoute?

A complete, real-time school bus tracking system with three integrated applications:
- **Admin Panel** (Web): School management, fleet control, real-time tracking
- **Driver App** (Mobile): Trip management, GPS tracking, attendance
- **Parent App** (Mobile): Live child tracking, notifications, trip history

### Phase 1 Status: ✅ COMPLETE
All core functionality is working and tested:
- ✅ Authentication (JWT, OTP, Refresh tokens)
- ✅ School/Bus/Driver/Student/Route Management
- ✅ Real-time GPS tracking with WebSocket
- ✅ Live fleet map
- ✅ Attendance system
- ✅ Geofence alerts

## Features

### Real-Time Tracking
- Sub-500ms GPS updates via WebSocket
- Offline resilience with automatic sync
- Live fleet map for administrators
- Parent view of child's bus location

### Complete Management
- School registration and setup
- Bus fleet management
- Driver management with authentication
- Student enrollment with parent linking
- Route and stop configuration
- Trip scheduling and monitoring

### Smart Attendance
- One-tap student onboarding/drop-off
- Automatic stop arrival detection
- Offline attendance queue
- Daily trip summaries

### Safety Features
- SOS emergency alerts
- Speed monitoring
- Off-route deviation detection
- Real-time notifications to parents

## Tech Stack

### Backend
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: Socket.io WebSockets
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod

### Admin Panel
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **Maps**: Leaflet

### Mobile Apps (Driver & Parent)
- **Framework**: React Native + Expo
- **Navigation**: React Navigation
- **Maps**: React Native Maps
- **Storage**: AsyncStorage
- **Notifications**: Expo Notifications

## Project Structure

```
saferoute/
├── apps/
│   ├── api/                 # Node.js backend API
│   │   ├── src/
│   │   │   ├── routes/      # API routes
│   │   │   ├── middleware/  # Auth, rate limiting
│   │   │   ├── lib/         # Prisma client
│   │   │   └── websocket.ts # Socket.io handlers
│   │   └── package.json
│   ├── admin/               # Next.js admin panel
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   ├── lib/             # API client
│   │   └── store/           # Zustand stores
│   ├── driver/              # React Native driver app
│   └── parent/              # React Native parent app
├── packages/
│   └── db/                  # Prisma schema & client
└── package.json             # Workspace root
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for rate limiting)

### 1. Install Dependencies

```bash
# Install all dependencies across workspaces
npm install

# Generate Prisma client
cd packages/db && npx prisma generate
```

### 2. Set Up Database

```bash
# Create .env file in apps/api
cp apps/api/.env.example apps/api/.env

# Update DATABASE_URL in .env
# Run migrations
cd packages/db && npx prisma migrate dev
```

### 3. Start Development

```bash
# Start all apps in development mode
npm run dev

# Or start individually:
# API Server
cd apps/api && npm run dev

# Admin Panel
cd apps/admin && npm run dev
```

### 4. Access Applications

- Admin Panel: http://localhost:3000
- API Server: http://localhost:3001
- API Documentation: http://localhost:3001/health

## API Endpoints

### Authentication
- `POST /api/auth/register-school` - Register new school
- `POST /api/auth/login` - Login (all roles)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Management (Admin only)
- `GET /api/buses` - List all buses
- `POST /api/buses` - Create bus
- `GET /api/drivers` - List drivers
- `POST /api/drivers` - Create driver
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `POST /api/students/bulk-import` - CSV import
- `GET /api/routes` - List routes
- `POST /api/routes` - Create route with stops

### Trips
- `GET /api/trips` - List trips
- `GET /api/trips/active` - Active trips (fleet map)
- `POST /api/trips/start` - Start trip (driver)
- `POST /api/trips/:id/end` - End trip (driver)
- `POST /api/trips/:id/location/batch` - Batch GPS update

### Attendance
- `GET /api/attendance/trip/:tripId` - Get attendance
- `POST /api/attendance/onboard` - Mark onboard
- `POST /api/attendance/drop` - Mark dropped
- `POST /api/attendance/absent` - Mark absent
- `POST /api/attendance/drop-all` - Drop all at school

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

## WebSocket Events

### Driver → Server
- `location:stream` - Real-time GPS location
- `stop:arrived` - Stop arrival notification
- `attendance:update` - Attendance status change

### Server → Client
- `fleet:update` - Bus location updates (admin)
- `trip:location` - Bus location (parent)
- `stop:arrived` - Stop arrival (parent)
- `attendance:updated` - Attendance updates

## Database Schema

### Core Entities
- **School** - Organization entity
- **User** - Admin, Driver, Parent accounts
- **Bus** - Fleet vehicles
- **Student** - Children with parent linkage
- **Route** - Bus routes with stops
- **Trip** - Daily trip instances
- **GpsPing** - Location history
- **Attendance** - Student trip attendance
- **Alert** - System alerts and notifications

## Deployment

### Free Tier Options

#### Database
- **Supabase** - Free PostgreSQL (500MB)
- **Neon** - Free PostgreSQL (3GB)
- **Railway** - $5 credit/month

#### Backend Hosting
- **Railway** - Easy deployment from GitHub
- **Render** - Free web services
- **Fly.io** - Generous free tier

#### Frontend (Admin Panel)
- **Vercel** - Free for Next.js
- **Netlify** - Free static hosting

#### Mobile Apps
- **Expo EAS** - Free tier for builds
- Published to App Store / Play Store

### Environment Variables

```env
# API
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
REDIS_URL=redis://...

# Admin Panel
NEXT_PUBLIC_API_URL=https://api.saferoute.app/api
NEXT_PUBLIC_WS_URL=wss://api.saferoute.app
```

## Free vs Paid Features

### Free Tier (Pilot)
- Up to 5 buses
- Unlimited students
- 1 school
- Basic analytics
- Email support

### Paid Tier (SaaS)
- Unlimited buses
- Multiple schools (district)
- Advanced analytics
- Priority support
- Custom integrations

## Security Considerations

- All passwords hashed with bcrypt
- JWT tokens with short expiry (15min)
- Refresh token rotation
- Rate limiting on all endpoints
- Role-based access control (RBAC)
- Input validation with Zod
- SQL injection prevention via Prisma

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

- Documentation: https://docs.saferoute.app
- Issues: GitHub Issues
- Email: support@saferoute.app

---

Built with for school safety and parent peace of mind.
