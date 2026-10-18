import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Download, Loader2, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NatalWheel } from "@/components/cosmic/NatalWheel";
import { chartImage, saveChartImage } from "@/lib/cosmic/chart-image";
import { toast } from "sonner";

type Props = ComponentProps<typeof NatalWheel> & { updatedAt: Date };

export function InteractiveNatalWheel({ updatedAt, ...props }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [image, setImage] = useState<Blob | null>(null);
  const [imageError, setImageError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setImage(null);
    setImageError(false);
    const svg = svgRef.current;
    if (!svg) return;
    chartImage(svg).then(blob => {
      if (!cancelled) setImage(blob);
    }).catch(() => {
      if (!cancelled) setImageError(true);
    });
    return () => { cancelled = true; };
  }, [props.chart, props.transitPlanets, props.highlightHouse, retry]);

  return (
    <div>
      <TransformWrapper minScale={1} maxScale={4} initialScale={1} centerOnInit
        wheel={{ step: 0.08 }} doubleClick={{ disabled: true }}
        onTransformed={(_, state) => setScale(state.scale)}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="mb-2 flex items-center justify-center gap-1">
              {[
                { label: "Zoom out", icon: ZoomOut, action: () => zoomOut(), disabled: scale <= 1.001 },
                { label: "Zoom in", icon: ZoomIn, action: () => zoomIn(), disabled: scale >= 3.999 },
                { label: "Fit chart", icon: Maximize, action: () => resetTransform(), disabled: false },
              ].map(({ label, icon: Icon, action, disabled }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-11 w-11" aria-label={label} disabled={disabled} onClick={action}>
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
              <output aria-label="Chart zoom" className="w-14 text-center text-xs tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</output>
            </div>
            <div className="mx-auto aspect-square w-full max-w-[720px] overflow-hidden touch-none" aria-label="Interactive natal chart">
              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
                <NatalWheel {...props} ref={svgRef} />
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Last updated: {updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
        <Button variant="outline" size="sm" className="min-h-11 gap-1.5" disabled={!image && !imageError} onClick={() => {
          if (imageError) { setRetry(value => value + 1); return; }
          if (image) void saveChartImage(image).catch(() => toast.error("Couldn't save the picture. Please try again."));
        }}>
          {!image && !imageError ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {imageError ? "Retry image" : "Save image"}
        </Button>
      </div>
    </div>
  );
}