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
});