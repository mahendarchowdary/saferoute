/**
 * SafeRoute Geofence Engine
 * Handles stop arrival detection, route deviation checks, and proximity alerts
 */

import { prisma } from './prisma';

// Earth's radius in meters
const EARTH_RADIUS = 6371000;

export interface GPSPoint {
  lat: number;
  lng: number;
  timestamp: Date;
}

export interface StopWithLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
  arrivalMin?: number | null;
}

export interface GeofenceResult {
  isInside: boolean;
  distance: number; // meters
  stop?: StopWithLocation;
}

export interface DeviationResult {
  isDeviated: boolean;
  distanceFromRoute: number; // meters
  nearestPoint?: GPSPoint;
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function haversineDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const dLat = toRadians(point2.lat - point1.lat);
  const dLon = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
    Math.cos(toRadians(point2.lat)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a GPS point is within geofence radius of a stop
 */
export function checkStopGeofence(
  currentLocation: GPSPoint,
  stop: StopWithLocation,
  radius: number = 200 // Default 200m radius
): GeofenceResult {
  const distance = haversineDistance(
    { lat: currentLocation.lat, lng: currentLocation.lng },
    { lat: stop.latitude, lng: stop.longitude }
  );

  return {
    isInside: distance <= radius,
    distance: Math.round(distance),
    stop,
  };
}

/**
 * Find the nearest stop to current location
 */
export function findNearestStop(
  currentLocation: GPSPoint,
  stops: StopWithLocation[]
): GeofenceResult | null {
  if (stops.length === 0) return null;

  let nearest: GeofenceResult | null = null;
  let minDistance = Infinity;

  for (const stop of stops) {
    const result = checkStopGeofence(currentLocation, stop, Infinity);
    if (result.distance < minDistance) {
      minDistance = result.distance;
      nearest = result;
    }
  }

  return nearest;
}

/**
 * Check for route deviation using perpendicular distance to route segments
 */
export function checkRouteDeviation(
  currentLocation: GPSPoint,
  routePoints: GPSPoint[],
  threshold: number = 200 // Default 200m threshold
): DeviationResult {
  if (routePoints.length < 2) {
    return { isDeviated: false, distanceFromRoute: 0 };
  }

  let minDistance = Infinity;
  let nearestPoint: GPSPoint | undefined;

  // Check distance to each route segment
  for (let i = 0; i < routePoints.length - 1; i++) {
    const segmentStart = routePoints[i];
    const segmentEnd = routePoints[i + 1];

    const distance = pointToSegmentDistance(currentLocation, segmentStart, segmentEnd);

    if (distance < minDistance) {
      minDistance = distance;
      // Project point onto segment for nearest point
      nearestPoint = projectPointOntoSegment(currentLocation, segmentStart, segmentEnd);
    }
  }

  return {
    isDeviated: minDistance > threshold,
    distanceFromRoute: Math.round(minDistance),
    nearestPoint,
  };
}

/**
 * Calculate perpendicular distance from point to line segment
 */
function pointToSegmentDistance(
  point: GPSPoint,
  segmentStart: GPSPoint,
  segmentEnd: GPSPoint
): number {
  const dLat = toRadians(segmentEnd.lat - segmentStart.lat);
  const dLon = toRadians(segmentEnd.lng - segmentStart.lng);

  // Convert to Cartesian coordinates for simplification
  // This is an approximation suitable for small distances
  const x1 = toRadians(segmentStart.lng) * Math.cos(toRadians(segmentStart.lat));
  const y1 = toRadians(segmentStart.lat);
  const x2 = toRadians(segmentEnd.lng) * Math.cos(toRadians(segmentEnd.lat));
  const y2 = toRadians(segmentEnd.lat);
  const x = toRadians(point.lng) * Math.cos(toRadians(point.lat));
  const y = toRadians(point.lat);

  // Line segment vector
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Length squared of segment
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Segment is a point
    return haversineDistance(point, segmentStart);
  }

  // Projection factor t [0, 1]
  let t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  // Closest point on segment
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  // Convert back to lat/lng and calculate distance
  const closestLat = closestY * (180 / Math.PI);
  const closestLng = closestX * (180 / Math.PI) / Math.cos(toRadians(closestLat));

  return haversineDistance(point, { lat: closestLat, lng: closestLng, timestamp: new Date() });
}

/**
 * Project point onto line segment
 */
function projectPointOntoSegment(
  point: GPSPoint,
  segmentStart: GPSPoint,
  segmentEnd: GPSPoint
): GPSPoint {
  const dLat = toRadians(segmentEnd.lat - segmentStart.lat);
  const dLon = toRadians(segmentEnd.lng - segmentStart.lng);

  const x1 = toRadians(segmentStart.lng) * Math.cos(toRadians(segmentStart.lat));
  const y1 = toRadians(segmentStart.lat);
  const x2 = toRadians(segmentEnd.lng) * Math.cos(toRadians(segmentEnd.lat));
  const y2 = toRadians(segmentEnd.lat);
  const x = toRadians(point.lng) * Math.cos(toRadians(point.lat));
  const y = toRadians(point.lat);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return segmentStart;
  }

  let t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  const lat = projY * (180 / Math.PI);
  const lng = projX * (180 / Math.PI) / Math.cos(toRadians(lat));

  return { lat, lng, timestamp: new Date() };
}

