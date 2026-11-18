// Both lists live on /sites/Dispatch and are maintained by the Dispatch
// leads in SharePoint; the hub only reads them.

export const WEEKEND_CALENDAR_LIST = 'Dispatch Weekend Calendar';
export const DISPATCHER_SCHEDULE_LIST = 'Dispatcher Schedule';

// Columns are matched by display name or internal name, first match wins, so
// a column renamed in SharePoint keeps working. "Title" is the list's own
// first column, shown to editors as the person's name.

/** One row per person per weekend day: Date (date only), Title (dispatcher,
 *  blank = open slot), Team (choice: Dispatch / Next Days / Outsource /
 *  Outsource/Dispatch), Shift (text, e.g. "8AM - 4PM"). */
export const WeekendCalendarColumns = {
  date: ['Date', 'Date1'],
  agent: ['Dispatcher', 'Title'],
  skill: ['Team'],
  schedule: ['Shift'],
};

/** One row per dispatcher: Title (name), Team (choice: Dispatch / Outsource),
 *  Shift (plain multi-line text, one shift per line), Area Coverage (the
 *  zone), Sort Order (number, the order on Albert's sheet). */
export const DispatcherScheduleColumns = {
  name: ['Dispatcher', 'Title'],
  team: ['Team'],
  shift: ['Shift'],
  zone: ['Area Coverage', 'AreaCoverage', 'Zone'],
  sortOrder: ['Sort Order', 'SortOrder'],
};
