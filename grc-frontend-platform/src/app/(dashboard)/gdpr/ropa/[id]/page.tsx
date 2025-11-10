"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, ArrowLeft, Edit, Save, X, Archive, CheckCircle } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ROPAEntry {
  id: string
  activity_name: string
  department: string
  data_controller_details: string
  data_categories: string
  data_subject_categories: string
  recipients: string
  third_country_transfers: string
  retention_period: string
  security_measures: string
  status: "draft" | "active" | "archived"
  created_at: string
  updated_at: string
}

export default function ROPADetailPage() {
  const params = useParams()
  const router = useRouter()
  const ropaId = params.id as string

  const [ropa, setRopa] = useState<ROPAEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    activity_name: "",
    department: "",
    data_controller_details: "",
    data_categories: "",
    data_subject_categories: "",
    recipients: "",
    third_country_transfers: "",
    retention_period: "",
    security_measures: "",
    status: "draft" as "draft" | "active" | "archived",
  })

  useEffect(() => {
    fetchRopaEntry()
  }, [ropaId])

  const fetchRopaEntry = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:8080/api/v1/gdpr/ropa/${ropaId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch ROPA entry")
      }

      const data = await response.json()
      setRopa(data)
      setFormData({
        activity_name: data.activity_name,
        department: data.department || "",
        data_controller_details: data.data_controller_details,
        data_categories: data.data_categories,
        data_subject_categories: data.data_subject_categories,
        recipients: data.recipients || "",
        third_country_transfers: data.third_country_transfers || "",
        retention_period: data.retention_period || "",
        security_measures: data.security_measures || "",
        status: data.status,
      })
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:8080/api/v1/gdpr/ropa/${ropaId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update ROPA entry")
      }

      const updatedEntry = await response.json()
      setRopa(updatedEntry)
      setIsEditing(false)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ROPA entry")
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:8080/api/v1/gdpr/ropa/${ropaId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to archive ROPA entry")
      }

      router.push("/gdpr/ropa")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive ROPA entry")
    }
  }

  const handleCancel = () => {
    if (ropa) {
      setFormData({
        activity_name: ropa.activity_name,
        department: ropa.department || "",
        data_controller_details: ropa.data_controller_details,
        data_categories: ropa.data_categories,
        data_subject_categories: ropa.data_subject_categories,
        recipients: ropa.recipients || "",
        third_country_transfers: ropa.third_country_transfers || "",
        retention_period: ropa.retention_period || "",
        security_measures: ropa.security_measures || "",
        status: ropa.status,
      })
    }
    setIsEditing(false)
    setError("")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>
      case "draft":
        return <Badge className="bg-yellow-500">Draft</Badge>
      case "archived":
        return <Badge className="bg-gray-500">Archived</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading ROPA entry...</div>
      </div>
    )
  }

  if (!ropa) {
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
              <h3 className="text-lg font-semibold mb-2">ROPA Entry Not Found</h3>
              <p className="text-muted-foreground">
                The processing activity you're looking for doesn't exist.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive Processing Activity?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will archive the processing activity. It will no longer appear in the active list,
                      but the record will be preserved for compliance purposes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchive} className="bg-red-600 hover:bg-red-700">
                      Archive
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

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={formData.activity_name}
                  onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                  className="text-2xl font-bold mb-2"
                  placeholder="Activity Name"
                />
              ) : (
                <CardTitle className="text-2xl">{ropa.activity_name}</CardTitle>
              )}
              <CardDescription className="mt-2">
                Record of Processing Activity - GDPR Article 30
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isEditing ? (
                <Select value={formData.status} onValueChange={(value: "draft" | "active" | "archived") => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                getStatusBadge(ropa.status)
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Department</Label>
              {isEditing ? (
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Sales, Marketing"
                />
              ) : (
                <p className="text-sm">{ropa.department || "-"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Retention Period</Label>
              {isEditing ? (
                <Input
                  value={formData.retention_period}
                  onChange={(e) => setFormData({ ...formData, retention_period: e.target.value })}
                  placeholder="e.g., 7 years from last transaction"
                />
              ) : (
                <p className="text-sm">{ropa.retention_period || "-"}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Data Controller Details *</Label>
            {isEditing ? (
              <Textarea
                value={formData.data_controller_details}
                onChange={(e) => setFormData({ ...formData, data_controller_details: e.target.value })}
                placeholder="Company name, address, contact information"
                rows={3}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{ropa.data_controller_details}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Data Categories *</Label>
            {isEditing ? (
              <Textarea
                value={formData.data_categories}
                onChange={(e) => setFormData({ ...formData, data_categories: e.target.value })}
                placeholder="e.g., Personal identifiers, Contact information, Financial data"
                rows={3}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{ropa.data_categories}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Data Subject Categories *</Label>
            {isEditing ? (
              <Textarea
                value={formData.data_subject_categories}
                onChange={(e) => setFormData({ ...formData, data_subject_categories: e.target.value })}
                placeholder="e.g., Customers, Employees, Prospects"
                rows={3}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{ropa.data_subject_categories}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Recipients</Label>
            {isEditing ? (
              <Textarea
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                placeholder="Who receives the data (internal teams, third parties)"
                rows={3}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{ropa.recipients || "-"}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Third Country Transfers</Label>
            {isEditing ? (
              <Textarea
                value={formData.third_country_transfers}
                onChange={(e) => setFormData({ ...formData, third_country_transfers: e.target.value })}
                placeholder="Details of any transfers outside the EU/EEA"
                rows={3}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{ropa.third_country_transfers || "-"}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Security Measures</Label>
            {isEditing ? (
              <Textarea
                value={formData.security_measures}
                onChange={(e) => setFormData({ ...formData, security_measures: e.target.value })}
                placeholder="Technical and organizational security measures"
                rows={4}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{ropa.security_measures || "-"}</p>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <span className="ml-2">{new Date(ropa.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="ml-2">{new Date(ropa.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
