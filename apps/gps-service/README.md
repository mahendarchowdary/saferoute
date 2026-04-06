# SafeRoute GPS Service

Real-time GPS tracking service using Go, WebSockets, TimescaleDB, and Redis.

## Features

- **WebSocket Connections**: Drivers connect and stream GPS data
- **TimescaleDB**: Stores GPS pings with automatic time-based partitioning
- **Redis Pub/Sub**: Real-time location broadcasting to parent apps
- **JWT Authentication**: Secure driver authentication

## Environment Variables

```env
PORT=8081
TIMESCALEDB_URL=postgres://postgres:postgres@localhost:5432/saferoute
REDIS_URL=localhost:6379
JWT_SECRET=your-super-secret-jwt-key
```

## Running

```bash
cd apps/gps-service
go mod download
go run main.go
```

## WebSocket Protocol

**Connection:**
```
ws://localhost:8081/ws?token=<JWT>&tripId=<TRIP_ID>
```

**Message Format:**
```json
{
  "type": "location",
  "data": {
    "trip_id": "trip-123",
    "lat": 12.9716,
    "lng": 77.5946,
    "speed": 45.5,
    "heading": 180,
    "accuracy": 5.0,
    "battery": 85,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## Database Schema

TimescaleDB hypertable for efficient time-series storage:
- 1-hour chunks for recent data
- Automatic compression for older data
- Indexes on trip_id and timestamp

## Architecture

```
Driver App → WebSocket → GPS Service → TimescaleDB (Storage)
                              ↓
                         Redis Pub/Sub
                              ↓
                    Parent App (Real-time)
```
