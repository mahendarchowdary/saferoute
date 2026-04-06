'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, UserCheck, UserX } from 'lucide-react';
import { tripsApi } from '@/lib/api';

interface AttendanceDay {
  date: string;
  present: number;
  absent: number;
  total: number;
  trips: number;
}

export default function AttendanceCalendarPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceDay[]>([]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    loadAttendanceData();
  }, [currentDate]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      // Get attendance for current month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      
      const data: AttendanceDay[] = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        try {
          const response = await tripsApi.getDriverAttendance(dateStr);
          const dayData = response.data;
          
          const totalStudents = dayData.reduce((acc: number, d: any) => acc + d.totalStudents, 0);
          const presentStudents = dayData.reduce((acc: number, d: any) => acc + d.studentsOnboard + d.studentsDropped, 0);
          
          data.push({
            date: dateStr,
            present: presentStudents,
            absent: totalStudents - presentStudents,
            total: totalStudents,
            trips: dayData.length
          });
        } catch {
          data.push({ date: dateStr, present: 0, absent: 0, total: 0, trips: 0 });
        }
      }
      
      setAttendanceData(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load attendance data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getStatusColor = (day: AttendanceDay) => {
    if (day.total === 0) return 'bg-gray-100';
    const rate = day.present / day.total;
    if (rate >= 0.95) return 'bg-green-100 border-green-300';
    if (rate >= 0.8) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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
          <h1 className="text-3xl font-bold">Attendance Calendar</h1>
          <p className="text-muted-foreground mt-1">Monthly student attendance overview</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[150px] text-center">
            {monthNames[month]} {year}
          </h2>
          <Button variant="outline" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(...attendanceData.map(d => d.total)) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceData.length > 0 && attendanceData.some(d => d.total > 0)
                ? Math.round(attendanceData.filter(d => d.total > 0).reduce((acc, d) => acc + (d.present / d.total), 0) / attendanceData.filter(d => d.total > 0).length * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Days</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceData.filter(d => d.trips > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absent Count</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceData.reduce((acc, d) => acc + d.absent, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-sm py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {days.map(day => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayData = attendanceData.find(d => d.date === dateStr);
              
              return (
                <div
                  key={day}
                  className={`aspect-square border rounded-lg p-2 ${getStatusColor(dayData || { date: dateStr, present: 0, absent: 0, total: 0, trips: 0 })}`}
                >
                  <div className="font-semibold">{day}</div>
                  {dayData && dayData.total > 0 && (
                    <div className="text-xs mt-1">
                      <div className="text-green-600">{dayData.present} present</div>
                      <div className="text-red-500">{dayData.absent} absent</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
