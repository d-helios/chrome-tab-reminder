// Natural-language time parser -> epoch ms (local timezone) or null.
// Understands:
//   relative   "in 90 minutes", "24h", "in 3 days", "in 2 months"
//   weekdays   "next monday at 9am", "tomorrow 8pm", "friday noon", "today eod"
//   dates      "2026-10-20 14:30", "20.10.2026", "20/10 9am", "oct 20 at 9am",
//              "20 october 2026", "october 20th"
const DAYS = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tues: 2, tue: 2,
  wednesday: 3, wed: 3, thursday: 4, thurs: 4, thur: 4, thu: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};
const DAY_NAMES = Object.keys(DAYS).join('|');
const MONTHS = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sept: 8, sep: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11,
};
const MINUTE = 60e3, HOUR = 36e5, DAY = 864e5;

const REL = /^(?:in\s+|after\s+)?(\d+(?:\.\d+)?)\s*(months?|mo|minutes?|mins?|min|m|hours?|hrs?|hr|h|days?|d|weeks?|w)$/;

function relativeMs(unit) {
  if (unit.startsWith('mo')) return 30 * DAY;
  switch (unit[0]) {
    case 'm': return MINUTE;
    case 'h': return HOUR;
    case 'd': return DAY;
    case 'w': return 7 * DAY;
  }
  return null;
}

function validDate(year, month, day) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return false;
  const d = new Date(year, month, day);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

