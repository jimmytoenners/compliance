"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Vendor {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  risk_tier: string;
  status: string;
}

export default function VendorsPage() {
  const { token } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "IT Services",
    risk_tier: "medium",
    status: "active",
  });

  useEffect(() => {
    if (token) {
      fetchVendors();
    }
  }, [token]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/v1/vendors", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVendors(data);
      } else {
        setVendors([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const createVendor = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/v1/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm({ name: "", description: "", category: "IT Services", risk_tier: "medium", status: "active" });
        fetchVendors();
      }
    } catch {}
  };

  const riskBadge = (tier: string) => {
    switch (tier) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge>Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-gray-600">Manage third-party vendors and their risks</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Add Vendor</Button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4">
          {loading ? (
            <div>Loading...</div>
          ) : vendors.length === 0 ? (
            <div className="text-gray-600">No vendors found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Risk Tier</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Link className="text-blue-600 hover:underline" href={`/vendors/${v.id}`}>{v.name}</Link>
                    </TableCell>
                    <TableCell>{v.category}</TableCell>
                    <TableCell>{riskBadge(v.risk_tier)}</TableCell>
                    <TableCell>{v.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
            <DialogDescription>Register a new third-party vendor</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT Services">IT Services</SelectItem>
                  <SelectItem value="Cloud Provider">Cloud Provider</SelectItem>
                  <SelectItem value="Payment Processor">Payment Processor</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risk Tier</Label>
              <Select value={form.risk_tier} onValueChange={(v) => setForm({ ...form, risk_tier: v })}>
                <SelectTrigger><SelectValue placeholder="Select risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createVendor}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
