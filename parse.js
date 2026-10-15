// Natural-language time parser -> epoch ms (local timezone) or null.
// shortcut: English only, no "in 2 months"/explicit dates; use the date-time picker for those.
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const UNIT = { m: 60e3, h: 36e5, d: 864e5, w: 6048e5 };

function parseWhen(input, now = new Date()) {
  let s = input.toLowerCase().trim();
  const rel = s.match(/^(?:in\s+)?(\d+(?:\.\d+)?)\s*(m|mins?|minutes?|h|hrs?|hours?|d|days?|w|weeks?)$/);
  if (rel) return now.getTime() + rel[1] * UNIT[rel[2][0]];

  let days = null, m;
  if ((m = s.match(/\b(today|tomorrow)\b/))) {
    days = m[1] === 'tomorrow' ? 1 : 0;
  } else if ((m = s.match(new RegExp(`\\b(?:(this|next)\\s+)?(${DAYS.join('|')})\\b`)))) {
    const diff = (DAYS.indexOf(m[2]) - now.getDay() + 7) % 7;
    days = m[1] === 'this' ? diff : diff || 7;
  }
  if (m) s = s.replace(m[0], ' ');

  let h = 9, min = 0, timed = true;
  if ((m = s.match(/end of day|eod/))) h = 17;
  else if ((m = s.match(/noon/))) h = 12;
  else if ((m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/))) {
    h = +m[1]; min = +(m[2] || 0);
    if (m[3] === 'pm' && h < 12) h += 12;
    else if (m[3] === 'am' && h === 12) h = 0;
  } else timed = false;
  if (timed) s = s.replace(m[0], ' ');

  if (days === null && !timed) return null;
  if (h > 23 || min > 59) return null;
  if (s.replace(/\b(at|on|by|before|the|around)\b/g, '').trim()) return null; // unknown words

  const d = new Date(now);
  d.setDate(d.getDate() + (days ?? 0));
  d.setHours(h, min, 0, 0);
  if (days === null && d <= now) d.setDate(d.getDate() + 1); // bare "at 3pm" that already passed -> tomorrow
  return d > now ? +d : null;
}

if (typeof module !== 'undefined') module.exports = parseWhen;
