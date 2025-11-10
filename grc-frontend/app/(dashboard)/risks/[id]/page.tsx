"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, ArrowLeft, Edit, Save, X, Trash2, Plus } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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

interface MappedControl {
  activated_control_id: string
  control_library_id: string
  control_name: string
  status: string
  next_review_due_date: string | null
}

interface Control {
  id: string
  name: string
  status: string
}

export default function RiskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const riskId = params.id as string

  const [risk, setRisk] = useState<RiskAssessment | null>(null)
  const [controls, setControls] = useState<MappedControl[]>([])
  const [allControls, setAllControls] = useState<Control[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isAddControlOpen, setIsAddControlOpen] = useState(false)
  const [selectedControl, setSelectedControl] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    likelihood: 3,
    impact: 3,
    status: "identified",
    mitigation_plan: "",
    residual_likelihood: null as number | null,
    residual_impact: null as number | null,
    review_date: "",
  })

  useEffect(() => {
    fetchRiskDetails()
    fetchControls()
    fetchAllControls()
  }, [riskId])

  const fetchRiskDetails = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:8080/api/v1/risks/${riskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch risk details")
      }

      const data = await response.json()
      setRisk(data)
      setFormData({
        title: data.title,
        description: data.description,
        category: data.category || "",
        likelihood: data.likelihood,
        impact: data.impact,
        status: data.status,
        mitigation_plan: data.mitigation_plan || "",
        residual_likelihood: data.residual_likelihood,
        residual_impact: data.residual_impact,
        review_date: data.review_date ? data.review_date.split('T')[0] : "",
      })
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchControls = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:8080/api/v1/risks/${riskId}/controls`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setControls(data || [])
      }
    } catch (err) {
      console.error("Failed to fetch controls:", err)
    }
  }

  const fetchAllControls = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:8080/api/v1/controls/activated", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAllControls(data || [])
      }
    } catch (err) {
      console.error("Failed to fetch all controls:", err)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:8080/api/v1/risks/${riskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          review_date: formData.review_date ? new Date(formData.review_date).toISOString() : null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update risk")
      }

      const updatedRisk = await response.json()
      setRisk(updatedRisk)
      setIsEditing(false)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update risk")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:8080/api/v1/risks/${riskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete risk")
      }

      router.push("/risks")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete risk")
    }
  }

  const handleAddControl = async () => {
    if (!selectedControl) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:8080/api/v1/mappings/risk-to-control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          risk_id: riskId,
          control_id: selectedControl,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add control")
      }

      await fetchControls()
      setIsAddControlOpen(false)
      setSelectedControl("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add control")
    }
  }

  const handleRemoveControl = async (controlId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:8080/api/v1/mappings/risk-to-control", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          risk_id: riskId,
          control_id: controlId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to remove control")
      }

      await fetchControls()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove control")
    }
  }

  const handleCancel = () => {
    if (risk) {
      setFormData({
        title: risk.title,
        description: risk.description,
        category: risk.category || "",
        likelihood: risk.likelihood,
        impact: risk.impact,
        status: risk.status,
        mitigation_plan: risk.mitigation_plan || "",
        residual_likelihood: risk.residual_likelihood,
        residual_impact: risk.residual_impact,
        review_date: risk.review_date ? risk.review_date.split('T')[0] : "",
      })
    }
    setIsEditing(false)
    setError("")
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

  const availableControls = allControls.filter(
    ctrl => !controls.some(mapped => mapped.activated_control_id === ctrl.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading risk details...</div>
      </div>
    )
  }

  if (!risk) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Risk Not Found</h3>
              <p className="text-muted-foreground">
                The risk you're looking for doesn't exist.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const inherentScore = formData.likelihood * formData.impact
  const residualScore = (formData.residual_likelihood || formData.likelihood) * (formData.residual_impact || formData.impact)
  const inherentSeverity = getSeverityLevel(inherentScore)
  const residualSeverity = getSeverityLevel(residualScore)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Risk?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this risk assessment. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Risk Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-2xl font-bold mb-2"
                  placeholder="Risk Title"
                />
              ) : (
                <CardTitle className="text-2xl">{risk.title}</CardTitle>
              )}
              <CardDescription className="mt-2">
                Risk Assessment Details
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isEditing ? (
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identified">Identified</SelectItem>
                    <SelectItem value="assessed">Assessed</SelectItem>
                    <SelectItem value="mitigated">Mitigated</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                getStatusBadge(risk.status)
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Description</Label>
            {isEditing ? (
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Risk description"
                rows={3}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{risk.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Category</Label>
              {isEditing ? (
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
              ) : (
                <p className="text-sm">{risk.category || "-"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Review Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.review_date}
                  onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                />
              ) : (
                <p className="text-sm">{risk.review_date ? new Date(risk.review_date).toLocaleDateString() : "-"}</p>
              )}
            </div>
          </div>

          {/* Inherent Risk */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Inherent Risk (Before Mitigation)</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Likelihood (1-5)</Label>
                {isEditing ? (
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
                ) : (
                  <p className="text-2xl font-bold">{risk.likelihood}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Impact (1-5)</Label>
                {isEditing ? (
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
                ) : (
                  <p className="text-2xl font-bold">{risk.impact}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Risk Score</Label>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{inherentScore}</p>
                  <Badge className={inherentSeverity.color}>{inherentSeverity.label}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Mitigation Plan */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Mitigation Plan</h3>
            <div className="space-y-2">
              {isEditing ? (
                <Textarea
                  value={formData.mitigation_plan}
                  onChange={(e) => setFormData({ ...formData, mitigation_plan: e.target.value })}
                  placeholder="Describe mitigation strategies and actions..."
                  rows={5}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{risk.mitigation_plan || "No mitigation plan defined"}</p>
              )}
            </div>
          </div>

          {/* Residual Risk */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Residual Risk (After Mitigation)</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Likelihood (1-5)</Label>
                {isEditing ? (
                  <Select 
                    value={(formData.residual_likelihood || formData.likelihood).toString()} 
                    onValueChange={(value) => setFormData({ ...formData, residual_likelihood: parseInt(value) })}
                  >
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
                ) : (
                  <p className="text-2xl font-bold">{risk.residual_likelihood || risk.likelihood}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Impact (1-5)</Label>
                {isEditing ? (
                  <Select 
                    value={(formData.residual_impact || formData.impact).toString()} 
                    onValueChange={(value) => setFormData({ ...formData, residual_impact: parseInt(value) })}
                  >
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
                ) : (
                  <p className="text-2xl font-bold">{risk.residual_impact || risk.impact}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Risk Score</Label>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{residualScore}</p>
                  <Badge className={residualSeverity.color}>{residualSeverity.label}</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <span className="ml-2">{new Date(risk.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="ml-2">{new Date(risk.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Controls Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Linked Controls</CardTitle>
              <CardDescription>
                Controls that mitigate this risk
              </CardDescription>
            </div>
            <Dialog open={isAddControlOpen} onOpenChange={setIsAddControlOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Control
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Control to Risk</DialogTitle>
                  <DialogDescription>
                    Link an existing control to this risk
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Control</Label>
                    <Select value={selectedControl} onValueChange={setSelectedControl}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a control..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableControls.map((control) => (
                          <SelectItem key={control.id} value={control.id}>
                            {control.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddControlOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddControl} disabled={!selectedControl}>
                      Add Control
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {controls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No controls linked to this risk yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Control Name</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Next Review</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {controls.map((control) => (
                    <tr key={control.activated_control_id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{control.control_name}</td>
                      <td className="p-3">
                        <Badge className={control.status === "compliant" ? "bg-green-500" : "bg-yellow-500"}>
                          {control.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {control.next_review_due_date 
                          ? new Date(control.next_review_due_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="p-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600">
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Control?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will unlink the control from this risk.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveControl(control.activated_control_id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
