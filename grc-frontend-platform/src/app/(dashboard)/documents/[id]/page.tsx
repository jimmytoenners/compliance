"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, FileText, CheckCircle } from "lucide-react";

interface DocumentInfo {
  id: string;
  title: string;
  category: string;
  owner_id: string | null;
  published_version_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  body_content: string;
  change_description: string;
  status: string;
  created_by_user_id: string;
  created_at: string;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuthStore();
  const documentId = params.id as string;

  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVersionDialogOpen, setCreateVersionDialogOpen] = useState(false);
  const [viewVersionDialogOpen, setViewVersionDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [versionFormData, setVersionFormData] = useState({
    body_content: "",
    change_description: "",
  });

  useEffect(() => {
    if (token && documentId) {
      fetchDocumentData();
    }
  }, [token, documentId]);

  const fetchDocumentData = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/documents/${documentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocument(data.document);
        setVersions(data.versions || []);
      } else {
        console.error("Failed to fetch document");
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!versionFormData.body_content) {
      alert("Content is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/documents/${documentId}/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(versionFormData),
        }
      );

      if (response.ok) {
        setCreateVersionDialogOpen(false);
        setVersionFormData({ body_content: "", change_description: "" });
        fetchDocumentData();
      } else {
        alert("Failed to create version");
      }
    } catch (error) {
      console.error("Error creating version:", error);
      alert("Error creating version");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishVersion = async (versionId: string) => {
    if (!confirm("Are you sure you want to publish this version? This will archive the current published version.")) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/documents/${documentId}/versions/${versionId}/publish`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchDocumentData();
      } else {
        alert("Failed to publish version");
      }
    } catch (error) {
      console.error("Error publishing version:", error);
      alert("Error publishing version");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (versionId: string) => {
    if (!confirm("By clicking OK, you acknowledge that you have read and understood this document.")) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/versions/${versionId}/acknowledge`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert("Document acknowledged successfully!");
        fetchDocumentData();
      } else {
        alert("Failed to acknowledge document");
      }
    } catch (error) {
      console.error("Error acknowledging document:", error);
      alert("Error acknowledging document");
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "policy":
        return "bg-blue-100 text-blue-800";
      case "procedure":
        return "bg-green-100 text-green-800";
      case "guideline":
        return "bg-yellow-100 text-yellow-800";
      case "plan":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (loading || !document) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const publishedVersion = versions.find((v) => v.status === "published");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/documents")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{document.title}</h1>
          <p className="text-muted-foreground">Document Management</p>
        </div>
        <Badge className={getCategoryColor(document.category)}>
          {document.category}
        </Badge>
      </div>

      {/* Document Information */}
      <Card>
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <p className="text-lg">{document.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge className={document.published_version_id ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                {document.published_version_id ? "Published" : "Draft"}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-lg">
                {new Date(document.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-lg">
                {new Date(document.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Published Version */}
      {publishedVersion && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Published Version (v{publishedVersion.version_number})</CardTitle>
              <CardDescription>Current active version</CardDescription>
            </div>
            {user?.role !== "admin" && (
              <Button
                size="sm"
                onClick={() => handleAcknowledge(publishedVersion.id)}
                disabled={submitting}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Acknowledge
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                  {publishedVersion.body_content}
                </pre>
              </div>
            </div>
            {publishedVersion.change_description && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">Change Description</p>
                <p className="text-sm text-gray-700">{publishedVersion.change_description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Version History</CardTitle>
            <CardDescription>
              All versions of this document ({versions.length} total)
            </CardDescription>
          </div>
          {user?.role === "admin" && (
            <Button
              size="sm"
              onClick={() => setCreateVersionDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Version
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No versions yet. Create the first version to get started.
              </p>
              {user?.role === "admin" && (
                <Button onClick={() => setCreateVersionDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Version
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Change Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">
                      v{version.version_number}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(version.status)}>
                        {version.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {version.change_description || "No description"}
                    </TableCell>
                    <TableCell>
                      {new Date(version.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedVersion(version);
                          setViewVersionDialogOpen(true);
                        }}
                      >
                        View
                      </Button>
                      {user?.role === "admin" && version.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePublishVersion(version.id)}
                          disabled={submitting}
                        >
                          Publish
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Version Dialog */}
      <Dialog open={createVersionDialogOpen} onOpenChange={setCreateVersionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Create a new draft version of this document. You can publish it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="body_content">Content</Label>
              <Textarea
                id="body_content"
                placeholder="Enter document content..."
                value={versionFormData.body_content}
                onChange={(e) =>
                  setVersionFormData({
                    ...versionFormData,
                    body_content: e.target.value,
                  })
                }
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="change_description">Change Description</Label>
              <Input
                id="change_description"
                placeholder="What changed in this version?"
                value={versionFormData.change_description}
                onChange={(e) =>
                  setVersionFormData({
                    ...versionFormData,
                    change_description: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateVersionDialogOpen(false);
                setVersionFormData({ body_content: "", change_description: "" });
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateVersion} disabled={submitting}>
              {submitting ? "Creating..." : "Create Draft Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Version Dialog */}
      <Dialog open={viewVersionDialogOpen} onOpenChange={setViewVersionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Version {selectedVersion?.version_number} - {selectedVersion?.status}
            </DialogTitle>
            <DialogDescription>
              Created on {selectedVersion && new Date(selectedVersion.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedVersion?.change_description && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground">Change Description</p>
                <p className="text-sm text-gray-700">{selectedVersion.change_description}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                {selectedVersion?.body_content}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewVersionDialogOpen(false);
                setSelectedVersion(null);
              }}
            >
              Close
            </Button>
            {user?.role === "admin" && selectedVersion?.status === "draft" && (
              <Button
                onClick={() => {
                  setViewVersionDialogOpen(false);
                  handlePublishVersion(selectedVersion.id);
                }}
                disabled={submitting}
              >
                Publish This Version
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
