import * as GTFS from '../interfaces';

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

function loadOne(
	db: Databases,
	prefix: string = '',
): (name: string) => Promise<void> {
	return async name => {
		db[name] = new PouchDB(name);
		await db[name].load(`${prefix}/${name}.ndjson`);
	}
}

export async function loadAll(prefix?: string): Promise<Databases> {
	const db: Databases = {
		agency: null as any,
		calendar: null as any,
		calendar_dates: null as any,
		fare_attributes: null as any,
		fare_rules: null as any,
		feed_info: null as any,
		frequencies: null as any,
		routes: null as any,
		shapes: null as any,
		stops: null as any,
		stop_times: null as any,
		transfers: null as any,
		trips: null as any,
	}

	await Promise.all(Object.keys(db).map(loadOne(db, prefix)));

	return db;
}
