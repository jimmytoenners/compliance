"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Loader2, AlertTriangle, Info } from 'lucide-react';

interface TemplateControl {
  control_id: string;
  priority: string;
  rationale: string;
}

interface ControlTemplate {
  id: string;
  name: string;
  description: string;
  maturity_level: string;
  recommended_for: string;
  estimated_time: string;
  control_count: number;
  controls: TemplateControl[];
}

export default function QuickStartPage() {
  const [templates, setTemplates] = useState<ControlTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ControlTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ownerId, setOwnerId] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{
    activated_count: number;
    total_in_template: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/v1/quick-start/templates');
        if (!res.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const handleActivateClick = (template: ControlTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
    setActivationResult(null);
    setOwnerId('');
  };

  const handleConfirmActivation = async () => {
    if (!selectedTemplate || !ownerId) return;

    setIsActivating(true);
    setActivationResult(null);

    try {
      const res = await fetch(`/api/v1/quick-start/templates/${selectedTemplate.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: ownerId }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Activation failed');
      }
      setActivationResult(result);
    } catch (err) {
      setActivationResult({
        activated_count: 0,
        total_in_template: selectedTemplate.controls.length,
        errors: [err instanceof Error ? err.message : 'An unknown error occurred'],
      });
    } finally {
      setIsActivating(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Quick Start Compliance Templates</h1>
        <p className="text-muted-foreground mt-2">
          Accelerate your compliance journey by activating a curated set of controls based on your startup's maturity level.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Info className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Recommended For</p>
                    <p className="text-sm text-muted-foreground">{template.recommended_for}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Controls to Activate:</span>
                  <span className="font-bold text-lg">{template.control_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Estimated Time:</span>
                  <span className="text-muted-foreground">{template.estimated_time}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => handleActivateClick(template)}>
                Activate Template
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate '{selectedTemplate?.name}'</DialogTitle>
            <DialogDescription>
              This will activate {selectedTemplate?.control_count} controls and assign them to a user. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {!activationResult ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Assign Controls To</Label>
                <Select onValueChange={setOwnerId} value={ownerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* In a real app, this would be a dynamic list of users */}
                    <SelectItem value="a4c1c608-4101-4498-a043-629a8a8a8a8a">Admin User</SelectItem>
                    <SelectItem value="b5d2d719-5202-5599-b154-730b9b9b9b9b">Compliance Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="py-4">
              {activationResult.errors.length === 0 ? (
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Activation Successful</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Successfully activated {activationResult.activated_count} of {activationResult.total_in_template} controls.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Activation Partially Failed</AlertTitle>
                  <AlertDescription>
                    <p>Activated {activationResult.activated_count} of {activationResult.total_in_template} controls.</p>
                    <p className="mt-2 font-semibold">Errors:</p>
                    <ul className="list-disc pl-5 mt-1 text-xs">
                      {activationResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            {!activationResult ? (
              <Button onClick={handleConfirmActivation} disabled={!ownerId || isActivating}>
                {isActivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Activation
              </Button>
            ) : (
              <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}