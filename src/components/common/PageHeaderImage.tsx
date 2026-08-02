import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderImagePicker } from "@/components/common/HeaderImagePicker";
import { useHeaderImage } from "@/lib/header-image";

/**
 * Optional banner image for a planning page. Shows a subtle "add image"
 * affordance when nothing has been chosen yet.
 */
export function PageHeaderImage({
  pageKey, title, subtitle, className,
}: {
  pageKey: string;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const header = useHeaderImage(pageKey);

  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border/40 shadow-soft",
        header.url ? "h-32 sm:h-40" : "h-16",
        !header.url && "bg-gradient-to-br from-primary-soft/50 via-card/60 to-warm-soft/50",
        className,
      )}
    >
      {header.url && (
        <>
          <img src={header.url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        </>
      )}
      <div className="relative flex h-full items-end justify-between gap-2 p-3 sm:p-4">
        <div className="min-w-0">
          {title && <h2 className="font-display text-lg font-semibold leading-tight">{title}</h2>}
          {subtitle && <p className="truncate text-[12px] text-muted-foreground">{subtitle}</p>}
        </div>
        <HeaderImagePicker
          value={header.raw}
          onChange={(v) => header.set(v)}
          trigger={
            <button
              type="button"
              aria-label="Change header image"
              className="shrink-0 rounded-full border border-border/50 bg-card/80 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </button>
          }
        />
      </div>
    </section>
  );
}