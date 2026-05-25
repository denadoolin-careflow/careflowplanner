import { useEffect, useMemo, useState } from "react";
import { Music, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const URL_KEY = "careflow:focus:music:url";

type Provider = "spotify" | "youtube" | null;

function detect(url: string): { provider: Provider; embed: string | null } {
  if (!url) return { provider: null, embed: null };
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    // Spotify: open.spotify.com/{type}/{id}
    if (host === "open.spotify.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      // handle locale prefix e.g. /intl-en/playlist/...
      const i = parts.findIndex(p => ["playlist", "album", "track", "episode", "show", "artist"].includes(p));
      if (i >= 0 && parts[i + 1]) {
        return {
          provider: "spotify",
          embed: `https://open.spotify.com/embed/${parts[i]}/${parts[i + 1]}?utm_source=careflow`,
        };
      }
    }
    // YouTube
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { provider: "youtube", embed: `https://www.youtube.com/embed/${id}` };
    }
    if (host.endsWith("youtube.com")) {
      const list = u.searchParams.get("list");
      const v = u.searchParams.get("v");
      if (list) return { provider: "youtube", embed: `https://www.youtube.com/embed/videoseries?list=${list}` };
      if (v) return { provider: "youtube", embed: `https://www.youtube.com/embed/${v}` };
    }
  } catch { /* noop */ }
  return { provider: null, embed: null };
}

/** Music embed (Spotify / YouTube). Auto-plays when `autoplay` becomes true. */
export function MusicEmbed({ autoplay }: { autoplay: boolean }) {
  const [url, setUrl] = useState<string>(() => {
    if (typeof localStorage === "undefined") return "";
    return localStorage.getItem(URL_KEY) ?? "";
  });
  const [input, setInput] = useState(url);
  const [editing, setEditing] = useState(!url);

  useEffect(() => {
    try { localStorage.setItem(URL_KEY, url); } catch { /* noop */ }
  }, [url]);

  const { provider, embed } = useMemo(() => detect(url), [url]);

  // Add autoplay param when focus is running.
  const src = useMemo(() => {
    if (!embed) return null;
    if (!autoplay) return embed;
    if (provider === "youtube") {
      const sep = embed.includes("?") ? "&" : "?";
      return `${embed}${sep}autoplay=1`;
    }
    // Spotify embeds expose autoplay via hash on supported plans.
    return `${embed}#autoplay=1`;
  }, [embed, autoplay, provider]);

  return (
    <div className="mt-3 rounded-2xl border border-border/50 bg-background/40 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Music className="h-3 w-3" /> Music
          {provider && (
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-px text-[9px] uppercase tracking-wider text-primary">
              {provider}
            </span>
          )}
        </div>
        {url && (
          <button
            type="button"
            onClick={() => { setEditing(e => !e); setInput(url); }}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted/50"
            aria-label="Change music link"
          >
            <Link2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {editing && (
        <form
          className="mb-2 flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            setUrl(input.trim());
            setEditing(false);
          }}
        >
          <input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste Spotify or YouTube link…"
            className="min-w-0 flex-1 rounded-md border border-border/60 bg-background/60 px-2 py-1 text-[11px] outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save
          </button>
          {url && (
            <button
              type="button"
              onClick={() => { setUrl(""); setInput(""); }}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted/50"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </form>
      )}

      {src ? (
        <div className={cn("overflow-hidden rounded-xl border border-border/40 bg-black/20")}>
          <iframe
            key={src}
            src={src}
            title={`${provider ?? "music"} player`}
            loading="lazy"
            allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
            allowFullScreen
            className="block w-full"
            style={{ height: provider === "youtube" ? 180 : 152, border: 0 }}
          />
        </div>
      ) : (
        !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full rounded-xl border border-dashed border-border/60 bg-muted/20 px-2 py-3 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            Connect Spotify or YouTube
          </button>
        )
      )}

      {src && (
        <p className="mt-1.5 text-center text-[9px] uppercase tracking-wider text-muted-foreground">
          {autoplay ? "Auto-plays with focus" : "Plays on start"}
        </p>
      )}
    </div>
  );
}