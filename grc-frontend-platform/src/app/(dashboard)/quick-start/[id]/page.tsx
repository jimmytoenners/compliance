"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle, Loader2, AlertTriangle, Shield } from 'lucide-react';

interface TemplateControl {
  template_id: string;
  control_library_id: string;
  control_name: string;
  control_family: string;
  priority: string;
  rationale: string;
}

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  
  const [controls, setControls] = useState<TemplateControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    async function fetchTemplateControls() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:8080/api/v1/templates/${templateId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch template controls');
        }
        const data = await res.json();
        setControls(data.controls || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchTemplateControls();
  }, [templateId]);

  const handleActivate = async () => {
    if (!confirm('This will activate all controls in this template. Continue?')) {
      return;
    }

    setIsActivating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8080/api/v1/templates/${templateId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Activation failed');
      }
      alert(`Successfully activated ${result.controls_activated} controls!`);
      router.push('/controls');
    } catch (err) {
      alert(`Failed to activate template: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsActivating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/quick-start')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push('/quick-start')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Template Controls</h1>
          <p className="text-muted-foreground mt-2">
            Preview the {controls.length} controls included in this template before activating.
          </p>
        </div>
        <Button onClick={handleActivate} disabled={isActivating || controls.length === 0}>
          {isActivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Shield className="mr-2 h-4 w-4" />
          Activate All Controls
        </Button>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>What happens when you activate?</AlertTitle>
        <AlertDescription>
          All controls in this template will be added to your compliance program and assigned to you as the owner. 
          You can reassign ownership and customize controls after activation.
        </AlertDescription>
      </Alert>

      {/* Controls Table */}
      <Card>
        <CardHeader>
          <CardTitle>Control Details</CardTitle>
          <CardDescription>
            Controls are sorted by priority (Critical → High → Medium → Low)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {controls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No controls found in this template.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control ID</TableHead>
                  <TableHead>Control Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Rationale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controls.map((control) => (
                  <TableRow key={control.control_library_id}>
                    <TableCell className="font-mono text-sm">
                      {control.control_library_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {control.control_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {control.control_family}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(control.priority)}>
                        {control.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md">
                      {control.rationale}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
