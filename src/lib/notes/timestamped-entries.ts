/** Timestamp sections remain ordinary markdown in the daily notebook body. */
export function timestampedEntries(body: string) {
  const pattern = /^(?:#{2,3}\s+|[-*]\s+)(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)(?=\s*(?:—|–|-|\n|$))/gm;
  const matches = Array.from(body.matchAll(pattern));
  return matches.map((match, index) => ({
    start: match.index ?? 0,
    end: matches[index + 1]?.index ?? body.length,
    time: match[1],
    timeStart: (match.index ?? 0) + match[0].indexOf(match[1]),
  }));
}

export function appendTimestampedEntry(body: string, text: string, time: string) {
  return `${body.trimEnd()}${body.trim() ? "\n\n" : ""}### ${time}\n\n${text.trim()}\n`;
}

export function moveTimestampedEntry(body: string, index: number, direction: -1 | 1) {
  const entries = timestampedEntries(body);
  const target = index + direction;
  if (!entries[index] || !entries[target]) return body;
  const first = entries[Math.min(index, target)];
  const second = entries[Math.max(index, target)];
  const a = body.slice(first.start, first.end).trimEnd();
  const b = body.slice(second.start, second.end).trimEnd();
  return body.slice(0, first.start) + b + "\n\n" + a + "\n\n" + body.slice(second.end);
}

export function editEntryTimestamp(body: string, index: number, time: string) {
  const entry = timestampedEntries(body)[index];
  if (!entry || !/^\d{1,2}:\d{2}\s*(?:AM|PM)?$/i.test(time.trim())) return body;
  return body.slice(0, entry.timeStart) + time.trim() + body.slice(entry.timeStart + entry.time.length);
}