import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EMOJIS: [string, string][] = [
  ["🌿", "herb leaf nature green"], ["🌱", "seedling sprout growth plan"], ["🌸", "flower blossom spring"],
  ["🌻", "sunflower summer"], ["🍂", "fallen leaf autumn fall"], ["❄️", "snow winter"], ["🌳", "tree forest"],
  ["🌙", "moon night"], ["🌕", "full moon"], ["🌑", "new moon"], ["☀️", "sun sunshine"], ["⭐", "star"],
  ["✨", "sparkles magic"], ["🔮", "crystal ball intuition"], ["🪐", "planet saturn"], ["🌌", "galaxy sky"],
  ["🔥", "fire flame"], ["💧", "water droplet"], ["🌊", "wave ocean"], ["🌈", "rainbow"],
  ["❤️", "heart love"], ["🩷", "pink heart"], ["💜", "purple heart"], ["🤍", "white heart"],
  ["😊", "smile happy"], ["😌", "calm relieved"], ["😴", "sleep tired"], ["😢", "sad cry"], ["😤", "frustrated"],
  ["🥰", "loved"], ["🙏", "gratitude thanks pray"], ["💪", "strong exercise"], ["🎉", "celebrate party"],
  ["🎯", "target goal"], ["🏆", "trophy win"], ["📚", "books study"], ["✍️", "writing journal"], ["📝", "note memo"],
  ["💡", "idea lightbulb"], ["📅", "calendar date"], ["⏰", "alarm time"], ["☕", "coffee"], ["🍵", "tea"],
  ["🍎", "apple food"], ["🥗", "salad meal"], ["🍲", "soup dinner"], ["💊", "pill meds medicine"], ["🩺", "doctor appointment"],
  ["🧘", "meditation yoga"], ["🚶", "walk"], ["🛁", "bath self care"], ["🏡", "home house"], ["🧺", "laundry basket"],
  ["👨‍👩‍👧", "family"], ["👶", "baby kids"], ["👵", "grandma elder caregiving"], ["🤝", "connection friends"],
  ["💰", "money"], ["🛒", "shopping groceries"], ["✈️", "travel trip"], ["🎨", "art creative"], ["🎵", "music"],
  ["🐈", "cat"], ["🐕", "dog"], ["🦋", "butterfly change"], ["🐝", "bee busy"], ["🕯️", "candle ritual"], ["🌀", "cycle spiral"],
];

/** Any single emoji sequence (flags, skin tones, ZWJ families). */
export const EMOJI_RE = /^(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?)*)$/u;

export function EmojiPicker({ value, onPick }: { value?: string | null; onPick: (icon: string) => void }) {
  const [query, setQuery] = useState("");
  const [paste, setPaste] = useState("");
  const candidate = paste.trim();
  const valid = EMOJI_RE.test(candidate);
  const q = query.trim().toLowerCase();
  const matches = EMOJIS.filter(([e, k]) => !q || `${e} ${k}`.includes(q));
  return (
    <div className="space-y-2">
      <Input aria-label="Search emoji" placeholder="Search emoji…" value={query} onChange={e => setQuery(e.target.value)} className="h-9 text-xs" />
      <form className="flex gap-1" onSubmit={e => { e.preventDefault(); if (valid) onPick(`emoji:${candidate}`); }}>
        <Input aria-label="Paste any emoji" placeholder="Paste or type any emoji…" value={paste} onChange={e => setPaste(e.target.value)} className="h-9 min-w-0 text-xs" />
        <Button type="submit" size="sm" className="h-9" disabled={!valid}>Use</Button>
      </form>
      <div className="grid max-h-56 grid-cols-7 gap-1 overflow-y-auto p-1">
        {matches.map(([e, k]) => (
          <Button key={e} type="button" variant="ghost" size="icon" title={k} aria-label={k} onClick={() => onPick(`emoji:${e}`)}
            className={cn("h-9 w-9", value === `emoji:${e}` && "ring-2 ring-primary")}>
            <span aria-hidden className="text-base leading-none">{e}</span>
          </Button>
        ))}
      </div>
      {!matches.length && <p className="text-xs text-muted-foreground">No matching emoji — paste one above.</p>}
    </div>
  );
}
