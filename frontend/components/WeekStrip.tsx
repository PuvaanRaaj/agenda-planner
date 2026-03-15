'use client';

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  itemDates: Set<string>;
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDays(selectedDate: string): Date[] {
  const selected = new Date(selectedDate + 'T00:00:00');
  const day = selected.getDay();
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
    <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => shiftWeek(-1)}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
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
            className={`flex flex-1 flex-col items-center rounded-lg py-2 transition ${
              isSelected ? 'bg-primary-600 text-white' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <span className="mb-0.5 text-[10px] font-medium opacity-90">{DAY_NAMES[i]}</span>
            <span className="text-sm font-semibold">{day.getDate()}</span>
            <div
              className={`mt-1 h-1 w-1 rounded-full ${
                hasItems ? (isSelected ? 'bg-white/80' : 'bg-primary-500') : 'invisible'
              }`}
            />
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => shiftWeek(1)}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Next week"
      >
        ›
      </button>
    </div>
  );
}
