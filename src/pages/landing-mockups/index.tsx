import { useSearchParams } from "react-router-dom";
import MockupA from "./MockupA";
import MockupB from "./MockupB";
import MockupC from "./MockupC";

const OPTIONS = [
  { id: "a", label: "A · Calm Lifestyle", C: MockupA },
  { id: "b", label: "B · Seasonal Journey", C: MockupB },
  { id: "c", label: "C · Bento Dashboard", C: MockupC },
];

export default function LandingMockups() {
  const [params, setParams] = useSearchParams();
  const cur = OPTIONS.find((o) => o.id === params.get("v")) ?? OPTIONS[0];
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 flex justify-center gap-1 border-b border-border bg-card/90 p-2 backdrop-blur">
        {OPTIONS.map((o) => (
          <button key={o.id} onClick={() => { setParams({ v: o.id }); window.scrollTo(0, 0); }}
            className={`min-h-10 rounded-full px-3 text-xs font-semibold sm:text-sm ${o.id === cur.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
            {o.label}
          </button>
        ))}
      </div>
      <cur.C key={cur.id} />
    </div>
  );
}
