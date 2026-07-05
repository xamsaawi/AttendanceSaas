import { eachDayOfInterval, format, getISODay, parseISO } from "date-fns";

export type HolidayRange = { start_date: string; end_date: string };

export type SchoolCalendarConfig = {
  workingDays: number[];
  holidays: HolidayRange[];
};

function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isHoliday(dateStr: string, holidays: HolidayRange[]): boolean {
  return holidays.some((h) => dateStr >= h.start_date && dateStr <= h.end_date);
}

export function isSchoolDay(dateStr: string, config: SchoolCalendarConfig): boolean {
  const isoDay = getISODay(parseISO(dateStr));
  if (!config.workingDays.includes(isoDay)) return false;
  return !isHoliday(dateStr, config.holidays);
}

export function listSchoolDaysInRange(
  fromStr: string,
  toStr: string,
  config: SchoolCalendarConfig,
): string[] {
  const days = eachDayOfInterval({ start: parseISO(fromStr), end: parseISO(toStr) });
  return days.map(toDateOnly).filter((d) => isSchoolDay(d, config));
}
