"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Vendor {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  risk_tier: string;
  status: string;
  contact_name?: string | null;
  contact_email?: string | null;
}

interface Assessment {
  id: string;
  assessment_date: string;
  overall_risk_score?: number | null;
  status: string;
  findings?: string | null;
}

interface Control {
  activated_control_id: string;
  control_name: string;
  status: string;
}

export default function VendorDetailPage() {
  const params = useParams();
  const { token } = useAuthStore();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    contact_name: "",
    contact_email: "",
  });
  const [form, setForm] = useState({
    overall_risk_score: 0,
    data_security_score: 0,
    compliance_score: 0,
    financial_stability_score: 0,
    operational_capability_score: 0,
    findings: "",
  });

  useEffect(() => {
    if (token && params.id) {
      fetchData();
    }
  }, [token, params.id]);

  const fetchData = async () => {
    const id = params.id as string;
    try {
      const [vRes, aRes, cRes] = await Promise.all([
        fetch(`http://localhost:8080/api/v1/vendors/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:8080/api/v1/vendors/${id}/assessments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:8080/api/v1/vendors/${id}/controls`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (vRes.ok) setVendor(await vRes.json());
      if (aRes.ok) setAssessments(await aRes.json());
      if (cRes.ok) setControls(await cRes.json());
    } catch {}
  };

  const createAssessment = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/vendors/${params.id}/assessments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendor_id: params.id, ...form }),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchData();
      }
    } catch {}
  };

  const updateVendor = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/vendors/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditMode(false);
        fetchData();
      }
    } catch {}
  };

  const startEdit = () => {
    setEditForm({
      contact_name: vendor?.contact_name || "",
      contact_email: vendor?.contact_email || "",
    });
    setEditMode(true);
  };

  if (!vendor) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{vendor.name}</h1>
        <p className="text-gray-600">{vendor.category}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Vendor Information</CardTitle>
              {!editMode && (
                <Button size="sm" variant="outline" onClick={startEdit}>
                  Edit Contact
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><strong>Status:</strong> {vendor.status}</div>
            <div><strong>Risk Tier:</strong> {vendor.risk_tier}</div>
            {editMode ? (
              <>
                <div>
                  <Label>Contact Name</Label>
                  <Input 
                    value={editForm.contact_name} 
                    onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input 
                    type="email"
                    value={editForm.contact_email} 
                    onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                    placeholder="contact@email.com"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={updateVendor}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                </div>
              </>
            ) : (
              <>
                <div><strong>Contact:</strong> {vendor.contact_name || "N/A"}</div>
                <div><strong>Email:</strong> {vendor.contact_email || "N/A"}</div>
              </>
            )}
            {vendor.description && <div><strong>Description:</strong> {vendor.description}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Assessments:</strong> {assessments.length}</div>
            <div><strong>Linked Controls:</strong> {controls.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Risk Assessments</CardTitle>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              New Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <div className="text-gray-600">No assessments yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.assessment_date).toLocaleDateString()}</TableCell>
                    <TableCell>{a.overall_risk_score || "N/A"}</TableCell>
                    <TableCell>
                      <Badge>{a.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked Controls</CardTitle>
        </CardHeader>
        <CardContent>
          {controls.length === 0 ? (
            <div className="text-gray-600">No controls linked</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controls.map((c) => (
                  <TableRow key={c.activated_control_id}>
                    <TableCell>{c.control_name}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "compliant" ? "default" : "destructive"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Risk Assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Overall Risk Score (1-25)</Label>
              <Input type="number" min="1" max="25" value={form.overall_risk_score} 
                onChange={(e) => setForm({ ...form, overall_risk_score: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Security (1-5)</Label>
                <Input type="number" min="1" max="5" value={form.data_security_score} 
                  onChange={(e) => setForm({ ...form, data_security_score: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Compliance (1-5)</Label>
                <Input type="number" min="1" max="5" value={form.compliance_score} 
                  onChange={(e) => setForm({ ...form, compliance_score: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Financial Stability (1-5)</Label>
                <Input type="number" min="1" max="5" value={form.financial_stability_score} 
                  onChange={(e) => setForm({ ...form, financial_stability_score: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Operational Capability (1-5)</Label>
                <Input type="number" min="1" max="5" value={form.operational_capability_score} 
                  onChange={(e) => setForm({ ...form, operational_capability_score: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Findings</Label>
              <Textarea value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createAssessment}>Create Assessment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
