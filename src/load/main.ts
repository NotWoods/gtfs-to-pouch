import * as GTFS from '../interfaces';

const prefix = '';

interface Databases {
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

async function loadOne(db: Databases, name: string): Promise<void> {
	db[name] = new PouchDB(name);
	await db[name].load(`${prefix}/${name}.ndjson`);
}

export async function loadAll(): Promise<Databases> {
	const db: Databases = <any> {
		agency: null,
		calendar: null,
		calendar_dates: null,
		fare_attributes: null,
		fare_rules: null,
		feed_info: null,
		frequencies: null,
		routes: null,
		shapes: null,
		stops: null,
		stop_times: null,
		transfers: null,
		trips: null,
	}

	await Promise.all(Object.keys(db).map(name => loadOne(db, name)));

	return db;
}
