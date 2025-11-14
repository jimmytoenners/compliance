'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Download, FileSpreadsheet, FileJson, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Standard {
  id: string;
  code: string;
  name: string;
  version: string;
  organization: string;
  total_controls: number;
}

export default function ComplianceReportsPage() {
  const { token } = useAuthStore();
  const [standards, setStandards] = useState<Standard[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [includeEvidence, setIncludeEvidence] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [loadingStandards, setLoadingStandards] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (token) {
      fetchStandards();
    }

    // Set default date range (last month)
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, [token]);

  const fetchStandards = async () => {
    setLoadingStandards(true);
    try {
      const response = await fetch('http://localhost:8080/api/v1/standards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStandards(data);
        if (data.length > 0) {
          setSelectedStandard(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch standards:', error);
    } finally {
      setLoadingStandards(false);
    }
  };

  const generateReport = async (format: 'pdf' | 'csv' | 'json') => {
    if (!selectedStandard) {
      setMessage({ type: 'error', text: 'Please select a standard' });
      return;
    }

    if (!startDate || !endDate) {
      setMessage({ type: 'error', text: 'Please select a date range' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const requestBody = {
        standard_id: selectedStandard,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        include_evidence: includeEvidence
      };

      const response = await fetch(`http://localhost:8080/api/v1/reports/generate/${format}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate ${format.toUpperCase()} report`);
      }

      // Handle different content types
      if (format === 'json') {
        const jsonData = await response.json();
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `compliance-report-${new Date().toISOString().split('T')[0]}.json`);
      } else {
        const blob = await response.blob();
        const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 
                         `compliance-report-${new Date().toISOString().split('T')[0]}.${format}`;
        downloadBlob(blob, filename);
      }

      setMessage({ type: 'success', text: `${format.toUpperCase()} report generated successfully!` });
    } catch (error) {
      console.error('Failed to generate report:', error);
      setMessage({ type: 'error', text: 'Failed to generate report. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const selectedStandardData = standards.find(s => s.id === selectedStandard);

  if (loadingStandards) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading standards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compliance Reports</h1>
        <p className="text-gray-600 mt-1">Generate comprehensive compliance reports for audits and reviews</p>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration Card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>
                Configure your compliance report parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Standard Selection */}
              <div className="space-y-2">
                <Label htmlFor="standard">Compliance Standard *</Label>
                <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                  <SelectTrigger id="standard">
                    <SelectValue placeholder="Select a standard" />
                  </SelectTrigger>
                  <SelectContent>
                    {standards.map((std) => (
                      <SelectItem key={std.id} value={std.id}>
                        {std.code} - {std.name} v{std.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStandardData && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedStandardData.organization} • {selectedStandardData.total_controls} controls
                  </p>
                )}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <Label className="text-base">Report Options</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="include-evidence"
                    checked={includeEvidence}
                    onChange={(e) => setIncludeEvidence(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="include-evidence" className="text-sm text-gray-700">
                    Include evidence submission counts in report
                  </label>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="border-t pt-6 space-y-3">
                <Label className="text-base">Export Format</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => generateReport('pdf')}
                    disabled={loading || !selectedStandard}
                    className="w-full"
                    variant="default"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Download PDF
                  </Button>

                  <Button
                    onClick={() => generateReport('csv')}
                    disabled={loading || !selectedStandard}
                    className="w-full"
                    variant="outline"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                    )}
                    Download CSV
                  </Button>

                  <Button
                    onClick={() => generateReport('json')}
                    disabled={loading || !selectedStandard}
                    className="w-full"
                    variant="outline"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileJson className="h-4 w-4 mr-2" />
                    )}
                    Download JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Information Card */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Report Contents</CardTitle>
              <CardDescription>What's included in each report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start">
                  <Download className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">PDF Report</p>
                    <p className="text-xs text-gray-600">
                      Professional formatted report with title page, executive summary, and detailed control status
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <FileSpreadsheet className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">CSV Export</p>
                    <p className="text-xs text-gray-600">
                      Tabular data export for analysis in Excel or other spreadsheet tools
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <FileJson className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">JSON Export</p>
                    <p className="text-xs text-gray-600">
                      Structured data export for integration with other systems and automation
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <p className="font-medium text-sm">All reports include:</p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Total controls in standard</li>
                  <li>Activated vs. available controls</li>
                  <li>Compliance status breakdown</li>
                  <li>Overdue control indicators</li>
                  <li>Review dates and schedules</li>
                  <li>Compliance rate calculations</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Usage Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-600 space-y-2">
              <p>• PDF reports are ideal for auditors and management presentations</p>
              <p>• CSV exports work well for data analysis and tracking trends</p>
              <p>• JSON format enables API integration and automated processing</p>
              <p>• Reports include timestamp and user information for audit trails</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
