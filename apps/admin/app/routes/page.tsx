'use client';

import { useState, useEffect } from 'react';
import { routesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Route, Loader2, MapPin, Clock, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Stop {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
}

interface Route {
  id: string;
  name: string;
  shift: 'MORNING' | 'AFTERNOON';
  status: string;
  stops: Stop[];
}

export default function RoutesPage() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    shift: 'MORNING' as 'MORNING' | 'AFTERNOON',
    stops: [{ name: '', latitude: '', longitude: '', sequence: 1 }] as any[],
  });
  const [submitting, setSubmitting] = useState(false);

  const loadRoutes = async () => {
    try {
      const response = await routesApi.getAll();
      setRoutes(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load routes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const addStop = () => {
    setFormData({
      ...formData,
      stops: [
        ...formData.stops,
        { name: '', latitude: '', longitude: '', sequence: formData.stops.length + 1 },
      ],
    });
  };

  const removeStop = (index: number) => {
    const newStops = formData.stops.filter((_, i) => i !== index);
    setFormData({ ...formData, stops: newStops });
  };

  const updateStop = (index: number, field: string, value: string) => {
    const newStops = [...formData.stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setFormData({ ...formData, stops: newStops });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        shift: formData.shift,
        stops: formData.stops.map((stop: any, index: number) => ({
          name: stop.name,
          latitude: parseFloat(stop.latitude),
          longitude: parseFloat(stop.longitude),
          sequence: index + 1,
        })),
      };

      await routesApi.create(payload);

      toast({
        title: 'Success',
        description: 'Route created successfully',
      });

      setDialogOpen(false);
      setFormData({
        name: '',
        shift: 'MORNING',
        stops: [{ name: '', latitude: '', longitude: '', sequence: 1 }],
      });
      loadRoutes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create route',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Route className="h-8 w-8" />
          Routes
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Route</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Route Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Morning Route A"
                  required
                />
              </div>
              <div>
                <Label htmlFor="shift">Shift</Label>
                <Select
                  value={formData.shift}
                  onValueChange={(value: 'MORNING' | 'AFTERNOON') =>
                    setFormData({ ...formData, shift: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MORNING">Morning</SelectItem>
                    <SelectItem value="AFTERNOON">Afternoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Stops</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStop}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Stop
                  </Button>
                </div>
                {formData.stops.map((stop, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Stop {index + 1}</span>
                      {formData.stops.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStop(index)}
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Stop name"
                      value={stop.name}
                      onChange={(e) => updateStop(index, 'name', e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Latitude"
                        value={stop.latitude}
                        onChange={(e) => updateStop(index, 'latitude', e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Longitude"
                        value={stop.longitude}
                        onChange={(e) => updateStop(index, 'longitude', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Route
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Route className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No routes yet. Add your first route.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routes.map((route) => (
            <Card key={route.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{route.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 capitalize">{route.shift?.toLowerCase() || 'morning'}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      route.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {route.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-2">
                  {route.stops.length} stops
                </p>
                <div className="space-y-1">
                  {route.stops.slice(0, 3).map((stop, index) => (
                    <div key={stop.id || index} className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-blue-400" />
                      <span>{stop.name}</span>
                    </div>
                  ))}
                  {route.stops.length > 3 && (
                    <p className="text-xs text-gray-400 pl-6">
                      +{route.stops.length - 3} more stops
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
