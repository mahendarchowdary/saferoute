'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Users, CheckCircle, XCircle, User } from 'lucide-react';
import { tripsApi } from '@/lib/api';

interface DriverAttendance {
  driverId: string;
  driverName: string;
  tripsCompleted: number;
  tripsInProgress: number;
  totalStudents: number;
  studentsOnboard: number;
  studentsDropped: number;
  attendanceRate: number;
}

export default function DriverAttendancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState<DriverAttendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadDriverAttendance();
  }, [selectedDate]);

  const loadDriverAttendance = async () => {
    try {
      setLoading(true);
      const response = await tripsApi.getDriverAttendance(selectedDate);
      setDriverStats(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load driver attendance',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (rate: number) => {
    if (rate >= 95) return <Badge className="bg-green-500">Excellent</Badge>;
    if (rate >= 80) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge className="bg-red-500">Needs Attention</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Driver Attendance</h1>
          <p className="text-muted-foreground mt-1">
            Track driver performance and student attendance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverStats.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trips Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {driverStats.reduce((acc, d) => acc + d.tripsCompleted + d.tripsInProgress, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {driverStats.reduce((acc, d) => acc + d.totalStudents, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {driverStats.length > 0
                ? Math.round(driverStats.reduce((acc, d) => acc + d.attendanceRate, 0) / driverStats.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Driver Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Driver</th>
                  <th className="text-center py-3 px-4">Trips</th>
                  <th className="text-center py-3 px-4">Students</th>
                  <th className="text-center py-3 px-4">Onboard</th>
                  <th className="text-center py-3 px-4">Dropped</th>
                  <th className="text-center py-3 px-4">Attendance</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {driverStats.map((driver) => (
                  <tr key={driver.driverId} className="border-b">
                    <td className="py-3 px-4">
                      <div className="font-medium">{driver.driverName}</div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-green-600">{driver.tripsCompleted}</span>
                      {driver.tripsInProgress > 0 && (
                        <span className="text-yellow-600 ml-1">
                          (+{driver.tripsInProgress})
                        </span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">{driver.totalStudents}</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-blue-600">{driver.studentsOnboard}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-green-600">{driver.studentsDropped}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${driver.attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-sm">{driver.attendanceRate}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      {getStatusBadge(driver.attendanceRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
