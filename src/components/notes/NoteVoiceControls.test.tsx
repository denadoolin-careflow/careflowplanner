import { act, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, expect, it, vi } from "vitest";
import { NoteVoiceControls } from "./NoteVoiceControls";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/use-audio-recorder", () => ({
  useAudioRecorder: () => ({ state: "idle", supported: false, elapsedMs: 0 }),
}));

class Recognition {
  static current: Recognition;
  onresult?: (event: unknown) => void;
  onend?: () => void;
  start() { Recognition.current = this; }
  stop() { this.onend?.(); }
}
const phrase = (transcript: string, isFinal: boolean) => Object.assign([{ transcript }], { isFinal });
afterEach(() => vi.unstubAllGlobals());

it("keeps the note's original writing and inserts only final spoken phrases once", () => {
  vi.stubGlobal("SpeechRecognition", Recognition);
  const editor = new Editor({ extensions: [StarterKit], content: {
    type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Original writing. " }] }],
  } });
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  const controls = render(<NoteVoiceControls editor={editor} />);
  fireEvent.click(screen.getByRole("button", { name: /^Dictate$/ }));
  const emit = (results: ReturnType<typeof phrase>[]) => act(() => Recognition.current.onresult?.({ results }));
  emit([phrase("water water", false)]);
  expect(editor.getText()).toBe("Original writing. ");
  emit([phrase("water the plants", true)]);
  emit([phrase("water the plants", true), phrase("very", false)]);
  emit([phrase("water the plants", true), phrase("very very gently", true)]);
  emit([phrase("water the plants", true), phrase("very very gently", true)]);
  expect(editor.getText()).toBe("Original writing. water the plants very very gently ");
  const saved = editor.getJSON();
  const reopened = new Editor({ extensions: [StarterKit], content: saved });
  expect(reopened.getText()).toBe("Original writing. water the plants very very gently ");
  controls.unmount();
  reopened.destroy();
  editor.destroy();
});