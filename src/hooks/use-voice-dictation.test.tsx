import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVoiceDictation } from "./use-voice-dictation";

class Recognition {
  static current: Recognition;
  onresult?: (event: unknown) => void;
  onerror?: (event: unknown) => void;
  onend?: () => void;
  start() { Recognition.current = this; }
  stop() { this.onend?.(); }
}
const result = (text: string, isFinal: boolean) => Object.assign([{ transcript: text }], { isFinal });
afterEach(() => vi.unstubAllGlobals());
describe("dictation", () => {
  it("emits final phrases once across cumulative and interim events, preserving repeated speech", () => {
    vi.stubGlobal("SpeechRecognition", Recognition);
    const delta = vi.fn();
    const { result: hook } = renderHook(() => useVoiceDictation(vi.fn(), delta));
    act(() => hook.current.start());
    act(() => Recognition.current.onresult?.({ results: [result("water", false)] }));
    expect(delta).not.toHaveBeenCalled();
    act(() => Recognition.current.onresult?.({ results: [result("water the plants", true)] }));
    act(() => Recognition.current.onresult?.({ results: [result("water the plants", true), result("water", false)] }));
    act(() => Recognition.current.onresult?.({ results: [result("water the plants", true), result("water the plants", true)] }));
    expect(delta.mock.calls).toEqual([["water the plants"], ["water the plants"]]);
    act(() => hook.current.stop());
    act(() => hook.current.start());
    act(() => Recognition.current.onresult?.({ results: [result("water the plants", true)] }));
    expect(delta).toHaveBeenCalledTimes(3);
  });
  it("surfaces a speech-service network failure and clears listening", () => {
    vi.stubGlobal("SpeechRecognition", Recognition);
    const { result: hook } = renderHook(() => useVoiceDictation(vi.fn()));
    act(() => hook.current.start());
    act(() => Recognition.current.onerror?.({ error: "network" }));
    expect(hook.current.listening).toBe(false);
    expect(hook.current.error).toContain("couldn't connect");
  });
  it("ignores replayed and revised finalized slots, not intentional repeated words in new slots", () => {
    vi.stubGlobal("SpeechRecognition", Recognition);
    const delta = vi.fn();
    const { result: hook } = renderHook(() => useVoiceDictation(vi.fn(), delta));
    act(() => hook.current.start());
    act(() => Recognition.current.onresult?.({ results: [result("very very calm", false)] }));
    act(() => Recognition.current.onresult?.({ results: [result("very very calm", true)] }));
    act(() => Recognition.current.onresult?.({ results: [result("very very calm", true)] }));
    act(() => Recognition.current.onresult?.({ results: [result("very very calm today", true), result("very very calm", false)] }));
    act(() => Recognition.current.onresult?.({ results: [result("very very calm today", true), result("very very calm", true)] }));
    expect(delta.mock.calls).toEqual([["very very calm"], ["very very calm"]]);
  });
  it("accepts final speech on stop without allowing an overlapping session", () => {
    class DelayedRecognition extends Recognition { stop() {} }
    vi.stubGlobal("SpeechRecognition", DelayedRecognition);
    const delta = vi.fn();
    const { result: hook } = renderHook(() => useVoiceDictation(vi.fn(), delta));
    act(() => hook.current.start());
    const first = Recognition.current;
    act(() => hook.current.stop());
    act(() => hook.current.start());
    expect(Recognition.current).toBe(first);
    act(() => first.onresult?.({ results: [result("only what I said", true)] }));
    act(() => first.onend?.());
    act(() => hook.current.start());
    const second = Recognition.current;
    expect(second).not.toBe(first);
    act(() => first.onresult?.({ results: [result("only what I said", true), result("late replay", true)] }));
    act(() => second.onresult?.({ results: [result("next phrase", true)] }));
    expect(delta.mock.calls).toEqual([["only what I said"], ["next phrase"]]);
  });
  it("ignores late results after failure and after unmount", () => {
    vi.stubGlobal("SpeechRecognition", Recognition);
    const delta = vi.fn();
    const { result: hook, unmount } = renderHook(() => useVoiceDictation(vi.fn(), delta));
    act(() => hook.current.start());
    const failed = Recognition.current;
    act(() => failed.onerror?.({ error: "network" }));
    act(() => hook.current.start());
    act(() => failed.onresult?.({ results: [result("ghost text", true)] }));
    const active = Recognition.current;
    unmount();
    act(() => active.onresult?.({ results: [result("closed note text", true)] }));
    expect(delta).not.toHaveBeenCalled();
  });
});