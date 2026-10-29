import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CornerShell } from "@/components/corner/CornerShell";
import { ClubSignup } from "@/components/corner/ClubSignup";
import { readingMinutes, useIsAdmin, type BlogPost } from "@/lib/corner";

export default function CornerPost() {
  const { slug } = useParams();
  const { isAdmin } = useIsAdmin();
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", excerpt: "", body: "" });

  useEffect(() => {
    supabase.from("blog_posts").select("*").eq("slug", slug ?? "").maybeSingle().then(({ data }) => {
      setPost((data as BlogPost) ?? null);
      if (data) document.title = `${data.title} · CareFlow Corner`;
    });
  }, [slug]);

  if (post === undefined) return <CornerShell><p className="text-sm text-muted-foreground">Loading…</p></CornerShell>;
  if (post === null) return <CornerShell><p className="text-muted-foreground">This post isn't available.</p><Link to="/corner" className="text-primary underline">Back to the Corner</Link></CornerShell>;

  const startEdit = () => { setDraft({ title: post.title, excerpt: post.excerpt, body: post.body }); setEditing(true); };
  const saveEdit = async () => {
    const { data, error } = await supabase.from("blog_posts").update(draft).eq("id", post.id).select().single();
    if (error) { toast.error(error.message); return; }
    setPost(data as BlogPost); setEditing(false); toast.success("Post updated");
  };

  return (
    <CornerShell>
      <article className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-2">
          <Link to="/corner" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> The Corner</Link>
          {isAdmin && !editing && <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="mr-1 h-4 w-4" /> Edit</Button>}
          {editing && <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="mr-1 h-4 w-4" />Cancel</Button><Button size="sm" onClick={saveEdit}><Save className="mr-1 h-4 w-4" />Save</Button></div>}
        </div>
        {post.status !== "published" && <p className="mt-2 rounded-lg bg-accent/30 px-3 py-2 text-sm">Draft — only admins can see this.</p>}
        {post.cover_url && <img src={post.cover_url} alt="" className="mt-4 aspect-[16/9] w-full rounded-2xl object-cover" />}
        {editing ? (
          <div className="mt-5 space-y-3">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="font-display text-2xl" aria-label="Title" />
            <Textarea value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} rows={2} aria-label="Excerpt" />
            <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={18} aria-label="Post body" className="font-mono text-sm" />
          </div>
        ) : (
          <>
            <h1 className="mt-5 font-display text-4xl leading-tight text-foreground">{post.title}</h1>
            <div className="mt-2 text-sm text-muted-foreground">
              {post.published_at ? format(new Date(post.published_at), "MMMM d, yyyy") : "Unpublished"} · {readingMinutes(post.body)} min read
            </div>
            <div className="prose prose-neutral mt-6 max-w-none text-foreground dark:prose-invert prose-headings:font-display prose-a:text-primary">
              <ReactMarkdown>{post.body}</ReactMarkdown>
            </div>
          </>
        )}
        <section className="mt-12 rounded-3xl bg-secondary/60 p-6 text-center">
          <h2 className="font-display text-2xl text-foreground">Join the CareFlow Club</h2>
          <p className="mt-1 text-sm text-muted-foreground">Seasonal guides and free printables, straight to your inbox.</p>
          <ClubSignup source={`post:${post.slug}`} className="mt-4" />
        </section>
      </article>
    </CornerShell>
  );
}
