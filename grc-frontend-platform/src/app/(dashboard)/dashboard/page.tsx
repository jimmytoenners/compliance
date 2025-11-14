'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Plus,
  Upload,
  FileText,
  Rocket,
  Users,
  Calendar,
  XCircle
} from 'lucide-react';

interface DashboardStats {
  controls: {
    total: number;
    activated: number;
    compliant: number;
    nonCompliant: number;
    overdue: number;
    compliancePercentage: number;
  };
  tickets: {
    totalTickets: number;
    openTickets: number;
    resolvedThisMonth: number;
  };
  assets: {
    total: number;
  };
  documents: {
    total: number;
  };
}

interface OverdueControl {
  id: string;
  control_name: string;
  control_id: string;
  next_review_due_date: string;
  owner_name: string | null;
  days_overdue: number;
}

interface AuditEvent {
  id: string;
  action_type: string;
  target_entity_type: string | null;
  performed_at: string;
  user_id: string | null;
}

interface StandardProgress {
  standard: string;
  total_controls: number;
  activated_controls: number;
  compliant_controls: number;
  percentage: number;
}

export default function EnhancedDashboardPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overdueControls, setOverdueControls] = useState<OverdueControl[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditEvent[]>([]);
  const [standardProgress, setStandardProgress] = useState<StandardProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchOverdueControls(),
        fetchRecentActivity(),
        fetchStandardProgress()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/dashboard/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchOverdueControls = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/controls/activated', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const controls = await response.json();
        const today = new Date();
        const overdue = controls
          .filter((c: any) => new Date(c.next_review_due_date) < today)
          .map((c: any) => ({
            ...c,
            days_overdue: Math.floor((today.getTime() - new Date(c.next_review_due_date).getTime()) / (1000 * 60 * 60 * 24))
          }))
          .sort((a: any, b: any) => b.days_overdue - a.days_overdue)
          .slice(0, 5);
        setOverdueControls(overdue);
      }
    } catch (error) {
      console.error('Failed to fetch overdue controls:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/audit/logs?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const logs = await response.json();
        setRecentActivity(logs.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    }
  };

  const fetchStandardProgress = async () => {
    try {
      const [libraryRes, activatedRes] = await Promise.all([
        fetch('http://localhost:8080/api/v1/controls/library', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8080/api/v1/controls/activated', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (libraryRes.ok && activatedRes.ok) {
        const library = await libraryRes.json();
        const activated = await activatedRes.json();

        // Group by standard
        const standardMap = new Map<string, StandardProgress>();
        
        library.forEach((control: any) => {
          const std = control.standard || 'Other';
          if (!standardMap.has(std)) {
            standardMap.set(std, {
              standard: std,
              total_controls: 0,
              activated_controls: 0,
              compliant_controls: 0,
              percentage: 0
            });
          }
          const progress = standardMap.get(std)!;
          progress.total_controls++;
        });

        activated.forEach((control: any) => {
          const std = control.standard || 'Other';
          if (standardMap.has(std)) {
            const progress = standardMap.get(std)!;
            progress.activated_controls++;
            if (control.status === 'compliant') {
              progress.compliant_controls++;
            }
          }
        });

        // Calculate percentages
        standardMap.forEach((progress) => {
          progress.percentage = progress.total_controls > 0
            ? (progress.compliant_controls / progress.total_controls) * 100
            : 0;
        });

        setStandardProgress(
          Array.from(standardMap.values())
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error('Failed to fetch standard progress:', error);
    }
  };

  const getActionTypeBadge = (action: string) => {
    const colors: { [key: string]: string } = {
      'LOGIN_SUCCESS': 'bg-green-100 text-green-800',
      'CONTROL_ACTIVATED': 'bg-blue-100 text-blue-800',
      'EVIDENCE_SUBMITTED': 'bg-purple-100 text-purple-800',
      'TEMPLATE_ACTIVATED': 'bg-orange-100 text-orange-800',
      'RISK_CREATED': 'bg-yellow-100 text-yellow-800',
      'TICKET_CREATED': 'bg-cyan-100 text-cyan-800'
    };
    
    const color = colors[action] || 'bg-gray-100 text-gray-800';
    return <Badge className={`${color} text-xs`}>{action.replace(/_/g, ' ')}</Badge>;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to your GRC Platform</p>
      </div>

      {/* Quick Stats Row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Controls</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.controls.activated}</p>
                  <p className="text-xs text-gray-500 mt-1">of {stats.controls.total} available</p>
                </div>
                <Shield className="h-12 w-12 text-blue-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.controls.compliancePercentage.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{stats.controls.compliant} compliant</p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Controls</p>
                  <p className="text-3xl font-bold text-red-600">{stats.controls.overdue}</p>
                  <p className="text-xs text-gray-500 mt-1">Need attention</p>
                </div>
                <AlertTriangle className="h-12 w-12 text-red-600 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.tickets.openTickets}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.tickets.totalTickets} total</p>
                </div>
                <FileText className="h-12 w-12 text-orange-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Overdue Controls & Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue Controls Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Overdue Controls
              </CardTitle>
              <CardDescription>
                Controls requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueControls.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-gray-500">No overdue controls!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueControls.map((control) => (
                    <Link
                      key={control.id}
                      href={`/controls/${control.control_id}`}
                      className="block p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{control.control_name}</p>
                          <p className="text-sm text-gray-600 mt-1">{control.control_id}</p>
                          {control.owner_name && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {control.owner_name}
                            </p>
                          )}
                        </div>
                        <Badge variant="destructive" className="ml-4">
                          {control.days_overdue}d overdue
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest system events</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Activity className="h-4 w-4 text-gray-400" />
                        <div>
                          {getActionTypeBadge(event.action_type)}
                          {event.target_entity_type && (
                            <p className="text-xs text-gray-500 mt-1">
                              {event.target_entity_type}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(event.performed_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions & Compliance Progress */}
        <div className="space-y-6">
          {/* Quick Actions Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Rocket className="h-5 w-5 mr-2 text-purple-600" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/quick-start')}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Quick Start Templates
              </Button>
              
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/controls')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Activate Control
              </Button>

              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/tickets')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>

              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/documents')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </CardContent>
          </Card>

          {/* Compliance Progress by Standard Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Compliance by Standard
              </CardTitle>
              <CardDescription>Progress across frameworks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {standardProgress.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No data available</p>
              ) : (
                standardProgress.map((std) => (
                  <div key={std.standard}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{std.standard}</span>
                      <span className="text-sm text-gray-600">
                        {std.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          std.percentage >= 80 ? 'bg-green-600' :
                          std.percentage >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${std.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{std.compliant_controls} compliant</span>
                      <span>{std.activated_controls} activated</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
