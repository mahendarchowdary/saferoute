"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Bus, Clock, Activity, Navigation, User, CheckCircle } from "lucide-react";
import { io, Socket } from "socket.io-client";

interface BusLocation {
  tripId: string;
  driverId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: number;
  busPlate: string;
}

interface Student {
  id: string;
  name: string;
  status: "PENDING" | "ONBOARD" | "DROPPED";
  stopName: string;
}

export default function ParentTrackingPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [students, setStudents] = useState<Student[]>([
    { id: "1", name: "John Doe", status: "ONBOARD", stopName: "Maple Street" },
    { id: "2", name: "Jane Doe", status: "PENDING", stopName: "Oak Avenue" },
  ]);
  const [connected, setConnected] = useState(false);
  const [eta, setEta] = useState<string | null>(null);
  const [tripStatus, setTripStatus] = useState<string>("In Progress");

  const addLog = useCallback((message: string) => {
    console.log(`[Parent Tracking] ${message}`);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // Prevent double connections in React Strict Mode
    if (socket?.connected) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:3001", {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      setConnected(true);
      addLog("Connected to tracking server");
      
      // Subscribe to child's trip
      newSocket.emit("trip:subscribe", "trip-123");
    });

    newSocket.on("trip:subscribed", (data) => {
      addLog(`Subscribed to trip: ${data.tripId}`);
    });

    newSocket.on("trip:location", (data: BusLocation) => {
      setBusLocation(data);
      addLog(`Bus location updated: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`);
      
      // Calculate ETA (mock - in real app would use distance calculation)
      setEta("5 minutes");
    });

    newSocket.on("stop:arrived", (data) => {
      addLog(`Bus arrived at stop: ${data.stopName}`);
      // Update student status if it's their stop
      setStudents(prev => prev.map(s => 
        s.stopName === data.stopName ? { ...s, status: "DROPPED" } : s
      ));
    });

    newSocket.on("alert:geofence", (data) => {
      addLog(`Geofence alert: ${data.message} (${data.distance}m away)`);
      // Show ETA based on geofence alert
      setEta(`~${Math.round(data.distance / 20)} minutes`);
    });

    newSocket.on("attendance:updated", (data) => {
      addLog(`Attendance updated: ${data.studentId} - ${data.status}`);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
      addLog("Disconnected from tracking server");
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [addLog]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONBOARD": return "text-green-600 bg-green-100";
      case "PENDING": return "text-orange-600 bg-orange-100";
      case "DROPPED": return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getLastUpdated = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Bus Tracking</h1>
            <p className="text-gray-500">Track your child's bus in real-time</p>
          </div>
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${connected ? "text-green-500 animate-pulse" : "text-red-500"}`} />
            <span className="text-sm text-muted-foreground">
              {connected ? "Live" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Bus Location Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bus className="h-5 w-5 text-blue-600" />
              Bus Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {busLocation ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Bus Plate</p>
                      <p className="font-medium text-lg">{busLocation.busPlate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Speed</p>
                      <p className="font-medium">{busLocation.speed || 0} km/h</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span>
                        {busLocation.lat.toFixed(6)}, {busLocation.lng.toFixed(6)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Updated {getLastUpdated(busLocation.timestamp)}
                    </p>
                  </div>
                </div>

                {eta && (
                  <div className="flex items-center gap-3 bg-orange-50 rounded-lg p-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-800">Arriving in ~{eta}</p>
                      <p className="text-sm text-orange-600">to your stop</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Navigation className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Waiting for bus location...</p>
                <p className="text-sm text-gray-400 mt-1">
                  The bus hasn't started sharing its location yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Your Children
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getStatusColor(student.status)}`}>
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-500">Stop: {student.stopName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(student.status)}`}>
                      {student.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trip Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Trip Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium">{tripStatus}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Driver is following the planned route. You'll be notified when the bus approaches your stop.
            </p>
          </CardContent>
        </Card>

        {/* Mock Map */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Live Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
              {busLocation ? (
                <div className="text-center">
                  <Bus className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium">Bus is moving</p>
                  <p className="text-sm text-gray-500">
                    {busLocation.lat.toFixed(4)}, {busLocation.lng.toFixed(4)}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Map loading...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
            Refresh Location
          </Button>
        </div>
      </div>
    </div>
  );
}
