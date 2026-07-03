import { useState } from "react";
import { Paperclip, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AttachmentsField } from "@/components/attachments/AttachmentsField";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Collapses the always-visible attachments strip into a small pill button
 * that opens a rich popover with the full uploader.
 */
export function AttachmentPopover({
  noteId,
  value,
  onChange,
}: {
  noteId: string;
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = value.length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 text-xs font-medium text-muted-foreground",
            "hover:bg-card hover:text-foreground",
          )}
        >
          <Paperclip className="h-3.5 w-3.5" />
          {count > 0 ? (
            <>
              <span>{count} attachment{count === 1 ? "" : "s"}</span>
            </>
          ) : (
            <span>Add files</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-[min(560px,92vw)] max-h-[70vh] overflow-y-auto p-3"
      >
        <AttachmentsField
          scope={"note" as any}
          ownerId={noteId}
          value={value}
          onChange={(next) => {
            onChange(next);
            // Auto-collapse shortly after a successful upload.
            if (next.length > value.length) {
              window.setTimeout(() => setOpen(false), 900);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}