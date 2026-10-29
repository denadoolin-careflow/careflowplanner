import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CornerShell } from "@/components/corner/CornerShell";
import { ClubSignup } from "@/components/corner/ClubSignup";
import { listPublishedPosts, readingMinutes, type BlogPost } from "@/lib/corner";

export function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link to={`/corner/${post.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md">
      {post.cover_url
        ? <img src={post.cover_url} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
        : <div className="aspect-[16/10] w-full bg-secondary" aria-hidden />}
      <div className="flex flex-1 flex-col p-4">
        <div className="text-xs text-muted-foreground">
          {post.published_at ? format(new Date(post.published_at), "MMM d, yyyy") : "Draft"} · {readingMinutes(post.body)} min read
        </div>
        <h3 className="mt-1 font-display text-xl text-foreground group-hover:text-primary">{post.title}</h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>}
      </div>
    </Link>
  );
}

export default function Corner() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  useEffect(() => { listPublishedPosts().then(setPosts); document.title = "The CareFlow Corner"; }, []);
  return (
    <CornerShell>
      <h1 className="font-display text-4xl text-foreground">The CareFlow Corner</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Gentle ideas for planning, caring and living in rhythm.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {posts?.length === 0 && <p className="text-sm text-muted-foreground">New posts are coming soon.</p>}
        {posts?.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
      <section className="mt-14 rounded-3xl bg-secondary/60 p-6 text-center">
        <h2 className="font-display text-3xl text-foreground">Join the CareFlow Club</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Seasonal guides, free printables and first looks at new tools.</p>
        <ClubSignup source="corner" className="mx-auto mt-5 max-w-xl" />
      </section>
    </CornerShell>
  );
}
