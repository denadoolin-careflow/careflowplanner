export const OPEN_SCHEDULE_NOTE_EVENT = "careflow:open-schedule-note";

export function openNoteBesideSchedule(noteId: string) {
  window.dispatchEvent(new CustomEvent<{ noteId: string }>(OPEN_SCHEDULE_NOTE_EVENT, {
    detail: { noteId },
  }));
}
