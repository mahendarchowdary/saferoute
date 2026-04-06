"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, Users, Route, AlertCircle, Activity } from "lucide-react";
import { dashboardApi, tripsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.getStats().then((res) => res.data),
    refetchInterval: 30000,
  });

  const { data: activeTrips, isLoading: tripsLoading } = useQuery({
    queryKey: ["active-trips"],
    queryFn: () => tripsApi.getActive().then((res) => res.data),
    refetchInterval: 10000,
  });

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}?token=${localStorage.getItem("accessToken")}`
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Handle real-time fleet updates
      if (data.type === "fleet:update") {
        // Update fleet positions on map
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, []);

  const statCards = [
    {
      title: "Total Buses",
      value: stats?.stats?.totalBuses || 0,
      active: stats?.stats?.activeBuses || 0,
      icon: Bus,
      color: "text-blue-500",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Students",
      value: stats?.stats?.totalStudents || 0,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-100",
    },
    {
      title: "Active Trips",
      value: stats?.stats?.activeTrips || 0,
      icon: Route,
      color: "text-orange-500",
      bgColor: "bg-orange-100",
    },
    {
      title: "Pending Alerts",
      value: stats?.stats?.pendingAlerts || 0,
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-100",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name} • {user?.school?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">System Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`${card.bgColor} p-2 rounded-full`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.active !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {card.active} active
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Trips */}
      <Card>
        <CardHeader>
          <CardTitle>Active Trips</CardTitle>
        </CardHeader>
        <CardContent>
          {tripsLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : activeTrips?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active trips at the moment
            </div>
          ) : (
            <div className="space-y-4">
              {activeTrips?.map((trip: any) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{trip.route.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Driver: {trip.driver.name} • Bus: {trip.bus.plateNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      {trip.attendance?.filter((a: any) => a.status === "ONBOARD").length || 0} onboard
                    </span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      In Progress
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trips</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="space-y-4">
              {stats?.recentTrips?.map((trip: any) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{trip.route.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {trip.driver.name} • {trip.bus.plateNumber}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
