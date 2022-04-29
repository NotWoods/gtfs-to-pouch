import type {
  Agency,
  Stop,
  Route,
  Trip,
  FareRule,
  StopTime,
  Calendar,
  FareAttribute,
  Shape,
  Frequency,
  Transfer,
  FeedInfo,
  CalendarDate,
} from "query-pouch-gtfs";

export interface DatabaseList {
  agency: PouchDB.Database<Agency>;
  calendar: PouchDB.Database<Calendar>;
  calendar_dates?: PouchDB.Database<CalendarDate>;
  fare_attributes?: PouchDB.Database<FareAttribute>;
  fare_rules?: PouchDB.Database<FareRule>;
  feed_info?: PouchDB.Database<FeedInfo>;
  frequencies?: PouchDB.Database<Frequency>;
  routes: PouchDB.Database<Route>;
  shapes?: PouchDB.Database<Shape>;
  stops: PouchDB.Database<Stop>;
  stop_times: PouchDB.Database<StopTime>;
  transfers?: PouchDB.Database<Transfer>;
  trips: PouchDB.Database<Trip>;
}

export const databaseNames = [
  "agency",
  "stops",
  "routes",
  "trips",
  "stop_times",
  "calendar",
  "calendar_dates",
  "fare_attributes",
  "fare_rules",
  "shapes",
  "frequencies",
  "transfers",
  "feed_info",
];
