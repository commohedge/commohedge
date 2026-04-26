import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Shield, UserPlus } from "lucide-react";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  role: string;
  name: string;
  banned_until: string | null;
};

const ROLE_OPTIONS = ["Admin", "Risk Manager", "Trader", "Viewer", "Member"] as const;

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function UserManagement() {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AdminUser[]>([]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<(typeof ROLE_OPTIONS)[number]>("Member");
  const [inviteBusy, setInviteBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<string>("Member");
  const [editBusy, setEditBusy] = useState(false);

  const isAdmin = useMemo(() => {
    const email = (user?.email || "").toLowerCase();
    return user?.role === "Admin" || email === "bilalfaress00@gmail.com" || email === "commohedge@gmail.com";
  }, [user?.email, user?.role]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "list" } });
      if (error) throw error;
      const users = (data?.users || []) as AdminUser[];
      setRows(users);
    } catch (e: any) {
      toast({
        title: "Unable to load users",
        description: e?.message || "Admin endpoint error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers();
  }, [isAdmin, loadUsers]);

  const onOpenEdit = (u: AdminUser) => {
    setEditUser(u);
    setEditRole(u.role || "Member");
    setEditOpen(true);
  };

  const onSaveRole = async () => {
    if (!editUser) return;
    setEditBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_role", userId: editUser.id, role: editRole },
      });
      if (error) throw error;

      setRows((prev) => prev.map((r) => (r.id === editUser.id ? { ...r, role: editRole } : r)));
      setEditOpen(false);
      setEditUser(null);
      toast({ title: "Role updated", description: data?.user?.id ? "Saved successfully." : "Saved." });
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message || "Admin endpoint error", variant: "destructive" });
    } finally {
      setEditBusy(false);
    }
  };

  const onInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteBusy(true);
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: "invite", email, role: inviteRole },
      });
      if (error) throw error;
      toast({ title: "Invitation sent", description: "Supabase invited the user by email." });
      setInviteOpen(false);
      setInviteEmail("");
      void loadUsers();
    } catch (e: any) {
      toast({ title: "Invite failed", description: e?.message || "Admin endpoint error", variant: "destructive" });
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <Layout
      title="User Management"
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "User Management" }]}
    >
      {!isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin only
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your account does not have admin privileges. Ask an admin to grant you the <span className="font-medium">Admin</span> role.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              Manage access for your team. Roles are stored in Supabase user metadata.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>

              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite user
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite user</DialogTitle>
                    <DialogDescription>Send a Supabase invite email to grant access.</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        placeholder="name@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Role</Label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviteBusy}>
                      Cancel
                    </Button>
                    <Button onClick={onInvite} disabled={inviteBusy || !inviteEmail.trim()}>
                      {inviteBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Send invite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Team members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last sign-in</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.email || "—"}</TableCell>
                        <TableCell>{r.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={r.role === "Admin" ? "default" : "secondary"}>{r.role || "Member"}</Badge>
                        </TableCell>
                        <TableCell>{fmtDate(r.created_at)}</TableCell>
                        <TableCell>{fmtDate(r.last_sign_in_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => onOpenEdit(r)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loading && rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit user</DialogTitle>
                <DialogDescription>Update the role stored in Supabase user metadata.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-1">
                  <div className="text-sm font-medium">{editUser?.email || "—"}</div>
                  <div className="text-xs text-muted-foreground">{editUser?.id || ""}</div>
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editBusy}>
                  Cancel
                </Button>
                <Button onClick={onSaveRole} disabled={editBusy || !editUser}>
                  {editBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </Layout>
  );
}