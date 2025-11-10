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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  owner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MappedControl {
  id: string;
  name: string;
  status: string;
  next_review_due_date?: string;
}

interface ActivatedControl {
  id: string;
  control_library_id: string;
  name: string;
  description: string;
  status: string;
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [mappedControls, setMappedControls] = useState<MappedControl[]>([]);
  const [availableControls, setAvailableControls] = useState<ActivatedControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedControlId, setSelectedControlId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token && assetId) {
      fetchAssetData();
      fetchMappedControls();
      fetchAvailableControls();
    }
  }, [token, assetId]);

  const fetchAssetData = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/assets/${assetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAsset(data);
      } else {
        console.error("Failed to fetch asset");
      }
    } catch (error) {
      console.error("Error fetching asset:", error);
    }
  };

  const fetchMappedControls = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/assets/${assetId}/controls`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMappedControls(data);
      } else {
        console.error("Failed to fetch mapped controls");
      }
    } catch (error) {
      console.error("Error fetching mapped controls:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableControls = async () => {
    try {
      const response = await fetch(
        "http://localhost:8080/api/v1/controls/activated",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableControls(data);
      } else {
        console.error("Failed to fetch available controls");
      }
    } catch (error) {
      console.error("Error fetching available controls:", error);
    }
  };

  const handleAddMapping = async () => {
    if (!selectedControlId) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        "http://localhost:8080/api/v1/mappings/asset-to-control",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            asset_id: assetId,
            activated_control_id: selectedControlId,
          }),
        }
      );

      if (response.ok) {
        setAddDialogOpen(false);
        setSelectedControlId("");
        fetchMappedControls();
      } else {
        console.error("Failed to add mapping");
      }
    } catch (error) {
      console.error("Error adding mapping:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMapping = async (controlId: string) => {
    if (!confirm("Are you sure you want to remove this control mapping?")) {
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8080/api/v1/mappings/asset-to-control",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            asset_id: assetId,
            activated_control_id: controlId,
          }),
        }
      );

      if (response.ok) {
        fetchMappedControls();
      } else {
        console.error("Failed to delete mapping");
      }
    } catch (error) {
      console.error("Error deleting mapping:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "compliant":
        return "bg-green-100 text-green-800";
      case "non_compliant":
        return "bg-red-100 text-red-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (loading || !asset) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Filter out already mapped controls from available controls
  const unmappedControls = availableControls.filter(
    (ctrl) => !mappedControls.some((mapped) => mapped.id === ctrl.id)
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/assets")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{asset.name}</h1>
          <p className="text-muted-foreground">Asset Details</p>
        </div>
        <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
      </div>

      {/* Asset Information */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Asset Type
              </p>
              <p className="text-lg">{asset.asset_type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <Badge className={getStatusColor(asset.status)}>
                {asset.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Created
              </p>
              <p className="text-lg">
                {new Date(asset.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Last Updated
              </p>
              <p className="text-lg">
                {new Date(asset.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Controls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Linked Controls</CardTitle>
            <CardDescription>
              Controls associated with this asset
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            disabled={unmappedControls.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Control
          </Button>
        </CardHeader>
        <CardContent>
          {mappedControls.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No controls linked to this asset yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Review Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedControls.map((control) => (
                  <TableRow key={control.id}>
                    <TableCell className="font-medium">
                      {control.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(control.status)}>
                        {control.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {control.next_review_due_date
                        ? new Date(
                            control.next_review_due_date
                          ).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMapping(control.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Control Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Control to Asset</DialogTitle>
            <DialogDescription>
              Select a control to link with this asset
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={selectedControlId}
              onValueChange={setSelectedControlId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a control" />
              </SelectTrigger>
              <SelectContent>
                {unmappedControls.map((control) => (
                  <SelectItem key={control.id} value={control.id}>
                    {control.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setSelectedControlId("");
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMapping}
              disabled={!selectedControlId || submitting}
            >
              {submitting ? "Adding..." : "Add Control"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