function nextHour(now) {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function parseWhen(input, now = new Date()) {
  // "2026-10-20T14:30" -> "2026-10-20 14:30"
  let s = String(input ?? '')
    .toLowerCase()
    .replace(/(\d)t(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;

  // Relative offset: "in 90 minutes", "24h", "in 3 days".
  const rel = s.match(REL);
  if (rel) {
    const ms = relativeMs(rel[2]);
    return ms === null ? null : now.getTime() + Number(rel[1]) * ms;
  }

  let year = null, month = null, day = null; // explicit calendar date
  let shift = null;                          // today / tomorrow
  let weekday = null, thisWeek = false;
  let m;

  // --- explicit calendar date -------------------------------------------------
  if ((m = s.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/))) {
    // 2026-10-20 / 2026/10/20 / 2026.10.20
    year = +m[1]; month = +m[2] - 1; day = +m[3];
    s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/))) {
    // 20.10.2026 / 20/10/26 / 10-20-2026
    const a = +m[1], b = +m[2];
    year = +m[3] < 100 ? +m[3] + 2000 : +m[3];
    if (a > 12) { day = a; month = b - 1; }
    else if (b > 12) { month = a - 1; day = b; }
    else { day = a; month = b - 1; } // ambiguous -> day first
    s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\b(\d{1,2})\s*[./-]\s*(\d{1,2})\b/))) {
    // 20.10 / 20/10 (no year, rolled to the next occurrence)
    const a = +m[1], b = +m[2];
    if (a > 12) { day = a; month = b - 1; }
    else if (b > 12) { month = a - 1; day = b; }
    else { day = a; month = b - 1; }
    s = s.replace(m[0], ' ');
  }

  // Month names: "oct 20", "october 20th 2026", "20 oct", "20th of october".
  if (day === null) {
    const mon = Object.keys(MONTHS).join('|');
    if ((m = s.match(new RegExp(`\\b(${mon})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`)))) {
      month = MONTHS[m[1]]; day = +m[2]; year = m[3] ? +m[3] : null;
      s = s.replace(m[0], ' ');
    } else if ((m = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${mon})\\.?(?:,?\\s+(\\d{4}))?\\b`)))) {
      day = +m[1]; month = MONTHS[m[2]]; year = m[3] ? +m[3] : null;
      s = s.replace(m[0], ' ');
    }
  }

  // --- relative day: today / tomorrow / weekday -------------------------------
  let word = null;
  if ((m = s.match(/\b(today|tonight|tomorrow)\b/))) {
    word = m[1];
    shift = word === 'tomorrow' ? 1 : 0;
    s = s.replace(m[0], ' ');
  } else if ((m = s.match(new RegExp(`\\b(?:(this|next|coming)\\s+)?(${DAY_NAMES})\\b`)))) {
    thisWeek = m[1] === 'this';
    weekday = DAYS[m[2]];
    s = s.replace(m[0], ' ');
  }

  // --- time -------------------------------------------------------------------
  let hour = word === 'tonight' ? 20 : 9, minute = 0, timed = word === 'tonight';

  if ((m = s.match(/\b(?:at\s+|@\s*)?(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/))) {
    hour = +m[1]; minute = +m[2];
    if (m[3] && +m[1] > 12) return null;
    if (m[3] === 'pm' && hour < 12) hour += 12;
    else if (m[3] === 'am' && hour === 12) hour = 0;
    timed = true; s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\b(?:at\s+|@\s*)?(\d{1,2})\s*(am|pm)\b/))) {
    hour = +m[1];
    if (hour > 12) return null;
    if (m[2] === 'pm' && hour < 12) hour += 12;
    else if (m[2] === 'am' && hour === 12) hour = 0;
    timed = true; s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\b(?:at\s+|@\s*)(\d{1,2})\b/))) {
    hour = +m[1]; timed = true; s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\b(\d{1,2})\b/))) {
    // "tomorrow 8", "oct 20 15"
    hour = +m[1]; timed = true; s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\b(end of day|eod)\b/))) {
    hour = 17; timed = true; s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\bnoon\b/))) {
    hour = 12; timed = true; s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\bmidnight\b/))) {
    hour = 0; timed = true; s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\bmorning\b/))) {
    hour = 9; timed = true; s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\bafternoon\b/))) {
    hour = 15; timed = true; s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\b(evening|tonight)\b/))) {
    hour = 18; timed = true; s = s.replace(m[0], ' ');
  } else if ((m = s.match(/\bnight\b/))) {
    hour = 20; timed = true; s = s.replace(m[0], ' ');
  }

  if (timed && (hour > 23 || minute > 59)) return null;

  // Whatever is left must be filler, otherwise we did not understand the input.
  s = s
    .replace(/\b(at|on|by|before|after|around|about|the|of|in|a|an|this|next|coming|sharp|exactly|morning|afternoon|evening|night)\b/g, ' ')
    .replace(/[.,;\-–—]/g, ' ')
    .trim();
  if (s) return null;

  // --- build the target moment -------------------------------------------------
  if (day !== null) {
    if (month === null) return null;
    const y = year ?? now.getFullYear();
    if (!validDate(y, month, day)) return null;

    let out = new Date(y, month, day, hour, minute, 0, 0);
    if (out <= now) {
      if (!timed && y === now.getFullYear() && month === now.getMonth() && day === now.getDate()) {
        out = nextHour(now); // "today" (or today's date) with no time -> next full hour
      } else if (year === null) {
        out = new Date(y + 1, month, day, hour, minute, 0, 0); // next occurrence
      }
    }
    return out > now ? +out : null;
  }

  if (weekday !== null || shift !== null) {
    const out = new Date(now);
    if (weekday !== null) {
      const ahead = (weekday - now.getDay() + 7) % 7;
      out.setDate(out.getDate() + (thisWeek ? ahead : ahead || 7));
    } else {
      out.setDate(out.getDate() + shift);
    }
    out.setHours(hour, minute, 0, 0);
    if (!timed && word !== 'tomorrow' && out <= now) return +nextHour(now);
    return out > now ? +out : null;
  }

  if (!timed) return null;

  const out = new Date(now);
  out.setHours(hour, minute, 0, 0);
  if (out <= now) out.setDate(out.getDate() + 1); // bare "at 3pm" that already passed -> tomorrow
  return +out;
}

if (typeof module !== 'undefined') module.exports = parseWhen;
