import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Loader2, Mic, MicOff, Square, AudioLines, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 24 * 1024 * 1024;
const extFor = (mime: string) => (mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm");
const btn = "h-8 min-w-[36px] inline-flex shrink-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition disabled:opacity-40";

/** Toolbar buttons: live dictation into the note and recorded voice memos. */
export function NoteVoiceControls({ editor }: { editor: Editor }) {
  const dictation = useVoiceDictation(() => {}, (delta) => {
    editor.chain().focus().insertContent({ type: "text", text: `${delta} ` }).run();
  });
  const rec = useAudioRecorder();
  const [uploading, setUploading] = useState(false);
  const recording = rec.state !== "idle";
  useEffect(() => { if (dictation.error) toast.error(dictation.error); }, [dictation.error]);
  useEffect(() => { if (rec.error) toast.error(rec.error); }, [rec.error]);

  const startMemo = async () => {
    if (dictation.listening) dictation.stop();
    await rec.start();
  };

  const stopMemo = async () => {
    const duration = rec.elapsedMs;
    const out = await rec.stop();
    if (!out || !out.blob.size) { toast.error("Nothing was recorded"); return; }
    if (out.blob.size > MAX_BYTES) { toast.error("That memo is too long to save (max about 24 MB). Try a shorter one."); return; }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { toast.error("Please sign in to save voice memos"); return; }
      const mime = out.mimeType.split(";")[0] || "audio/webm";
      const path = `${u.user.id}/${crypto.randomUUID()}.${extFor(mime)}`;
      const { error } = await supabase.storage.from("note-audio").upload(path, out.blob, { contentType: mime, upsert: false });
      if (error) { toast.error("Couldn't save the voice memo"); return; }
      editor.chain().focus().insertContent({ type: "voiceMemo", attrs: { path, duration }, }).run();
      toast.success("Voice memo added");
    } finally { setUploading(false); }
  };

  const secs = Math.floor(rec.elapsedMs / 1000);
  return (
    <>
      <Button variant="ghost" type="button" onMouseDown={(e) => e.preventDefault()}
        disabled={!dictation.supported || recording || uploading}
        onClick={() => dictation.toggle()}
        title={dictation.supported ? (dictation.listening ? "Stop dictating" : "Dictate") : "Dictation isn't supported in this browser"}
        aria-label={dictation.listening ? "Stop dictating" : "Dictate"} aria-pressed={dictation.listening}
        className={cn(btn, dictation.listening && "bg-primary/10 text-primary")}>
        {dictation.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {dictation.listening && <span>Listening…</span>}
      </Button>
      {recording ? (
        <>
          <Button variant="ghost" type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => void stopMemo()}
            disabled={rec.state === "stopping"} aria-label="Stop and save voice memo" title="Stop and save"
            className={cn(btn, "bg-destructive/10 text-destructive")}>
            <Square className="h-3.5 w-3.5 fill-current" /> {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
          </Button>
          <Button variant="ghost" type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => rec.cancel()} aria-label="Discard recording" title="Discard" className={btn}>
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button variant="ghost" type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => void startMemo()}
          disabled={!rec.supported || uploading} aria-label="Record voice memo" title="Record voice memo" className={btn}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
        </Button>
      )}
    </>
  );
}
