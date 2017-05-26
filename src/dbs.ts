import * as GTFS from './interfaces';

export interface Databases {
	agency: PouchDB.Database<GTFS.Agency>
	calendar: PouchDB.Database<GTFS.Calendar>
	calendar_dates: PouchDB.Database<GTFS.CalendarDate>
	fare_attributes: PouchDB.Database<GTFS.FareAttribute>
	fare_rules: PouchDB.Database<GTFS.FareRule>
	feed_info: PouchDB.Database<GTFS.FeedInfo>
	frequencies: PouchDB.Database<GTFS.Frequency>
	routes: PouchDB.Database<GTFS.Route>
	shapes: PouchDB.Database<GTFS.Shape>
	stops: PouchDB.Database<GTFS.Stop>
	stop_times: PouchDB.Database<GTFS.StopTime>
	transfers: PouchDB.Database<GTFS.Transfer>
	trips: PouchDB.Database<GTFS.Trip>
}

const dbPartial = {
	agency: undefined,
	calendar: undefined,
	calendar_dates: undefined,
	fare_attributes: undefined,
	fare_rules: undefined,
	feed_info: undefined,
	frequencies: undefined,
	routes: undefined,
	shapes: undefined,
	stops: undefined,
	stop_times: undefined,
	transfers: undefined,
	trips: undefined,
} as Partial<Databases>

export function newDBPartial(): Partial<Databases> {
	return Object.assign({}, dbPartial);
}

export const names = Object.keys(dbPartial);

export default dbPartial;
