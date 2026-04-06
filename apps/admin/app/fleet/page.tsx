"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Bus, Navigation, Activity } from "lucide-react";
import { tripsApi } from "@/lib/api";
import { io, Socket } from "socket.io-client";

interface BusLocation {
  tripId: string;
  driverId: string;
  driverName: string;
  busPlate: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: number;
  routeName: string;
}

export default function FleetPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [busLocations, setBusLocations] = useState<Map<string, BusLocation>>(new Map());
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);

  useEffect(() => {
    // Load active trips
    loadActiveTrips();

    // Connect to WebSocket - ensure proper URL
    const token = localStorage.getItem("accessToken");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    // Remove /api if present for WebSocket connection
    const wsUrl = apiUrl.includes('/api') ? apiUrl.replace('/api', '') : apiUrl;
    
    console.log("Connecting to WebSocket:", wsUrl);
    
    const newSocket = io(wsUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("Fleet socket connected! ID:", newSocket.id);
      newSocket.emit("join:fleet");
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error.message);
    });

    newSocket.on("fleet:joined", (data) => {
      console.log("Joined fleet:", data);
    });

    newSocket.on("fleet:update", (data: BusLocation) => {
      console.log("Received fleet update:", data);
      setBusLocations((prev) => {
        const updated = new Map(prev);
        updated.set(data.tripId, data);
        return updated;
      });
    });

    newSocket.on("trip:location", (data: BusLocation) => {
      console.log("Received trip location:", data);
      setBusLocations((prev) => {
        const updated = new Map(prev);
        updated.set(data.tripId, data);
        return updated;
      });
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Fleet socket disconnected:", reason);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const loadActiveTrips = async () => {
    try {
      setLoading(true);
      const response = await tripsApi.getActive();
      setActiveTrips(response.data);
    } catch (error) {
      console.error("Failed to load active trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLastUpdated = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet Tracking</h1>
          <p className="text-gray-500">Real-time bus locations and active trips</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${socket?.connected ? "text-green-500 animate-pulse" : "text-red-500"}`} />
          <span className="text-sm text-muted-foreground">
            {socket?.connected ? "Live" : "Disconnected"}
          </span>
          <Button onClick={loadActiveTrips} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Buses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{busLocations.size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeTrips.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Students Onboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {activeTrips.reduce((sum, trip) => 
                sum + (trip.attendance?.filter((a: any) => a.status === "ONBOARD").length || 0), 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Speed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {busLocations.size > 0
                ? Math.round(
                    Array.from(busLocations.values()).reduce((sum, b) => sum + (b.speed || 0), 0) /
                      busLocations.size
                  )
                : 0} km/h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bus List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeTrips.map((trip) => {
          const location = busLocations.get(trip.id);
          const isSelected = selectedBus === trip.id;

          return (
            <Card
              key={trip.id}
              className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setSelectedBus(trip.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${location ? "bg-green-100" : "bg-gray-100"}`}>
                      <Bus className={`h-5 w-5 ${location ? "text-green-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <p className="font-medium">{trip.bus.plateNumber}</p>
                      <p className="text-sm text-gray-500">{trip.route.name}</p>
                      <p className="text-sm text-gray-500">Driver: {trip.driver.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {location ? (
                      <>
                        <p className="text-sm font-medium text-green-600">Active</p>
                        <p className="text-xs text-gray-400">
                          {getLastUpdated(location.timestamp)}
                        </p>
                        {location.speed !== undefined && (
                          <p className="text-xs text-blue-500">{location.speed} km/h</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No signal</p>
                    )}
                  </div>
                </div>

                {location && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400">
                        Onboard: {trip.attendance?.filter((a: any) => a.status === "ONBOARD").length || 0}
                      </span>
                      <span className="text-xs text-gray-400">
                        Heading: {location.heading || "N/A"}°
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {activeTrips.length === 0 && !loading && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Navigation className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No active trips</p>
              <p className="text-sm text-gray-400 mt-1">
                Start a trip from the driver app to see live tracking
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Live Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Interactive map coming soon</p>
              <p className="text-sm text-gray-400 mt-1">
                {busLocations.size} buses reporting live locations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
