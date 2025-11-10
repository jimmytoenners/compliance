"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ArrowLeft, Edit2, Save, X, AlertCircle, CheckCircle, Clock, User } from "lucide-react"

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

export default function DSRDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [request, setRequest] = useState<DSRRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [completeResponse, setCompleteResponse] = useState("")
  const [rejectReason, setRejectReason] = useState("")

  const [editData, setEditData] = useState({
    status: "",
    priority: "",
    requester_phone: "",
    request_details: "",
    assigned_to_user_id: "",
  })

  useEffect(() => {
    if (id) {
      fetchRequest()
    }
  }, [id])

  const fetchRequest = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:8080/api/v1/gdpr/dsr/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch DSR request")
      }

      const data = await response.json()
      setRequest(data)
      setEditData({
        status: data.status,
        priority: data.priority,
        requester_phone: data.requester_phone || "",
        request_details: data.request_details || "",
        assigned_to_user_id: data.assigned_to_user_id || "",
      })
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const updatePayload: Record<string, any> = {}
      
      if (editData.status !== request?.status) updatePayload.status = editData.status
      if (editData.priority !== request?.priority) updatePayload.priority = editData.priority
      if (editData.requester_phone !== (request?.requester_phone || "")) {
        updatePayload.requester_phone = editData.requester_phone || null
      }
      if (editData.request_details !== (request?.request_details || "")) {
        updatePayload.request_details = editData.request_details || null
      }
      if (editData.assigned_to_user_id !== (request?.assigned_to_user_id || "")) {
        updatePayload.assigned_to_user_id = editData.assigned_to_user_id || null
      }

      const response = await fetch(`http://localhost:8080/api/v1/gdpr/dsr/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        throw new Error("Failed to update DSR request")
      }

      const updatedRequest = await response.json()
      setRequest(updatedRequest)
      setIsEditing(false)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update DSR request")
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!completeResponse.trim()) {
      setError("Response summary is required to complete the request")
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:8080/api/v1/gdpr/dsr/${id}/complete`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          response_summary: completeResponse,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to complete DSR request")
      }

      const updatedRequest = await response.json()
      setRequest(updatedRequest)
      setShowCompleteDialog(false)
      setCompleteResponse("")
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete DSR request")
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError("Rejection reason is required")
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:8080/api/v1/gdpr/dsr/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "rejected",
          rejection_reason: rejectReason,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject DSR request")
      }

      const updatedRequest = await response.json()
      setRequest(updatedRequest)
      setShowRejectDialog(false)
      setRejectReason("")
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject DSR request")
    } finally {
      setSaving(false)
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

  const getDaysUntilDeadline = () => {
    if (!request) return 0
    const deadlineDate = new Date(request.deadline_date)
    const today = new Date()
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDeadlineStatus = () => {
    const daysLeft = getDaysUntilDeadline()
    if (daysLeft < 0) {
      return { text: `Overdue by ${Math.abs(daysLeft)} days`, color: "text-red-600", icon: AlertCircle }
    } else if (daysLeft <= 7) {
      return { text: `${daysLeft} days remaining`, color: "text-orange-600", icon: Clock }
    } else {
      return { text: `${daysLeft} days remaining`, color: "text-green-600", icon: CheckCircle }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading DSR request...</div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/gdpr/dsr")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to DSR Queue
        </Button>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Request Not Found</h3>
              <p className="text-muted-foreground">The DSR request could not be found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const deadlineStatus = getDeadlineStatus()
  const DeadlineIcon = deadlineStatus.icon

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/gdpr/dsr")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to DSR Queue
        </Button>
        <div className="flex gap-2">
          {!isEditing && request.status !== "completed" && request.status !== "rejected" && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                Reject Request
              </Button>
              <Button onClick={() => setShowCompleteDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Request
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false)
                setEditData({
                  status: request.status,
                  priority: request.priority,
                  requester_phone: request.requester_phone || "",
                  request_details: request.request_details || "",
                  assigned_to_user_id: request.assigned_to_user_id || "",
                })
              }}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
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

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle>DSR Request Details</CardTitle>
                  {getRequestTypeBadge(request.request_type)}
                </div>
                <CardDescription>Request ID: {request.id}</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(isEditing ? editData.status : request.status)}
                {getPriorityBadge(isEditing ? editData.priority : request.priority)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`flex items-center gap-2 p-4 rounded-lg border ${
              request.status === "completed" || request.status === "rejected" ? "bg-gray-50" : "bg-blue-50"
            }`}>
              <DeadlineIcon className={`h-5 w-5 ${deadlineStatus.color}`} />
              <div>
                <div className="font-semibold">GDPR Compliance Deadline</div>
                <div className={deadlineStatus.color}>
                  {new Date(request.deadline_date).toLocaleDateString()} • {deadlineStatus.text}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Requester Information</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <div className="font-medium">{request.requester_name}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="font-medium">{request.requester_email}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    {isEditing ? (
                      <Input
                        value={editData.requester_phone}
                        onChange={(e) => setEditData({ ...editData, requester_phone: e.target.value })}
                        placeholder="Optional"
                      />
                    ) : (
                      <div className="font-medium">{request.requester_phone || "Not provided"}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Request Management</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    {isEditing ? (
                      <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>{getStatusBadge(request.status)}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Priority</Label>
                    {isEditing ? (
                      <Select value={editData.priority} onValueChange={(value) => setEditData({ ...editData, priority: value })}>
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
                    ) : (
                      <div>{getPriorityBadge(request.priority)}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Assigned To</Label>
                    {isEditing ? (
                      <Input
                        value={editData.assigned_to_user_id}
                        onChange={(e) => setEditData({ ...editData, assigned_to_user_id: e.target.value })}
                        placeholder="User ID"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{request.assigned_to_user_id || "Unassigned"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Data Subject Information</Label>
              <div className="p-3 bg-muted rounded-md font-mono text-sm">
                {request.data_subject_info}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Request Details</Label>
              {isEditing ? (
                <Textarea
                  value={editData.request_details}
                  onChange={(e) => setEditData({ ...editData, request_details: e.target.value })}
                  placeholder="Additional details about the request"
                  rows={4}
                />
              ) : (
                <div className="p-3 bg-muted rounded-md">
                  {request.request_details || "No additional details provided"}
                </div>
              )}
            </div>

            {request.response_summary && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Response Summary</Label>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  {request.response_summary}
                </div>
              </div>
            )}

            {request.rejection_reason && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Rejection Reason</Label>
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  {request.rejection_reason}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <div className="text-sm">{new Date(request.created_at).toLocaleString()}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Updated</Label>
                <div className="text-sm">{new Date(request.updated_at).toLocaleString()}</div>
              </div>
              {request.completed_date && (
                <div>
                  <Label className="text-muted-foreground">Completed</Label>
                  <div className="text-sm">{new Date(request.completed_date).toLocaleString()}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete DSR Request</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a response summary documenting how the request was fulfilled. This will mark the request as completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="complete_response">Response Summary *</Label>
            <Textarea
              id="complete_response"
              value={completeResponse}
              onChange={(e) => setCompleteResponse(e.target.value)}
              placeholder="Describe the actions taken to fulfill this GDPR request..."
              rows={6}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={saving || !completeResponse.trim()}>
              {saving ? "Completing..." : "Complete Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject DSR Request</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a clear reason for rejecting this request. The requester will need to understand why their request cannot be fulfilled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject_reason">Rejection Reason *</Label>
            <Textarea
              id="reject_reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this request is being rejected..."
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject} 
              disabled={saving || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? "Rejecting..." : "Reject Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
