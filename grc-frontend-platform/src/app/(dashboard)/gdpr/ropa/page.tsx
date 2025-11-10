"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, FileText, AlertCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

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

export default function ROPAPage() {
  const router = useRouter()
  const [ropaEntries, setRopaEntries] = useState<ROPAEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<ROPAEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")

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
  })

  useEffect(() => {
    fetchRopaEntries()
  }, [])

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredEntries(ropaEntries)
    } else {
      setFilteredEntries(ropaEntries.filter(entry => entry.status === statusFilter))
    }
  }, [statusFilter, ropaEntries])

  const fetchRopaEntries = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:8080/api/v1/gdpr/ropa", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch ROPA entries")
      }

      const data = await response.json()
      setRopaEntries(data || [])
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRopa = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:8080/api/v1/gdpr/ropa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to create ROPA entry")
      }

      const newEntry = await response.json()
      setRopaEntries([newEntry, ...ropaEntries])
      setIsCreateOpen(false)
      setFormData({
        activity_name: "",
        department: "",
        data_controller_details: "",
        data_categories: "",
        data_subject_categories: "",
        recipients: "",
        third_country_transfers: "",
        retention_period: "",
        security_measures: "",
      })
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ROPA entry")
    } finally {
      setCreating(false)
    }
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

  const getStatusCount = (status: string) => {
    if (status === "all") return ropaEntries.length
    return ropaEntries.filter(entry => entry.status === status).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading ROPA entries...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GDPR ROPA</h1>
          <p className="text-muted-foreground">
            Record of Processing Activities (Article 30)
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Processing Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Processing Activity</DialogTitle>
              <DialogDescription>
                Add a new record of processing activity under GDPR Article 30
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRopa} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activity_name">Activity Name *</Label>
                <Input
                  id="activity_name"
                  value={formData.activity_name}
                  onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                  placeholder="e.g., Customer Order Processing"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Sales, Marketing"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_controller_details">Data Controller Details *</Label>
                <Textarea
                  id="data_controller_details"
                  value={formData.data_controller_details}
                  onChange={(e) => setFormData({ ...formData, data_controller_details: e.target.value })}
                  placeholder="Company name, address, contact information"
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_categories">Data Categories *</Label>
                <Textarea
                  id="data_categories"
                  value={formData.data_categories}
                  onChange={(e) => setFormData({ ...formData, data_categories: e.target.value })}
                  placeholder="e.g., Personal identifiers, Contact information, Financial data"
                  required
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_subject_categories">Data Subject Categories *</Label>
                <Textarea
                  id="data_subject_categories"
                  value={formData.data_subject_categories}
                  onChange={(e) => setFormData({ ...formData, data_subject_categories: e.target.value })}
                  placeholder="e.g., Customers, Employees, Prospects"
                  required
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipients">Recipients</Label>
                <Textarea
                  id="recipients"
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  placeholder="Who receives the data (internal teams, third parties)"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="third_country_transfers">Third Country Transfers</Label>
                <Textarea
                  id="third_country_transfers"
                  value={formData.third_country_transfers}
                  onChange={(e) => setFormData({ ...formData, third_country_transfers: e.target.value })}
                  placeholder="Details of any transfers outside the EU/EEA"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="retention_period">Retention Period</Label>
                <Input
                  id="retention_period"
                  value={formData.retention_period}
                  onChange={(e) => setFormData({ ...formData, retention_period: e.target.value })}
                  placeholder="e.g., 7 years from last transaction"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="security_measures">Security Measures</Label>
                <Textarea
                  id="security_measures"
                  value={formData.security_measures}
                  onChange={(e) => setFormData({ ...formData, security_measures: e.target.value })}
                  placeholder="Technical and organizational security measures"
                  rows={3}
                />
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
                  {creating ? "Creating..." : "Create Processing Activity"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Processing Activities</CardTitle>
              <CardDescription>
                Manage records of processing activities as required by GDPR Article 30
              </CardDescription>
            </div>
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">
                All ({getStatusCount("all")})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({getStatusCount("active")})
              </TabsTrigger>
              <TabsTrigger value="draft">
                Draft ({getStatusCount("draft")})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived ({getStatusCount("archived")})
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

          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Processing Activities</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === "all" 
                  ? "Get started by creating your first ROPA entry" 
                  : `No ${statusFilter} processing activities found`}
              </p>
              {statusFilter === "all" && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Processing Activity
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Activity Name</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-left p-3 font-medium">Data Categories</th>
                    <th className="text-left p-3 font-medium">Data Subjects</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Updated</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <button
                          onClick={() => router.push(`/gdpr/ropa/${entry.id}`)}
                          className="font-medium text-blue-600 hover:underline text-left"
                        >
                          {entry.activity_name}
                        </button>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {entry.department || "-"}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
                        {entry.data_categories}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
                        {entry.data_subject_categories}
                      </td>
                      <td className="p-3">{getStatusBadge(entry.status)}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(entry.updated_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/gdpr/ropa/${entry.id}`)}
                        >
                          View Details
                        </Button>
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
