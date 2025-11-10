"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, AlertTriangle, AlertCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface RiskAssessment {
  id: string
  title: string
  description: string
  category: string | null
  likelihood: number
  impact: number
  risk_score: number
  status: string
  owner_id: string | null
  mitigation_plan: string | null
  residual_likelihood: number | null
  residual_impact: number | null
  residual_risk_score: number
  review_date: string | null
  created_at: string
  updated_at: string
}

export default function RisksPage() {
  const router = useRouter()
  const [risks, setRisks] = useState<RiskAssessment[]>([])
  const [filteredRisks, setFilteredRisks] = useState<RiskAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Technical",
    likelihood: 3,
    impact: 3,
  })

  useEffect(() => {
    fetchRisks()
  }, [])

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredRisks(risks)
    } else {
      setFilteredRisks(risks.filter(risk => risk.status === statusFilter))
    }
  }, [statusFilter, risks])

  const fetchRisks = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:8080/api/v1/risks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch risks")
      }

      const data = await response.json()
      setRisks(data || [])
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:8080/api/v1/risks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to create risk")
      }

      const newRisk = await response.json()
      setRisks([newRisk, ...risks])
      setIsCreateOpen(false)
      setFormData({
        title: "",
        description: "",
        category: "Technical",
        likelihood: 3,
        impact: 3,
      })
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create risk")
    } finally {
      setCreating(false)
    }
  }

  const getSeverityLevel = (score: number) => {
    if (score >= 15) return { label: "Critical", color: "bg-red-600" }
    if (score >= 10) return { label: "High", color: "bg-orange-500" }
    if (score >= 6) return { label: "Medium", color: "bg-yellow-500" }
    return { label: "Low", color: "bg-green-500" }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "identified":
        return <Badge className="bg-blue-500">Identified</Badge>
      case "assessed":
        return <Badge className="bg-purple-500">Assessed</Badge>
      case "mitigated":
        return <Badge className="bg-green-500">Mitigated</Badge>
      case "accepted":
        return <Badge className="bg-yellow-500">Accepted</Badge>
      case "closed":
        return <Badge className="bg-gray-500">Closed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusCount = (status: string) => {
    if (status === "all") return risks.length
    return risks.filter(risk => risk.status === status).length
  }

  // Risk matrix data for heat map
  const getRiskMatrixCell = (likelihood: number, impact: number) => {
    const risksInCell = filteredRisks.filter(r => r.likelihood === likelihood && r.impact === impact)
    return risksInCell.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading risks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Assessment</h1>
          <p className="text-muted-foreground">
            Identify, assess, and manage organizational risks
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Risk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Risk Assessment</DialogTitle>
              <DialogDescription>
                Add a new risk to your risk register
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRisk} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Risk Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Data Breach Risk"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the risk and its potential consequences"
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operational">Operational</SelectItem>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Strategic">Strategic</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="likelihood">Likelihood (1-5) *</Label>
                  <Select value={formData.likelihood.toString()} onValueChange={(value) => setFormData({ ...formData, likelihood: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Very Low</SelectItem>
                      <SelectItem value="2">2 - Low</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="4">4 - High</SelectItem>
                      <SelectItem value="5">5 - Very High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="impact">Impact (1-5) *</Label>
                  <Select value={formData.impact.toString()} onValueChange={(value) => setFormData({ ...formData, impact: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Negligible</SelectItem>
                      <SelectItem value="2">2 - Minor</SelectItem>
                      <SelectItem value="3">3 - Moderate</SelectItem>
                      <SelectItem value="4">4 - Major</SelectItem>
                      <SelectItem value="5">5 - Catastrophic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium">Risk Score: {formData.likelihood * formData.impact}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Severity: {getSeverityLevel(formData.likelihood * formData.impact).label}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Risk"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Risk Matrix Heat Map */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Matrix</CardTitle>
          <CardDescription>Visual representation of likelihood vs impact</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 text-sm bg-muted"></th>
                  <th className="border p-2 text-sm bg-muted" colSpan={5}>Impact</th>
                </tr>
                <tr>
                  <th className="border p-2 text-sm bg-muted">Likelihood</th>
                  <th className="border p-2 text-sm bg-muted">1</th>
                  <th className="border p-2 text-sm bg-muted">2</th>
                  <th className="border p-2 text-sm bg-muted">3</th>
                  <th className="border p-2 text-sm bg-muted">4</th>
                  <th className="border p-2 text-sm bg-muted">5</th>
                </tr>
              </thead>
              <tbody>
                {[5, 4, 3, 2, 1].map((likelihood) => (
                  <tr key={likelihood}>
                    <td className="border p-2 text-sm font-medium bg-muted text-center">{likelihood}</td>
                    {[1, 2, 3, 4, 5].map((impact) => {
                      const score = likelihood * impact
                      const severity = getSeverityLevel(score)
                      const count = getRiskMatrixCell(likelihood, impact)
                      return (
                        <td
                          key={impact}
                          className={`border p-4 text-center cursor-pointer hover:opacity-80 ${severity.color} text-white`}
                          onClick={() => {
                            if (count > 0) {
                              router.push(`/risks?likelihood=${likelihood}&impact=${impact}`)
                            }
                          }}
                        >
                          <div className="text-2xl font-bold">{count}</div>
                          <div className="text-xs mt-1">{severity.label}</div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Risks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Risk Register</CardTitle>
              <CardDescription>
                Track and manage identified risks
              </CardDescription>
            </div>
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">
                All ({getStatusCount("all")})
              </TabsTrigger>
              <TabsTrigger value="identified">
                Identified ({getStatusCount("identified")})
              </TabsTrigger>
              <TabsTrigger value="assessed">
                Assessed ({getStatusCount("assessed")})
              </TabsTrigger>
              <TabsTrigger value="mitigated">
                Mitigated ({getStatusCount("mitigated")})
              </TabsTrigger>
              <TabsTrigger value="accepted">
                Accepted ({getStatusCount("accepted")})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {filteredRisks.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Risks</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === "all" 
                  ? "Get started by creating your first risk assessment" 
                  : `No ${statusFilter} risks found`}
              </p>
              {statusFilter === "all" && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Risk
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Risk Title</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">L</th>
                    <th className="text-left p-3 font-medium">I</th>
                    <th className="text-left p-3 font-medium">Score</th>
                    <th className="text-left p-3 font-medium">Severity</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRisks.map((risk) => {
                    const severity = getSeverityLevel(risk.risk_score)
                    return (
                      <tr key={risk.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <button
                            onClick={() => router.push(`/risks/${risk.id}`)}
                            className="font-medium text-blue-600 hover:underline text-left"
                          >
                            {risk.title}
                          </button>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {risk.category || "-"}
                        </td>
                        <td className="p-3 text-center font-medium">{risk.likelihood}</td>
                        <td className="p-3 text-center font-medium">{risk.impact}</td>
                        <td className="p-3 text-center font-bold">{risk.risk_score}</td>
                        <td className="p-3">
                          <Badge className={severity.color}>{severity.label}</Badge>
                        </td>
                        <td className="p-3">{getStatusBadge(risk.status)}</td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/risks/${risk.id}`)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
