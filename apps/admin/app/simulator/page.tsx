"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, Navigation, Play, Square, MapPin, Send } from "lucide-react";
import { io, Socket } from "socket.io-client";

interface Location {
  lat: number;
  lng: number;
}

// Predefined route coordinates (simulating a school bus route)
const ROUTE_COORDS: Location[] = [
  { lat: 17.4065, lng: 78.4772 }, // Start: School
  { lat: 17.4080, lng: 78.4785 },
  { lat: 17.4100, lng: 78.4800 },
  { lat: 17.4120, lng: 78.4820 },
  { lat: 17.4140, lng: 78.4840 },
  { lat: 17.4160, lng: 78.4860 },
  { lat: 17.4180, lng: 78.4880 },
  { lat: 17.4200, lng: 78.4900 },
  { lat: 17.4220, lng: 78.4920 },
  { lat: 17.4240, lng: 78.4940 }, // End
];

export default function DriverSimulatorPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tripId, setTripId] = useState("trip-123");
  const [driverId, setDriverId] = useState("driver-123");
  const [token, setToken] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:3001", {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      setConnected(true);
      addLog("Connected to server");
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
      addLog("Disconnected from server");
    });

    newSocket.on("connect_error", (error) => {
      addLog(`Connection error: ${error.message}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token, addLog]);

  useEffect(() => {
    if (!isTracking || !socket || !connected) return;

    const interval = setInterval(() => {
      const location = ROUTE_COORDS[currentIndex];
      if (!location) {
        setIsTracking(false);
        addLog("Route completed");
        return;
      }

      const payload = {
        tripId,
        lat: location.lat,
        lng: location.lng,
        speed: Math.floor(Math.random() * 30) + 20, // 20-50 km/h
        heading: Math.floor(Math.random() * 360),
        accuracy: 5 + Math.floor(Math.random() * 10),
        battery: 85 - Math.floor((currentIndex / ROUTE_COORDS.length) * 20),
        timestamp: Date.now(),
      };

      socket.emit("location:stream", payload);
      addLog(`Sent location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);

      setCurrentIndex((prev) => prev + 1);
    }, 5000); // Send every 5 seconds

    return () => clearInterval(interval);
  }, [isTracking, socket, connected, currentIndex, tripId, addLog]);

  const startTracking = () => {
    if (!token) {
      addLog("Error: Please enter auth token");
      return;
    }
    setIsTracking(true);
    setCurrentIndex(0);
    addLog("Started tracking");
  };

  const stopTracking = () => {
    setIsTracking(false);
    addLog("Stopped tracking");
  };

  const sendStopArrival = () => {
    if (!socket || !connected) {
      addLog("Error: Not connected");
      return;
    }

    socket.emit("stop:arrived", { tripId, stopId: "stop-1" });
    addLog("Sent stop arrival notification");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Bus className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Driver Simulator</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connection Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="token">Auth Token (from login)</Label>
              <Input
                id="token"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Get token from browser localStorage after admin login
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm">{connected ? "Connected" : "Disconnected"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trip Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tripId">Trip ID</Label>
                <Input
                  id="tripId"
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="driverId">Driver ID</Label>
                <Input
                  id="driverId"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              {!isTracking ? (
                <Button onClick={startTracking} className="bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2" />
                  Start Tracking
                </Button>
              ) : (
                <Button onClick={stopTracking} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Tracking
                </Button>
              )}

              <Button onClick={sendStopArrival} variant="outline" disabled={!connected}>
                <MapPin className="h-4 w-4 mr-2" />
                Arrived at Stop
              </Button>
            </div>

            {isTracking && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Navigation className="h-4 w-4 animate-spin" />
                <span>Sending GPS every 5 seconds... (Step {currentIndex + 1} of {ROUTE_COORDS.length})</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No activity yet...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="py-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Route Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Simulated route with {ROUTE_COORDS.length} waypoints:</p>
              <div className="grid grid-cols-5 gap-2">
                {ROUTE_COORDS.map((loc, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded text-xs text-center ${
                      i === currentIndex
                        ? "bg-blue-500 text-white"
                        : i < currentIndex
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Blue = Current • Green = Completed • Gray = Pending
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
