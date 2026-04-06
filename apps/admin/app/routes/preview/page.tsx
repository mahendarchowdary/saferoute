'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Pause, MapPin, Clock, Route } from 'lucide-react';
import { routesApi } from '@/lib/api';

interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
  arrivalMin?: number;
}

interface Route {
  id: string;
  name: string;
  distanceKm?: number;
  estimatedMin?: number;
  stops: Stop[];
}

export default function RoutePreviewPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const routeId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route | null>(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (routeId) {
      loadRoute();
    }
  }, [routeId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && route) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setCurrentStopIndex(idx => {
              if (idx < route.stops.length - 1) {
                return idx + 1;
              } else {
                setIsPlaying(false);
                return idx;
              }
            });
            return 0;
          }
          return prev + 2;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, route]);

  const loadRoute = async () => {
    try {
      setLoading(true);
      const response = await routesApi.getAll();
      const foundRoute = response.data.find((r: Route) => r.id === routeId);
      if (foundRoute) {
        setRoute(foundRoute);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load route', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const resetAnimation = () => {
    setIsPlaying(false);
    setCurrentStopIndex(0);
    setProgress(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Route Preview</h1>
        <p className="text-muted-foreground mt-2">Select a route to preview</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{route.name}</h1>
          <p className="text-muted-foreground mt-1">Route Preview & Animation</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={togglePlay} variant={isPlaying ? 'secondary' : 'default'}>
            {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button onClick={resetAnimation} variant="outline">
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Stops</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{route.stops.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Distance</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{route.distanceKm?.toFixed(1) || '-'} km</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Est. Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{route.estimatedMin || '-'} min</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Route Animation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Route Line */}
            <div className="absolute left-4 top-0 bottom-0 w-1 bg-gray-200" />
            
            {/* Animated Progress Line */}
            <div 
              className="absolute left-4 top-0 w-1 bg-blue-500 transition-all duration-100"
              style={{ 
                height: `${((currentStopIndex + progress / 100) / (route.stops.length - 1)) * 100}%` 
              }}
            />

            {/* Stops */}
            <div className="space-y-8 relative">
              {route.stops.map((stop, index) => {
                const isCurrent = index === currentStopIndex;
                const isPast = index < currentStopIndex;
                const isFuture = index > currentStopIndex;

                return (
                  <div key={stop.id} className="flex items-center gap-4">
                    <div 
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCurrent 
                          ? 'bg-blue-500 text-white scale-125' 
                          : isPast 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isPast ? '✓' : index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{stop.name}</div>
                      <div className="text-sm text-gray-500">
                        {stop.arrivalMin !== undefined && `+${stop.arrivalMin} min`}
                        {isCurrent && (
                          <span className="ml-2 text-blue-500 animate-pulse">
                            Bus is here ({Math.round(progress)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
