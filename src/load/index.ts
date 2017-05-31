import { newDBPartial, Databases } from '../dbs';
import { names } from '../dbs';
import PouchDB from './pouchdb';

export async function loadOne<T>(
	name: string,
	prefix: string = '',
	db?: PouchDB.Database<T>,
): Promise<PouchDB.Database<T>> {
	if (!db) db = new PouchDB(name);
	await (db as any).load(`${prefix}/${name}.ndjson`);
	return db;
}

/**
 * Loads all dumpfiles on the client.
 * @param prefix URL for the folder where the dumpfiles are stored. If omitted,
 * the root of the server is assumed to be the folder.
 */
export default async function loadAll(prefix?: string): Promise<Databases> {
	const db = newDBPartial();

	await Promise.all(names.map(async name => {
		db[name] = await loadOne(name, prefix, db[name]);
	}));

	return db as Databases;
}
