'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { busesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Bus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Bus {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  year: number;
  status: string;
}

export default function BusesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    capacity: '',
    year: new Date().getFullYear().toString(),
  });
  const [submitting, setSubmitting] = useState(false);

  const loadBuses = async () => {
    try {
      const response = await busesApi.getAll();
      setBuses(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load buses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await busesApi.create({
        plateNumber: formData.plateNumber,
        model: formData.model,
        capacity: parseInt(formData.capacity),
        year: parseInt(formData.year),
      });

      toast({
        title: 'Success',
        description: 'Bus created successfully',
      });

      setDialogOpen(false);
      setFormData({
        plateNumber: '',
        model: '',
        capacity: '',
        year: new Date().getFullYear().toString(),
      });
      loadBuses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create bus',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;

    try {
      await busesApi.delete(id);
      toast({
        title: 'Success',
        description: 'Bus deleted successfully',
      });
      loadBuses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete bus',
        variant: 'destructive',
      });
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
          <Bus className="h-8 w-8" />
          Buses
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Bus
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Bus</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="plateNumber">Plate Number</Label>
                <Input
                  id="plateNumber"
                  value={formData.plateNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, plateNumber: e.target.value })
                  }
                  placeholder="e.g., ABC-123"
                  required
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  placeholder="e.g., Ford Transit"
                  required
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  placeholder="e.g., 30"
                  required
                />
              </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value })
                  }
                  required
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Bus
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {buses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No buses yet. Add your first bus.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buses.map((bus) => (
            <Card key={bus.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{bus.plateNumber}</CardTitle>
                    <p className="text-sm text-gray-500">{bus.model}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(bus.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Capacity:</span>
                  <span className="font-medium">{bus.capacity} seats</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Year:</span>
                  <span className="font-medium">{bus.year}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Status:</span>
                  <span
                    className={`font-medium capitalize ${
                      bus.status === 'ACTIVE'
                        ? 'text-green-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {bus.status.toLowerCase()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
