"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Download, TrendingUp, TrendingDown, BarChart3, PieChart } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface ControlComplianceTrend {
  date: string
  compliant: number
  non_compliant: number
  total_activated: number
}

interface RiskDistribution {
  severity: string
  count: number
}

interface RiskTrend {
  month: string
  open_risks: number
  closed_risks: number
  avg_risk_score: number
}

interface DSRMetrics {
  total_requests: number
  submitted: number
  under_review: number
  in_progress: number
  completed: number
  rejected: number
  overdue: number
  avg_response_days: number
  completion_rate: number
}

interface AssetBreakdown {
  asset_type: string
  count: number
  active: number
  inactive: number
}

interface ROPAMetrics {
  total_processing_activities: number
  active: number
  draft: number
  archived: number
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [complianceTrends, setComplianceTrends] = useState<ControlComplianceTrend[]>([])
  const [riskDistribution, setRiskDistribution] = useState<RiskDistribution[]>([])
  const [riskTrends, setRiskTrends] = useState<RiskTrend[]>([])
  const [dsrMetrics, setDSRMetrics] = useState<DSRMetrics | null>(null)
  const [assetBreakdown, setAssetBreakdown] = useState<AssetBreakdown[]>([])
  const [ropaMetrics, setROPAMetrics] = useState<ROPAMetrics | null>(null)

  useEffect(() => {
    // Set default dates (last 30 days)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setStartDate(start.toISOString().split("T")[0])
    setEndDate(end.toISOString().split("T")[0])
    
    fetchAllAnalytics()
  }, [])

  const fetchAllAnalytics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const headers = {
        Authorization: `Bearer ${token}`,
      }

      // Fetch all analytics data in parallel
      const [
        complianceRes,
        riskDistRes,
        riskTrendsRes,
        dsrMetricsRes,
        assetBreakdownRes,
        ropaMetricsRes,
      ] = await Promise.all([
        fetch(`http://localhost:8080/api/v1/analytics/control-compliance-trends?start_date=${startDate}&end_date=${endDate}`, { headers }),
        fetch("http://localhost:8080/api/v1/analytics/risk-distribution", { headers }),
        fetch("http://localhost:8080/api/v1/analytics/risk-trends?months=6", { headers }),
        fetch("http://localhost:8080/api/v1/analytics/dsr-metrics", { headers }),
        fetch("http://localhost:8080/api/v1/analytics/asset-breakdown", { headers }),
        fetch("http://localhost:8080/api/v1/analytics/ropa-metrics", { headers }),
      ])

      if (complianceRes.ok) setComplianceTrends(await complianceRes.json())
      if (riskDistRes.ok) setRiskDistribution(await riskDistRes.json())
      if (riskTrendsRes.ok) setRiskTrends(await riskTrendsRes.json())
      if (dsrMetricsRes.ok) setDSRMetrics(await dsrMetricsRes.json())
      if (assetBreakdownRes.ok) setAssetBreakdown(await assetBreakdownRes.json())
      if (ropaMetricsRes.ok) setROPAMetrics(await ropaMetricsRes.json())

      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchAllAnalytics()
  }

  const handleExport = () => {
    const data = {
      generated_at: new Date().toISOString(),
      compliance_trends: complianceTrends,
      risk_distribution: riskDistribution,
      risk_trends: riskTrends,
      dsr_metrics: dsrMetrics,
      asset_breakdown: assetBreakdown,
      ropa_metrics: ropaMetrics,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `grc-analytics-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const RISK_COLORS = {
    Critical: "#dc2626",
    High: "#ea580c",
    Medium: "#ca8a04",
    Low: "#16a34a",
  }

  const ASSET_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into compliance, risk, and GDPR metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchAllAnalytics}>Apply Filter</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Compliance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Control Compliance Trends</CardTitle>
          <CardDescription>Daily compliance status over time</CardDescription>
        </CardHeader>
        <CardContent>
          {complianceTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={complianceTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="compliant"
                  stroke="#16a34a"
                  name="Compliant"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="non_compliant"
                  stroke="#dc2626"
                  name="Non-Compliant"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="total_activated"
                  stroke="#3b82f6"
                  name="Total Activated"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No compliance data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Active risks by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            {riskDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={riskDistribution}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.severity}: ${entry.count}`}
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.severity as keyof typeof RISK_COLORS] || "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No risk data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Trends</CardTitle>
            <CardDescription>Monthly risk management metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {riskTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={riskTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="open_risks" fill="#ea580c" name="Open Risks" />
                  <Bar dataKey="closed_risks" fill="#16a34a" name="Closed Risks" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No risk trend data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DSR Metrics */}
      {dsrMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>GDPR Data Subject Request Metrics</CardTitle>
            <CardDescription>30-day response compliance tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Total Requests</div>
                <div className="text-3xl font-bold">{dsrMetrics.total_requests}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Completion Rate</div>
                <div className="text-3xl font-bold flex items-center gap-2">
                  {dsrMetrics.completion_rate.toFixed(1)}%
                  {dsrMetrics.completion_rate >= 80 ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
                <div className="text-3xl font-bold">{dsrMetrics.avg_response_days.toFixed(1)} days</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Overdue</div>
                <div className="text-3xl font-bold text-red-600">{dsrMetrics.overdue}</div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Submitted</div>
                <div className="text-2xl font-bold text-blue-600">{dsrMetrics.submitted}</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Under Review</div>
                <div className="text-2xl font-bold text-yellow-600">{dsrMetrics.under_review}</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-sm text-muted-foreground">In Progress</div>
                <div className="text-2xl font-bold text-orange-600">{dsrMetrics.in_progress}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Completed</div>
                <div className="text-2xl font-bold text-green-600">{dsrMetrics.completed}</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Rejected</div>
                <div className="text-2xl font-bold text-red-600">{dsrMetrics.rejected}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Asset Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Inventory</CardTitle>
            <CardDescription>Assets by type and status</CardDescription>
          </CardHeader>
          <CardContent>
            {assetBreakdown.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={assetBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="asset_type" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="active" fill="#16a34a" name="Active" />
                    <Bar dataKey="inactive" fill="#6b7280" name="Inactive" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No asset data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* ROPA Metrics */}
        {ropaMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>GDPR ROPA Status</CardTitle>
              <CardDescription>Record of Processing Activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="font-medium">Total Processing Activities</span>
                  <span className="text-2xl font-bold">{ropaMetrics.total_processing_activities}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">Active</div>
                    <div className="text-2xl font-bold text-green-600">{ropaMetrics.active}</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">Draft</div>
                    <div className="text-2xl font-bold text-yellow-600">{ropaMetrics.draft}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground">Archived</div>
                    <div className="text-2xl font-bold text-gray-600">{ropaMetrics.archived}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={150}>
                    <RePieChart>
                      <Pie
                        data={[
                          { name: "Active", value: ropaMetrics.active },
                          { name: "Draft", value: ropaMetrics.draft },
                          { name: "Archived", value: ropaMetrics.archived },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label
                      >
                        <Cell fill="#16a34a" />
                        <Cell fill="#ca8a04" />
                        <Cell fill="#6b7280" />
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
