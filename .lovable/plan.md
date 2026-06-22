## Goal
Add voice capture to the Inbox and make the floating Quick Add + Ask Carey controls visible again on mobile (where the user is currently working).

## 1. Voice capture on Inbox (`src/pages/Inbox.tsx`)

Add a microphone control inside the Quick Capture card, right next to the "Organize for Me" button (and a small mic icon inside the input on mobile).

Behavior:
- Uses the existing `useAudioRecorder` hook (`src/hooks/use-audio-recorder.ts`).
- Tap mic → starts recording, shows pulsing red dot + live `mm:ss` timer + "Tap to stop" hint.
- Tap again → stops, base64-encodes audio, calls the existing `ai-voice-capture` edge function via `aiInvoke` with `{ audioBase64, mimeType }`.
- Response gives `{ transcript, summary, tasks[] }`. For each task in `tasks`, call `addTask({...mapped, inbox: true })` (title, area, priority, status, dueDate, estMinutes, tags, notes). Toast: "Caught N thoughts ✨" with the gentle `summary` as description.
- Cancel button (X) discards without sending.
- Fallback for unsupported browsers: hide mic, show subtle "Voice capture not supported" tooltip.
- Empty transcript → toast "I didn't catch anything — try again."
- While recording, the text input is replaced (visually) by the recording chrome; while transcribing, show a spinner + "Organizing your thoughts…".

Calming styling consistent with the redesign: rounded-full mic button using the existing peach/sage tints, soft pulse animation, respects `prefers-reduced-motion`.

## 2. Bring back floating buttons on mobile (`src/components/quick-add/CombinedFab.tsx`)

Currently the wrapper uses `hidden lg:flex`, so the universal Quick Capture FAB (with Note / Voice / Journal / Checklist / PDF / Photo / Quick add) and the Ask Carey bubble never appear on phones. Remove the `hidden lg:flex` gating so the FAB shows on all breakpoints, and nudge the default position up (`bottom: 96` → clears the mobile BottomNav). No behavior changes to the actions themselves — the existing "Voice" action already dispatches `careflow:carey:open`, and the Carey bubble already opens the chat assistant.

No other layout files need to change; `AppLayout.tsx` already mounts both `<CombinedFab />` and `<CareyChat />`.

## 3. Out of scope
No changes to edge functions, schema, or other pages. Only the Inbox page and the FAB visibility are touched.

## Technical notes
- New imports in `Inbox.tsx`: `Mic`, `Square`, `Loader2` from lucide; `useAudioRecorder` from `@/hooks/use-audio-recorder`.
- Mapping helper inside `Inbox.tsx` converts each AI task into the local `Task` shape (areas already match the enum used by the edge function).
- Recording timer formatted from `elapsedMs` (already exposed by the hook).
- All new state (`recState`, `processing`) stays local to `InboxInner`.
