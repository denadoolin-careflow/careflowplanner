import { Navigate } from "react-router-dom";

// The Memory Book is now unified with the main Memories feature.
// This route exists for backward compatibility and forwards to /memories.
export default function SeasonsMemoryBook() {
  return <Navigate to="/memories" replace />;
}
  const { entries, add, remove } = useMemoryBook();
  const [view, setView] = useState<"timeline" | "gallery" | "story">("timeline");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [groupType, setGroupType] = useState<MemoryGroupType>("year");
  const [groupKey, setGroupKey] = useState(String(new Date().getFullYear()));
  const [photoUrl, setPhotoUrl] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      const k = `${e.groupType}:${e.groupKey}`;
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    return map;
  }, [entries]);

  const uploadCover = async (file: File) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const path = `${u.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("memory-book").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data: signed } = await supabase.storage.from("memory-book").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signed) setPhotoUrl(signed.signedUrl);
  };

  const create = async () => {
    if (!title.trim()) return;
    await add({
      title: title.trim(), body, date, groupType, groupKey,
      coverUrl: photoUrl || null,
      media: photoUrl ? [{ kind: "photo", url: photoUrl }] : [],
    });
    setOpen(false); setTitle(""); setBody(""); setPhotoUrl("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Memory Book</h1>
          <p className="text-sm text-muted-foreground">A scrapbook of the moments worth keeping.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 rounded-full"><Plus className="h-4 w-4" /> New memory</Button>
      </div>

      <Tabs value={view} onValueChange={v => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="story">Story</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-3 mt-4">
          {entries.map(e => (
            <Card key={e.id} className="p-4 flex gap-4">
              {e.coverUrl && <img src={e.coverUrl} alt="" className="h-20 w-20 rounded-md object-cover" loading="lazy" />}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <div className="font-semibold text-sm">{e.title}</div>
                  <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="text-xs text-muted-foreground">{format(parseISO(e.date), "MMMM d, yyyy")} · {e.groupType}</div>
                {e.body && <p className="text-sm mt-1 line-clamp-3">{e.body}</p>}
              </div>
            </Card>
          ))}
          {entries.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No memories yet.</Card>}
        </TabsContent>

        <TabsContent value="gallery" className="mt-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {entries.filter(e => e.coverUrl).map(e => (
              <Card key={e.id} className="aspect-square overflow-hidden">
                <img src={e.coverUrl!} alt={e.title} className="h-full w-full object-cover" loading="lazy" />
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="story" className="space-y-6 mt-4">
          {Array.from(grouped.entries()).map(([k, es]) => (
            <section key={k}>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">{k.replace(":", " · ")}</h3>
              <div className="space-y-2">
                {es.map(e => (
                  <Card key={e.id} className="p-3">
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{format(parseISO(e.date), "MMM d, yyyy")}</div>
                    {e.body && <p className="text-sm mt-1">{e.body}</p>}
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New memory</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div>
                <Label>Group</Label>
                <Select value={groupType} onValueChange={(v: any) => setGroupType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GROUPS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Tag (e.g. summer-2026)</Label><Input value={groupKey} onChange={e => setGroupKey(e.target.value)} /></div>
            <div><Label>Story</Label><Textarea rows={4} value={body} onChange={e => setBody(e.target.value)} /></div>
            <div>
              <Label>Photo</Label>
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} className="text-xs" />
                {photoUrl && <img src={photoUrl} className="h-10 w-10 rounded object-cover" alt="" />}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={!title.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}