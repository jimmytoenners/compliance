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
import { Plus, AlertCircle, Clock } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface DSRRequest {
  id: string
  request_type: string
  requester_name: string
  requester_email: string
  requester_phone: string | null
  data_subject_info: string
  request_details: string | null
  status: string
  priority: string
  assigned_to_user_id: string | null
  deadline_date: string
  completed_date: string | null
  response_summary: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export default function DSRPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<DSRRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<DSRRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [formData, setFormData] = useState({
    request_type: "access",
    requester_name: "",
    requester_email: "",
    requester_phone: "",
    data_subject_info: "",
    request_details: "",
    priority: "normal",
  })

  useEffect(() => {
    fetchRequests()
  }, [])

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredRequests(requests)
    } else {
      setFilteredRequests(requests.filter(req => req.status === statusFilter))
    }
  }, [statusFilter, requests])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:8080/api/v1/gdpr/dsr", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch DSR requests")
      }

      const data = await response.json()
      setRequests(data || [])
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDSR = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:8080/api/v1/gdpr/dsr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          requester_phone: formData.requester_phone || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create DSR request")
      }

      const newRequest = await response.json()
      setRequests([newRequest, ...requests])
      setIsCreateOpen(false)
      setFormData({
        request_type: "access",
        requester_name: "",
        requester_email: "",
        requester_phone: "",
        data_subject_info: "",
        request_details: "",
        priority: "normal",
      })
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create DSR request")
    } finally {
      setCreating(false)
    }
  }

  const getRequestTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      access: "bg-blue-500",
      erasure: "bg-red-500",
      rectification: "bg-orange-500",
      portability: "bg-green-500",
      restriction: "bg-yellow-500",
      objection: "bg-purple-500",
    }
    return <Badge className={colors[type] || "bg-gray-500"}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-blue-500">Submitted</Badge>
      case "under_review":
        return <Badge className="bg-yellow-500">Under Review</Badge>
      case "in_progress":
        return <Badge className="bg-orange-500">In Progress</Badge>
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>
      case "high":
        return <Badge className="bg-orange-500">High</Badge>
      case "normal":
        return <Badge variant="secondary">Normal</Badge>
      case "low":
        return <Badge variant="outline">Low</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDeadlineIndicator = (deadline: string, status: string) => {
    if (status === "completed" || status === "rejected") return null
    
    const daysLeft = getDaysUntilDeadline(deadline)
    if (daysLeft < 0) {
      return <Badge variant="destructive" className="flex items-center gap-1"><Clock className="h-3 w-3" />Overdue</Badge>
    } else if (daysLeft <= 7) {
      return <Badge className="bg-orange-500 flex items-center gap-1"><Clock className="h-3 w-3" />{daysLeft}d left</Badge>
    } else {
      return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" />{daysLeft}d left</Badge>
    }
  }

  const getStatusCount = (status: string) => {
    if (status === "all") return requests.length
    return requests.filter(req => req.status === status).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading DSR requests...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Subject Requests</h1>
          <p className="text-muted-foreground">
            Manage GDPR data subject access, erasure, and other requests
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Data Subject Request</DialogTitle>
              <DialogDescription>
                Submit a new GDPR data subject request on behalf of an individual
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDSR} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="request_type">Request Type *</Label>
                <Select value={formData.request_type} onValueChange={(value) => setFormData({ ...formData, request_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="access">Right of Access</SelectItem>
                    <SelectItem value="erasure">Right to Erasure (Delete)</SelectItem>
                    <SelectItem value="rectification">Right to Rectification</SelectItem>
                    <SelectItem value="portability">Right to Data Portability</SelectItem>
                    <SelectItem value="restriction">Right to Restriction</SelectItem>
                    <SelectItem value="objection">Right to Object</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requester_name">Requester Name *</Label>
                  <Input
                    id="requester_name"
                    value={formData.requester_name}
                    onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requester_email">Email *</Label>
                  <Input
                    id="requester_email"
                    type="email"
                    value={formData.requester_email}
                    onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
                    placeholder="email@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requester_phone">Phone (optional)</Label>
                <Input
                  id="requester_phone"
                  value={formData.requester_phone}
                  onChange={(e) => setFormData({ ...formData, requester_phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_subject_info">Data Subject Information *</Label>
                <Textarea
                  id="data_subject_info"
                  value={formData.data_subject_info}
                  onChange={(e) => setFormData({ ...formData, data_subject_info: e.target.value })}
                  placeholder="Account ID, email, or other identifying information"
                  required
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="request_details">Request Details</Label>
                <Textarea
                  id="request_details"
                  value={formData.request_details}
                  onChange={(e) => setFormData({ ...formData, request_details: e.target.value })}
                  placeholder="Additional details about the request"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
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
                  {creating ? "Creating..." : "Create Request"}
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
              <CardTitle>DSR Queue</CardTitle>
              <CardDescription>
                Track and manage data subject requests (30-day deadline per GDPR)
              </CardDescription>
            </div>
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">
                All ({getStatusCount("all")})
              </TabsTrigger>
              <TabsTrigger value="submitted">
                Submitted ({getStatusCount("submitted")})
              </TabsTrigger>
              <TabsTrigger value="under_review">
                Under Review ({getStatusCount("under_review")})
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                In Progress ({getStatusCount("in_progress")})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({getStatusCount("completed")})
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

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Requests</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === "all" 
                  ? "No data subject requests yet" 
                  : `No ${statusFilter.replace('_', ' ')} requests found`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Requester</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Priority</th>
                    <th className="text-left p-3 font-medium">Deadline</th>
                    <th className="text-left p-3 font-medium">Submitted</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        {getRequestTypeBadge(request.request_type)}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{request.requester_name}</div>
                        <div className="text-sm text-muted-foreground">{request.requester_email}</div>
                      </td>
                      <td className="p-3">{getStatusBadge(request.status)}</td>
                      <td className="p-3">{getPriorityBadge(request.priority)}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm">{new Date(request.deadline_date).toLocaleDateString()}</div>
                          {getDeadlineIndicator(request.deadline_date, request.status)}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/gdpr/dsr/${request.id}`)}
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
