// US holiday computation. Returns federal + popular observances for a given year.

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function iso(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}`; }

// nth weekday of a month. weekday: 0=Sun..6=Sat. n: 1..5
function nthWeekday(year: number, month: number, weekday: number, n: number) {
  const first = new Date(year, month - 1, 1).getDay();
  const offset = (weekday - first + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return iso(year, month, day);
}

function lastWeekday(year: number, month: number, weekday: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const lastDow = new Date(year, month - 1, lastDay).getDay();
  const diff = (lastDow - weekday + 7) % 7;
  return iso(year, month, lastDay - diff);
}

export interface USHoliday { name: string; date: string; notes?: string; }

export function usHolidaysFor(year: number): USHoliday[] {
  return [
    { name: "New Year's Day", date: iso(year, 1, 1) },
    { name: "Martin Luther King Jr. Day", date: nthWeekday(year, 1, 1, 3) },
    { name: "Valentine's Day", date: iso(year, 2, 14) },
    { name: "Presidents' Day", date: nthWeekday(year, 2, 1, 3) },
    { name: "St. Patrick's Day", date: iso(year, 3, 17) },
    { name: "Mother's Day", date: nthWeekday(year, 5, 0, 2) },
    { name: "Memorial Day", date: lastWeekday(year, 5, 1) },
    { name: "Juneteenth", date: iso(year, 6, 19) },
    { name: "Father's Day", date: nthWeekday(year, 6, 0, 3) },
    { name: "Independence Day", date: iso(year, 7, 4) },
    { name: "Labor Day", date: nthWeekday(year, 9, 1, 1) },
    { name: "Columbus Day", date: nthWeekday(year, 10, 1, 2) },
    { name: "Halloween", date: iso(year, 10, 31) },
    { name: "Veterans Day", date: iso(year, 11, 11) },
    { name: "Thanksgiving", date: nthWeekday(year, 11, 4, 4) },
    { name: "Christmas Eve", date: iso(year, 12, 24) },
    { name: "Christmas Day", date: iso(year, 12, 25) },
    { name: "New Year's Eve", date: iso(year, 12, 31) },
  ];
}

export function usHolidaysRange(startYear: number, endYear: number): USHoliday[] {
  const out: USHoliday[] = [];
  for (let y = startYear; y <= endYear; y++) out.push(...usHolidaysFor(y));
  return out;
}