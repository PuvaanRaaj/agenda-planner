'use client';

type Props = {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  itemDates: Set<string>; // dates that have items, for dot indicator
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Use local-time formatting to avoid UTC offset shifting the date.
// d.toISOString() would shift to UTC and produce the wrong date for
// users in negative UTC-offset timezones (e.g. UTC-5).
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDays(selectedDate: string): Date[] {
  const selected = new Date(selectedDate + 'T00:00:00');
  const day = selected.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(selected);
  monday.setDate(monday.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function WeekStrip({ selectedDate, onSelectDate, itemDates }: Props) {
  const days = getWeekDays(selectedDate);

  function shiftWeek(delta: number) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta * 7);
    onSelectDate(toDateStr(d));
  }

  return (
    <div className="flex items-center gap-1 border-b border-[#1a1a1a] px-4 py-3">
      <button
        type="button"
        onClick={() => shiftWeek(-1)}
        className="rounded-md p-1.5 text-[#555] transition-colors hover:bg-[#161616] hover:text-[#fafafa]"
        aria-label="Previous week"
      >
        ‹
      </button>
      {days.map((day, i) => {
        const dateStr = toDateStr(day);
        const isSelected = dateStr === selectedDate;
        const hasItems = itemDates.has(dateStr);
        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => onSelectDate(dateStr)}
            className={`flex flex-1 flex-col items-center rounded-md py-1.5 transition-colors ${
              isSelected ? 'bg-[#fafafa]' : 'hover:bg-[#161616]'
            }`}
          >
            <span className={`mb-0.5 text-[9px] font-medium ${isSelected ? 'text-[#777]' : 'text-[#555]'}`}>
              {DAY_NAMES[i]}
            </span>
            <span className={`text-sm font-semibold ${isSelected ? 'text-[#111]' : 'text-[#444]'}`}>
              {day.getDate()}
            </span>
            <div className={`mt-0.5 h-1 w-1 rounded-full ${
              hasItems ? (isSelected ? 'bg-[#555]' : 'bg-[#333]') : 'invisible'
            }`} />
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => shiftWeek(1)}
        className="rounded-md p-1.5 text-[#555] transition-colors hover:bg-[#161616] hover:text-[#fafafa]"
        aria-label="Next week"
      >
        ›
      </button>
    </div>
  );
}
