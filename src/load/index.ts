import * as GTFS from '../interfaces';
import filenames from '../filenames';
import PouchDB from './pouchdb';

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
	db: Partial<Databases>,
	prefix: string = '',
): (name: keyof Databases) => Promise<void> {
	return async name => {
		if (!db[name]) db[name] = new PouchDB(name);
		await (db[name] as any).load(`${prefix}/${name}.ndjson`);
	}
}

/**
 * Loads all dumpfiles on the client.
 * @param prefix URL for the folder where the dumpfiles are stored. If omitted,
 * the root of the server is assumed to be the folder.
 */
export default async function loadAll(prefix?: string): Promise<Databases> {
	const db = {} as Partial<Databases>;

	await Promise.all(filenames.map(loadOne(db, prefix)));

	return db as Databases;
}
