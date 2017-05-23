import { createReadStream, createWriteStream } from 'fs';
import { basename, join } from 'path';
import parseCSVFile from 'csv-to-pouch';
import { exists } from './fs';
import { transformers } from './transformers';
import PouchDB, { ReplicatingDatabase } from './pouchdb';

export type File = string | JSZipObject;

function fileBasename(file: File): string {
	const filename = typeof file === 'string' ? file : file.name;
	return basename(filename);
}

/**
 * Saves the contents of a single GTFS table to a PouchDB database.
 * Resolves once the database has been updated. Will throw if the filename
 * is an invalid GTFS file.
 * @param file - either a path to the table file, or a ZipObject representing
 * the file.
 * @param db - Database to save to.
 */
export function gtfsToDB(file: File, db: PouchDB.Database<any>) {
	// Extract a readable stream for the file contents
	let input: NodeJS.ReadableStream;
	if (typeof file === 'string') {
		input = createReadStream(file);
	} else {
		input = (file as any).nodeStream('nodebuffer');
	}

	// Ensure the filename is recognized by the program
	const name = fileBasename(file);
	if (typeof transformers[name] !== 'function') {
		throw new TypeError(`No transformer exists for ${name}`);
	}

	// Parse the CSV text file and update the database
	return parseCSVFile(db, input, transformers[name]);
}

export type DB<T = any> = PouchDB.Database<T>;

/**
 * Dump a GTFS file into a PouchDB database, and optionally create a dumpfile
 * of the database to load onto a client.
 * @param file - either a path to the table file, or a ZipObject representing it
 * @param mode - if 'dump', creates a dumpfile. if 'db', returns the database
 * instead of destroying it and no dumpfile is created.
 * @param dest - in 'dump' mode, path to the destination folder. in 'db' mode,
 * you can optionally specify the database to save data to.
 */
export function dumpGTFS(file: File, mode: 'dump', dest: string): Promise<string>
export function dumpGTFS(file: File, mode: 'db'): Promise<DB>
export function dumpGTFS<T>(file: File, mode: 'db', dest: DB<T>): Promise<DB<T>>
export async function dumpGTFS(
	file: File,
	mode: 'dump' | 'db',
	dest?: string | DB
): Promise<string|DB> {
	// Extract the file name and a readable stream for its contents
	const name = fileBasename(file);

	// Create a database to dump to if an existing one isn't provided
	let db: ReplicatingDatabase;
	if (typeof dest === 'string')
		db = new PouchDB(name, { adapter: 'memory' }) as ReplicatingDatabase
	else if (!dest)
		db = new PouchDB(name) as ReplicatingDatabase
	else
		db = dest as ReplicatingDatabase

	if (mode === 'db') {
		// Parse the CSV file and save its data to the database
		await gtfsToDB(file, db);
		// Return the newly created database
		return db;
	} else {
		if (typeof dest !== 'string')
			throw new Error('Cannot use database destination in dump mode');

		// Save the resulting file inside the output directory as a ndjson file
		const destPath = join(dest, `${name}.ndjson`);
		// If there is an existing dumpfile, load it into the memery database.
		if (await exists(destPath)) {
			await db.load(createReadStream(destPath));
		}

		// Parse the CSV text file, then dump the updated database to the output path
		await gtfsToDB(file, db);
		await db.dump(createWriteStream(dest))

		// Destroy the temporary database
		await db.destroy();

		// Return the path to the dumpfile
		return destPath;
	}
}
