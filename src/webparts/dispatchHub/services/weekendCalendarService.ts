import {
  fetchWeekendShiftsFrom,
  IWeekendShift,
} from '../../customerExperienceHub/services/weekendCalendarService';
import { getSP } from './spConfig';
import { WEEKEND_CALENDAR_LIST, WeekendCalendarColumns } from './fieldNames';

export function fetchDispatchWeekendShifts(): Promise<IWeekendShift[]> {
  return fetchWeekendShiftsFrom(getSP(), WEEKEND_CALENDAR_LIST, WeekendCalendarColumns);
}
