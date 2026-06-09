import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useHousehold, createHousehold, renameHousehold, createInvite, cancelInvite, listInvites, removeMember, updateMember, inviteUrl, type HouseholdInvite, type HouseholdMember } from "@/lib/household";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Trash2, UserPlus, Users, ShieldCheck, Eye, Pencil } from "lucide-react";

export default function FamilySettings() {
  const { user } = useStore();
  const { households, current, currentId, members, switchHousehold, refresh } = useHousehold(user?.id);
  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (currentId) listInvites(currentId).then(setInvites);
    else setInvites([]);
  }, [currentId]);

  const reloadInvites = async () => {
    if (currentId) setInvites(await listInvites(currentId));
  };

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    setBusy(true);
    try {
      const h = await createHousehold(newName.trim(), user.id);
      if (h) {
        toast.success("Household created");
        setNewName("");
        await refresh();
        await switchHousehold(h.id);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create household");
    } finally { setBusy(false); }
  };

  const handleInvite = async () => {
    if (!user || !currentId || !inviteEmail.trim()) return;
    setBusy(true);
    try {
      const inv = await createInvite(currentId, inviteEmail, inviteRole, user.id);
      if (inv) {
        await navigator.clipboard.writeText(inviteUrl(inv.token)).catch(() => {});
        toast.success("Invite link copied to clipboard");
        setInviteEmail("");
        await reloadInvites();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create invite");
    } finally { setBusy(false); }
  };

  const owner = members.find(m => m.user_id === user?.id)?.role === "owner";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Family & sharing</h1>
        <p className="text-sm text-muted-foreground">Create a household, invite family members, and share meal planning, grocery lists, and the calendar.</p>
      </header>

      <SectionCard title="Your households" accent="sage">
        <div className="space-y-2">
          {households.length === 0 && <p className="text-sm text-muted-foreground">You don't have any households yet.</p>}
          {households.map(h => (
            <button
              key={h.id}
              onClick={() => switchHousehold(h.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${h.id === currentId ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{h.name}</span>
              </div>
              {h.id === currentId && <Badge variant="secondary">Active</Badge>}
            </button>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <Input placeholder="New household name" value={newName} onChange={e => setNewName(e.target.value)} />
            <Button onClick={handleCreate} disabled={busy || !newName.trim()}>Create</Button>
          </div>
        </div>
      </SectionCard>

      {current && (
        <SectionCard
          title={current.name}
          subtitle={owner ? "You are the owner — invite members below" : "You are a member"}
          accent="warm"
        >
          <div className="space-y-4">
            {owner && (
              <div>
                <Label className="text-xs">Rename household</Label>
                <div className="flex items-center gap-2">
                  <Input
                    defaultValue={current.name}
                    onBlur={async (e) => {
                      const v = e.target.value.trim();
                      if (v && v !== current.name) {
                        await renameHousehold(current.id, v);
                        await refresh();
                        toast.success("Renamed");
                      }
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Members ({members.length})</Label>
              <div className="mt-1 space-y-1">
                {members.map(m => (
                  <MemberRow key={m.id} member={m} ownerView={owner} selfId={user?.id} onChanged={refresh} />
                ))}
              </div>
            </div>

            {owner && (
              <div className="rounded-xl border border-border/60 p-3 space-y-2">
                <Label className="text-xs flex items-center gap-1"><UserPlus className="h-3 w-3" /> Invite family member by email</Label>
                <div className="flex items-center gap-2">
                  <Input type="email" placeholder="name@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                  <Select value={inviteRole} onValueChange={v => setInviteRole(v as any)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor" icon={<Pencil className="h-4 w-4 text-muted-foreground" />}>Editor</SelectItem>
                      <SelectItem value="viewer" icon={<Eye className="h-4 w-4 text-muted-foreground" />}>Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleInvite} disabled={busy || !inviteEmail.trim()}>Invite</Button>
                </div>
                <p className="text-xs text-muted-foreground">An invite link will be copied to your clipboard. Send it to them in any messenger; they sign in and join automatically.</p>
              </div>
            )}

            {invites.length > 0 && (
              <div>
                <Label className="text-xs">Pending invites</Label>
                <div className="mt-1 space-y-1">
                  {invites.filter(i => !i.accepted_at).map(i => (
                    <div key={i.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{i.email}</div>
                        <div className="truncate text-xs text-muted-foreground">{inviteUrl(i.token)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(inviteUrl(i.token)); toast.success("Link copied"); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        {owner && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await cancelInvite(i.id); await reloadInvites(); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function MemberRow({ member, ownerView, selfId, onChanged }: { member: HouseholdMember; ownerView: boolean; selfId?: string; onChanged: () => void }) {
  const self = member.user_id === selfId;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-7 w-7 rounded-full grid place-items-center text-xs font-medium" style={{ background: member.color ?? "hsl(var(--muted))" }}>
          {(member.display_name ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{member.display_name ?? "Member"}{self ? " (you)" : ""}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {ownerView && !self ? (
          <Select value={member.role} onValueChange={async (v) => { await updateMember(member.id, { role: v as any }); onChanged(); }}>
            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="owner" icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}>Owner</SelectItem>
              <SelectItem value="editor" icon={<Pencil className="h-4 w-4 text-muted-foreground" />}>Editor</SelectItem>
              <SelectItem value="viewer" icon={<Eye className="h-4 w-4 text-muted-foreground" />}>Viewer</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
        )}
        {ownerView && !self && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await removeMember(member.id); onChanged(); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}