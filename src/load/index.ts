import { newDBPartial, Databases } from '../dbs';
import { names } from '../dbs';
import PouchDB from './pouchdb';

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
	const db = newDBPartial();

	await Promise.all(names.map(loadOne(db, prefix)));

	return db as Databases;
}
