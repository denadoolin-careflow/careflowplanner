import { useEffect, useRef, useState, type ReactElement, type MouseEvent } from "react";
import { NavLink, useLocation } from "react-router-dom";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { NAV_GROUPS, NAV_SUBPAGES } from "@/lib/nav";
import { cn } from "@/lib/utils";

type FlowGroup = typeof NAV_GROUPS[number];

/** A portalled flyout keeps the page tree reachable outside the scrolling sidebar. */
export function FlowNavigationHover({ group, side, children, onNavigate }: {
  group: FlowGroup;
  side: "left" | "right";
  children: ReactElement;
  onNavigate: (to: string) => (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const cancelClose = () => { clearTimeout(closeTimer.current); };
  const closeAfterFocusLeaves = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const nestedRoutes = new Set(group.items.flatMap(item => (NAV_SUBPAGES[item.to] ?? []).map(page => page.to)));
  const roots = group.items.filter(item => !nestedRoutes.has(item.to));
  const linkClass = ({ isActive }: { isActive: boolean }) => cn(
    "flex min-h-10 items-center gap-2 rounded-md px-2 py-2 text-sm text-popover-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isActive && "bg-primary-soft font-semibold text-foreground",
  );
  const navigate = (to: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    onNavigate(to)(event);
    setOpen(false);
  };

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={160} closeDelay={250}>
      <HoverCardTrigger asChild onFocus={() => { cancelClose(); setOpen(true); }} onBlur={closeAfterFocusLeaves}
        onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}
        aria-label={group.label} aria-expanded={open}>
        {children}
      </HoverCardTrigger>
      <HoverCardPrimitive.Portal>
        <HoverCardContent side={side} align="start" sideOffset={8} collisionPadding={12}
          className="w-72 max-w-[calc(100vw-24px)] p-3"
          onFocusCapture={cancelClose} onBlurCapture={closeAfterFocusLeaves}
          onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
          <nav aria-label={`${group.label} page tree`} className="max-h-[min(70vh,640px)] overflow-y-auto overscroll-contain">
            <NavLink to={`/flow/${group.id}`} end onClick={navigate(`/flow/${group.id}`)}
              className="mb-2 block rounded-md px-2 py-2 font-display text-lg text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {group.label}
            </NavLink>
            <ul className="ml-2 space-y-1 border-l border-border pl-3">
              {roots.map(item => {
                const Icon = item.icon;
                const pages = NAV_SUBPAGES[item.to] ?? [];
                return (
                  <li key={item.to}>
                    <NavLink to={item.to} end onClick={navigate(item.to)} className={linkClass}>
                      <Icon aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{item.label}</span>
                    </NavLink>
                    {pages.length > 0 && <ul aria-label={`${item.label} subpages`} className="ml-4 space-y-0.5 border-l border-border pl-3">
                      {pages.map(page => <li key={page.to}>
                        <NavLink to={page.to} end onClick={navigate(page.to)} className={linkClass}>{page.label}</NavLink>
                      </li>)}
                    </ul>}
                  </li>
                );
              })}
            </ul>
          </nav>
        </HoverCardContent>
      </HoverCardPrimitive.Portal>
    </HoverCard>
  );
}