"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, AlertTriangle, Info, Clock, MapPin, Bus, User } from "lucide-react";
import { alertsApi } from "@/lib/api";

interface Alert {
  id: string;
  type: "DELAY" | "EMERGENCY" | "GEOFENCE" | "ATTENDANCE" | "SYSTEM";
  message: string;
  status: "ACTIVE" | "RESOLVED" | "DISMISSED";
  student?: { id: string; name: string };
  bus?: { id: string; plateNumber: string };
  stop?: { id: string; name: string };
  createdAt: string;
  resolvedAt?: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertsApi.getAll();
      setAlerts(response.data);
    } catch (error) {
      console.error("Failed to load alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await alertsApi.resolve(alertId);
      loadAlerts();
    } catch (error) {
      console.error("Failed to resolve alert:", error);
    }
  };

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "EMERGENCY":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "DELAY":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "GEOFENCE":
        return <MapPin className="h-5 w-5 text-orange-500" />;
      case "ATTENDANCE":
        return <User className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertBadge = (type: Alert["type"]) => {
    const styles = {
      EMERGENCY: "bg-red-100 text-red-700",
      DELAY: "bg-yellow-100 text-yellow-700",
      GEOFENCE: "bg-orange-100 text-orange-700",
      ATTENDANCE: "bg-blue-100 text-blue-700",
      SYSTEM: "bg-gray-100 text-gray-700",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
        {type}
      </span>
    );
  };

  const activeAlerts = alerts.filter((a) => a.status === "ACTIVE");
  const resolvedAlerts = alerts.filter((a) => a.status === "RESOLVED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-gray-500">Manage system alerts and notifications</p>
        </div>
        <Button onClick={loadAlerts} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {activeAlerts.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Resolved Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                resolvedAlerts.filter(
                  (a) =>
                    a.resolvedAt &&
                    new Date(a.resolvedAt).toDateString() ===
                      new Date().toDateString()
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Active Alerts</h2>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : activeAlerts.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">No active alerts</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeAlerts.map((alert) => (
              <Card key={alert.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getAlertBadge(alert.type)}
                          <span className="text-xs text-gray-400">
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="font-medium">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          {alert.student && (
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {alert.student.name}
                            </span>
                          )}
                          {alert.bus && (
                            <span className="flex items-center gap-1">
                              <Bus className="h-4 w-4" />
                              {alert.bus.plateNumber}
                            </span>
                          )}
                          {alert.stop && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {alert.stop.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleResolve(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Resolved Alerts</h2>
          <div className="space-y-4">
            {resolvedAlerts.slice(0, 5).map((alert) => (
              <Card key={alert.id} className="opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getAlertBadge(alert.type)}
                        <span className="text-xs text-gray-400">
                          Resolved: {alert.resolvedAt && new Date(alert.resolvedAt).toLocaleString()}
                        </span>
                      </div>
                      <p>{alert.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
