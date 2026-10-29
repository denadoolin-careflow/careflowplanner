import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CornerShell } from "@/components/corner/CornerShell";
import { ClubSignup } from "@/components/corner/ClubSignup";
import { formatPrice, listVisibleProducts, type Product } from "@/lib/corner";

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link to={`/shop/${p.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md">
      {p.cover_url ? <img src={p.cover_url} alt="" className="aspect-square w-full object-cover" loading="lazy" /> : <div className="flex aspect-square items-center justify-center bg-secondary"><ShoppingBag className="h-10 w-10 text-muted-foreground" aria-hidden /></div>}
      <div className="p-4">
        <h3 className="font-display text-lg text-foreground group-hover:text-primary">{p.title}</h3>
        <p className="mt-1 text-sm font-semibold text-foreground/80">{p.status === "coming_soon" ? "Coming soon" : formatPrice(p.price_cents, p.currency)}</p>
      </div>
    </Link>
  );
}

function BuyBox({ p }: { p: Product }) {
  if (p.status === "published" && p.checkout_url) {
    return <Button asChild size="lg" className="min-h-12 w-full sm:w-auto"><a href={p.checkout_url} target="_blank" rel="noreferrer">Buy now · {formatPrice(p.price_cents, p.currency)}</a></Button>;
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">Coming soon</p>
      <p className="mb-3 text-sm text-muted-foreground">Join the CareFlow Club to hear the moment it's ready.</p>
      <ClubSignup source={`shop:${p.slug}`} cta="Notify me" thanks="You're on the list!" />
    </div>
  );
}

export default function Shop() {
  const { slug } = useParams();
  const [items, setItems] = useState<Product[] | null>(null);
  useEffect(() => { listVisibleProducts().then(setItems); document.title = "The CareFlow Shop"; }, []);
  const product = slug ? items?.find((i) => i.slug === slug) : undefined;

  if (slug) {
    return (
      <CornerShell>
        <Link to="/shop" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Shop</Link>
        {items === null ? <p className="text-sm text-muted-foreground">Loading…</p> : !product ? <p className="text-muted-foreground">This product isn't available.</p> : (
          <div className="mt-4 grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              {product.cover_url && <img src={product.cover_url} alt="" className="w-full rounded-2xl object-cover" />}
              <div className="grid grid-cols-4 gap-2">{product.images.map((src) => <img key={src} src={src} alt="" className="aspect-square rounded-lg object-cover" />)}</div>
            </div>
            <div>
              <h1 className="font-display text-4xl text-foreground">{product.title}</h1>
              <div className="prose prose-neutral mt-4 max-w-none text-foreground dark:prose-invert"><ReactMarkdown>{product.description}</ReactMarkdown></div>
              <div className="mt-6"><BuyBox p={product} /></div>
            </div>
          </div>
        )}
      </CornerShell>
    );
  }

  return (
    <CornerShell>
      <h1 className="font-display text-4xl text-foreground">The CareFlow Shop</h1>
      <p className="mt-2 text-muted-foreground">Digital planners & printables to plan, grow, care and let go.</p>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {items?.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Products are coming soon.</p>}
        {items?.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </CornerShell>
  );
}