/**
 * Advanced geofence check using PostGIS (for database queries)
 * This function generates raw SQL for Prisma queries
 */
export function createPostGISWithinQuery(
  point: { lat: number; lng: number },
  radius: number
): string {
  return `
    ST_DWithin(
      ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography,
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
      ${radius}
    )
  `;
}

/**
 * Calculate ETA based on distance and average speed
 */
export function calculateETA(
  distanceMeters: number,
  averageSpeedKmh: number = 20 // Default 20 km/h for school buses
): number {
  if (averageSpeedKmh <= 0) return -1;

  const distanceKm = distanceMeters / 1000;
  const timeHours = distanceKm / averageSpeedKmh;
  const timeMinutes = Math.round(timeHours * 60);

  return timeMinutes;
}

/**
 * Geofence state manager for a trip
 */
export class TripGeofenceManager {
  private tripId: string;
  private stops: StopWithLocation[] = [];
  private visitedStops: Set<string> = new Set();
  private currentStopIndex: number = 0;
  private lastLocation: GPSPoint | null = null;
  private alertsTriggered: Set<string> = new Set();

  constructor(tripId: string) {
    this.tripId = tripId;
  }

  async initialize(): Promise<void> {
    // Load trip data with route and stops
    const trip = await prisma.trip.findUnique({
      where: { id: this.tripId },
      include: {
        route: {
          include: {
            stops: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
      },
    });

    if (trip?.route?.stops) {
      this.stops = trip.route.stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        sequence: stop.sequence,
        arrivalMin: stop.arrivalMin,
      }));
    }
  }

  /**
   * Process new GPS location
   * Returns events that should be triggered
   */
  processLocation(location: GPSPoint): GeofenceEvent[] {
    const events: GeofenceEvent[] = [];
    this.lastLocation = location;

    // Check for stop arrival
    const stopEvent = this.checkStopArrival(location);
    if (stopEvent) {
      events.push(stopEvent);
    }

    // Check for route deviation
    const deviationEvent = this.checkDeviation(location);
    if (deviationEvent) {
      events.push(deviationEvent);
    }

    return events;
  }

  private checkStopArrival(location: GPSPoint): GeofenceEvent | null {
    // Get next unvisited stop
    const nextStop = this.stops[this.currentStopIndex];
    if (!nextStop || this.visitedStops.has(nextStop.id)) {
      return null;
    }

    const result = checkStopGeofence(location, nextStop, 150); // 150m arrival radius

    if (result.isInside) {
      this.visitedStops.add(nextStop.id);
      this.currentStopIndex++;

      return {
        type: 'STOP_ARRIVED',
        stopId: nextStop.id,
        stopName: nextStop.name,
        distance: result.distance,
        timestamp: new Date(),
      };
    }

    // Check if approaching stop (pre-alert at 500m)
    if (result.distance <= 500 && !this.alertsTriggered.has(`approach-${nextStop.id}`)) {
      this.alertsTriggered.add(`approach-${nextStop.id}`);
      return {
        type: 'STOP_APPROACHING',
        stopId: nextStop.id,
        stopName: nextStop.name,
        distance: result.distance,
        eta: calculateETA(result.distance),
        timestamp: new Date(),
      };
    }

    return null;
  }

  private checkDeviation(location: GPSPoint): GeofenceEvent | null {
    if (!this.lastLocation || this.stops.length < 2) return null;

    // Build route points from stops
    const routePoints: GPSPoint[] = this.stops.map((stop) => ({
      lat: stop.latitude,
      lng: stop.longitude,
      timestamp: new Date(),
    }));

    const deviation = checkRouteDeviation(location, routePoints, 200);

    if (deviation.isDeviated && !this.alertsTriggered.has('off-route')) {
      this.alertsTriggered.add('off-route');
      return {
        type: 'ROUTE_DEVIATION',
        distance: deviation.distanceFromRoute,
        timestamp: new Date(),
      };
    }

    // Clear deviation alert if back on route
    if (!deviation.isDeviated && this.alertsTriggered.has('off-route')) {
      this.alertsTriggered.delete('off-route');
      return {
        type: 'ROUTE_DEVIATION_CLEARED',
        timestamp: new Date(),
      };
    }

    return null;
  }

  getCurrentStop(): StopWithLocation | null {
    return this.stops[this.currentStopIndex] || null;
  }

  getProgress(): { visited: number; total: number } {
    return {
      visited: this.visitedStops.size,
      total: this.stops.length,
    };
  }
}

export interface GeofenceEvent {
  type:
    | 'STOP_ARRIVED'
    | 'STOP_APPROACHING'
    | 'STOP_DEPARTED'
    | 'ROUTE_DEVIATION'
    | 'ROUTE_DEVIATION_CLEARED';
  stopId?: string;
  stopName?: string;
  distance?: number;
  eta?: number;
  timestamp: Date;
}

// Singleton map to manage trip geofences
const tripGeofences = new Map<string, TripGeofenceManager>();

export function getTripGeofence(tripId: string): TripGeofenceManager {
  if (!tripGeofences.has(tripId)) {
    const geofence = new TripGeofenceManager(tripId);
    tripGeofences.set(tripId, geofence);
  }
  return tripGeofences.get(tripId)!;
}

export function removeTripGeofence(tripId: string): void {
  tripGeofences.delete(tripId);
}
