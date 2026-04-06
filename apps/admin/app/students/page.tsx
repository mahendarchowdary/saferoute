'use client';

import { useState, useEffect } from 'react';
import { studentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, GraduationCap, Loader2, Mail, Phone, MapPin, Upload, FileSpreadsheet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Student {
  id: string;
  name: string;
  grade: string;
  photoUrl?: string;
  parentName?: string;
  parentEmail: string;
  parentPhone: string;
  route?: {
    name: string;
  };
  stop?: {
    name: string;
  };
}

export default function StudentsPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const loadStudents = async () => {
    try {
      const response = await studentsApi.getAll();
      setStudents(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await studentsApi.create(formData);

      toast({
        title: 'Success',
        description: 'Student created successfully',
      });

      setDialogOpen(false);
      setFormData({ name: '', grade: '', parentName: '', parentEmail: '', parentPhone: '' });
      loadStudents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create student',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      toast({ title: 'Error', description: 'Please select a CSV file', variant: 'destructive' });
      return;
    }
    
    setImporting(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      // Skip header row if it contains 'name' or 'parent'
      const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0;
      
      const students = lines.slice(startIndex).map(line => {
        const parts = line.split(',').map(p => p?.trim());
        return { 
          name: parts[0], 
          grade: parts[1], 
          parentName: parts[2], 
          parentEmail: parts[3], 
          parentPhone: parts[4] 
        };
      }).filter(s => s.name && s.parentEmail && s.parentPhone);
      
      if (students.length === 0) {
        toast({ title: 'Error', description: 'No valid student data found in file', variant: 'destructive' });
        return;
      }
      
      await studentsApi.bulkImport(students);
      toast({ title: 'Success', description: `${students.length} students imported from file` });
      setCsvDialogOpen(false);
      setCsvFile(null);
      loadStudents();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Import failed', variant: 'destructive' });
    } finally {
      setImporting(false);
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
          <GraduationCap className="h-8 w-8" />
          Students
        </h1>
        <div className="flex gap-2">
          <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Import Students</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Upload CSV file with columns: name, grade, parentName, parentEmail, parentPhone
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                {csvFile && (
                  <p className="text-sm text-green-600">Selected: {csvFile.name}</p>
                )}
                <Button
                  onClick={handleCsvImport}
                  disabled={importing || !csvFile}
                  className="w-full"
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Import Students
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Student Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Alice Johnson"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Grade/Class</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="e.g., 5th Grade"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="parentName">Parent Name</Label>
                  <Input
                    id="parentName"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    placeholder="e.g., Sarah Johnson"
                  />
                </div>
                <div>
                  <Label htmlFor="parentEmail">Parent Email</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    placeholder="e.g., parent@email.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="parentPhone">Parent Phone</Label>
                  <Input
                    id="parentPhone"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    placeholder="e.g., +1 234 567 890"
                    required
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Student
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No students yet. Add your first student.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Card key={student.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{student.name}</CardTitle>
                    <p className="text-sm text-gray-500">{student.grade}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {student.parentName && (
                    <p className="text-sm text-gray-600">Parent: {student.parentName}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{student.parentEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{student.parentPhone}</span>
                  </div>
                  {(student.route || student.stop) && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {student.route && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-blue-400" />
                          <span>Route: {student.route.name}</span>
                        </div>
                      )}
                      {student.stop && (
                        <p className="text-xs text-gray-500 pl-6">Stop: {student.stop.name}</p>
                      )}
                    </div>
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