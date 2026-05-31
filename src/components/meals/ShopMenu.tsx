import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShoppingCart, ChevronDown, ExternalLink } from "lucide-react";
import { RETAILERS, RETAILER_LABEL, retailerSearchUrl, type Retailer } from "@/lib/retailer-links";
import { useGroceryPrefs } from "@/lib/grocery-prefs";
import { cn } from "@/lib/utils";

interface ShopMenuProps {
  /** Single ingredient or list of items to search for. */
  items: string | string[];
  /** Optional override for the preferred store. */
  preferred?: Retailer;
  size?: "sm" | "xs" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  /** Hide the chevron + "More stores" submenu (renders a single button). */
  compact?: boolean;
}

export function ShopMenu({
  items, preferred, size = "sm", variant = "outline", className, compact,
}: ShopMenuProps) {
  const { prefs } = useGroceryPrefs();
  const primary = preferred ?? prefs.preferred_store;
  const arr = Array.isArray(items) ? items : [items];
  const hrefFor = (r: Retailer) => retailerSearchUrl(r, arr);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  if (compact) {
    return (
      <Button
        asChild
        size={size === "icon" ? "icon" : "sm"}
        variant={variant}
        className={cn("rounded-full", size === "xs" && "h-7 px-2 text-xs", className)}
      >
        <a
          href={hrefFor(primary)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          title={`Shop on ${RETAILER_LABEL[primary]}`}
        >
          <ShoppingCart className={cn(size === "icon" ? "h-4 w-4" : "mr-1 h-3.5 w-3.5")} />
          {size !== "icon" && <span>{RETAILER_LABEL[primary]}</span>}
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={stop}>
        <Button
          size={size === "icon" ? "icon" : "sm"}
          variant={variant}
          className={cn("rounded-full", size === "xs" && "h-7 px-2 text-xs", className)}
        >
          <ShoppingCart className={cn(size === "icon" ? "h-4 w-4" : "mr-1 h-3.5 w-3.5")} />
          {size !== "icon" && <>Shop<ChevronDown className="ml-1 h-3 w-3 opacity-60" /></>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Preferred
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a
            href={hrefFor(primary)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            title={`Shop on ${RETAILER_LABEL[primary]}`}
            className="flex w-full cursor-pointer items-center"
          >
            <ShoppingCart className="mr-2 h-3.5 w-3.5" />{RETAILER_LABEL[primary]}
            <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          More stores
        </DropdownMenuLabel>
        {RETAILERS.filter(r => r !== primary).map(r => (
          <DropdownMenuItem key={r} asChild>
            <a
              href={hrefFor(r)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              title={`Shop on ${RETAILER_LABEL[r]}`}
              className="flex w-full cursor-pointer items-center"
            >
              {RETAILER_LABEL[r]}
              <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}