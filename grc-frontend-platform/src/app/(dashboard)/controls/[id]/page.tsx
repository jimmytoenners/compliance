"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import EvidenceFileUpload from '@/components/EvidenceFileUpload';
import {
  ArrowLeft,
  Shield,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
  Save
} from 'lucide-react';

interface ActivatedControl {
  id: string;
  control_library_id: string;
  owner_id: string;
  status: string;
  review_interval_days: number;
  last_reviewed_at: string | null;
  next_review_due_date: string;
  created_at: string;
  updated_at: string;
}

interface ControlLibraryItem {
  id: string;
  standard: string;
  family: string;
  name: string;
  description: string;
}

interface EvidenceLog {
  id: string;
  activated_control_id: string;
  performed_by_id: string;
  performed_at: string;
  compliance_status: string;
  notes: string;
  evidence_link: string;
}

interface EvidenceFile {
  id: string;
  evidence_log_id: string;
  filename: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

export default function ControlDetailPage() {
  const params = useParams();
  const router = useRouter();
  const controlId = params.id as string;

  const [control, setControl] = useState<ControlLibraryItem | null>(null);
  const [activatedControl, setActivatedControl] = useState<ActivatedControl | null>(null);
  const [evidenceLogs, setEvidenceLogs] = useState<EvidenceLog[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<{ [key: string]: EvidenceFile[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Evidence submission state
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState<'compliant' | 'non-compliant'>('compliant');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    fetchControlDetails();
  }, [controlId]);

  const fetchControlDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');

      // Fetch control library details
      const controlResponse = await fetch(`http://localhost:8080/api/v1/controls/library`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!controlResponse.ok) throw new Error('Failed to fetch control library');
      
      const controls = await controlResponse.json();
      const controlData = controls.find((c: ControlLibraryItem) => c.id === controlId);
      
      if (!controlData) throw new Error('Control not found');
      setControl(controlData);

      // Fetch activated control details
      const activatedResponse = await fetch(`http://localhost:8080/api/v1/controls/activated`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (activatedResponse.ok) {
        const activatedControls = await activatedResponse.json();
        const activated = activatedControls.find((ac: any) => ac.control_id === controlId);
        
        if (activated) {
          setActivatedControl(activated);
          
          // Fetch evidence logs for this activated control
          // Note: This endpoint would need to be implemented in the backend
          // For now, we'll use a placeholder
          fetchEvidenceLogs(activated.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load control');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvidenceLogs = async (activatedControlId: string) => {
    try {
      const token = localStorage.getItem('token');
      // This endpoint needs to be implemented in the backend
      const response = await fetch(`http://localhost:8080/api/v1/controls/activated/${activatedControlId}/evidence`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const logs = await response.json();
        setEvidenceLogs(logs);
        
        // Fetch files for each evidence log
        logs.forEach((log: EvidenceLog) => {
          fetchEvidenceFiles(log.id);
        });
      }
    } catch (err) {
      console.error('Failed to fetch evidence logs:', err);
    }
  };

  const fetchEvidenceFiles = async (evidenceLogId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/v1/evidence/${evidenceLogId}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvidenceFiles(prev => ({
          ...prev,
          [evidenceLogId]: data.files || []
        }));
      }
    } catch (err) {
      console.error('Failed to fetch evidence files:', err);
    }
  };

  const handleSubmitEvidence = async () => {
    if (!activatedControl || !evidenceNotes.trim()) {
      setError('Please provide evidence notes');
      return;
    }

    setSubmittingEvidence(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // Submit evidence log
      const response = await fetch(`http://localhost:8080/api/v1/controls/activated/${activatedControl.id}/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compliance_status: complianceStatus,
          notes: evidenceNotes,
          evidence_link: evidenceLink || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit evidence');

      const newEvidence = await response.json();
      
      // Set as active evidence for file uploads
      setActiveEvidenceId(newEvidence.id);
      
      // Clear form
      setEvidenceNotes('');
      setEvidenceLink('');
      setComplianceStatus('compliant');
      
      // Refresh evidence logs
      if (activatedControl) {
        fetchEvidenceLogs(activatedControl.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit evidence');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Compliant</Badge>;
      case 'non-compliant':
      case 'non_compliant':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Non-Compliant</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !control) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Control not found'}</AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/controls')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Controls
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/controls')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Controls
        </Button>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">{control.name}</h1>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              {control.standard} • {control.family}
            </p>
            <p className="text-sm text-gray-600">{control.id}</p>
          </div>
          
          {activatedControl && (
            <div className="flex flex-col items-end space-y-2">
              {getStatusBadge(activatedControl.status)}
              {isOverdue(activatedControl.next_review_due_date) && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="evidence">Evidence Submission</TabsTrigger>
          <TabsTrigger value="history">Evidence History</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Control Information</CardTitle>
              <CardDescription>Overview of this compliance control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Description</Label>
                <p className="text-sm text-gray-600 mt-1">{control.description}</p>
              </div>

              {activatedControl && (
                <>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Next Review Due
                      </Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(activatedControl.next_review_due_date).toLocaleDateString()}
                        {isOverdue(activatedControl.next_review_due_date) && (
                          <span className="text-red-600 ml-2">(Overdue)</span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Review Interval
                      </Label>
                      <p className="text-sm text-gray-900 mt-1">
                        Every {activatedControl.review_interval_days} days
                      </p>
                    </div>
                  </div>

                  {activatedControl.last_reviewed_at && (
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Last Reviewed</Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(activatedControl.last_reviewed_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence Submission Tab */}
        <TabsContent value="evidence" className="space-y-4">
          {!activatedControl ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Control Not Activated</AlertTitle>
              <AlertDescription>
                This control needs to be activated before you can submit evidence.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Submit Evidence</CardTitle>
                  <CardDescription>
                    Record evidence of compliance for this control
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="compliance-status">Compliance Status</Label>
                    <Select value={complianceStatus} onValueChange={(value: any) => setComplianceStatus(value)}>
                      <SelectTrigger id="compliance-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compliant">Compliant</SelectItem>
                        <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evidence-notes">Evidence Notes *</Label>
                    <Textarea
                      id="evidence-notes"
                      value={evidenceNotes}
                      onChange={(e) => setEvidenceNotes(e.target.value)}
                      placeholder="Describe the evidence and actions taken to demonstrate compliance..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evidence-link">Evidence Link (Optional)</Label>
                    <input
                      id="evidence-link"
                      type="url"
                      value={evidenceLink}
                      onChange={(e) => setEvidenceLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <Button
                    onClick={handleSubmitEvidence}
                    disabled={submittingEvidence || !evidenceNotes.trim()}
                    className="w-full"
                  >
                    {submittingEvidence ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Submit Evidence
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* File Upload for Active Evidence */}
              {activeEvidenceId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Attach Files</CardTitle>
                    <CardDescription>
                      Upload supporting documents for your recent evidence submission
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EvidenceFileUpload
                      evidenceId={activeEvidenceId}
                      files={evidenceFiles[activeEvidenceId] || []}
                      onFilesChange={() => fetchEvidenceFiles(activeEvidenceId)}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Evidence History Tab */}
        <TabsContent value="history" className="space-y-4">
          {evidenceLogs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No evidence submissions yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {evidenceLogs.map((log) => (
                <Card key={log.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {getStatusBadge(log.compliance_status)}
                        </CardTitle>
                        <CardDescription>
                          {new Date(log.performed_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold">Notes</Label>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{log.notes}</p>
                    </div>
                    
                    {log.evidence_link && (
                      <div>
                        <Label className="text-sm font-semibold">Evidence Link</Label>
                        <a
                          href={log.evidence_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-1 block"
                        >
                          {log.evidence_link}
                        </a>
                      </div>
                    )}

                    {/* Display attached files */}
                    {evidenceFiles[log.id] && evidenceFiles[log.id].length > 0 && (
                      <div className="pt-4 border-t">
                        <EvidenceFileUpload
                          evidenceId={log.id}
                          files={evidenceFiles[log.id]}
                          onFilesChange={() => fetchEvidenceFiles(log.id)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
