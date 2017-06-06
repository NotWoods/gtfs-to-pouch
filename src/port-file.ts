import { createReadStream } from 'fs';
import { basename } from 'path';
import { parseCSVFile } from 'csv-to-pouch';
import { transformers } from './transformers';

function fileBasename(file: string | JSZipObject): string {
	const filename = typeof file === 'string' ? file : file.name;
	return basename(filename, '.txt');
}

/**
 * Ports a GTFS file, taking a stream as input
 */
export async function portPartial(
	input: string | NodeJS.ReadableStream,
	name: string,
	outputDB: PouchDB.Database<any>,
): Promise<void> {
	console.log(`${name}: Starting dump`);

	// Ensure the filename is recognized by the program
	if (typeof transformers[name] !== 'function') {
		throw new TypeError(`No transformer exists for ${name}`);
	}

	const inputStream = typeof input === 'string'
		? createReadStream(input)
		: input;

	// Parse the CSV text file and update the database
	await parseCSVFile(outputDB, inputStream, transformers[name]);

	console.log(`Dump complete for ${name}`);
}

/**
 * Port a GTFS file into a PouchDB database, taking a filepath or a ZipObject
 * from JSZip as input.
 * @param file - either a path to the table file, or a ZipObject representing it
 * @param db - specify the database to save data to.
 */
export function portFile(
	file: string | JSZipObject,
	db: PouchDB.Database<any>,
): Promise<void> {
	// Extract the file name and a readable stream for its contents
	const name = fileBasename(file);

	// Parse the CSV file and save its data to the database
	// Extract a readable stream for the file contents
	const input = typeof file === 'string'
		? file
		: <NodeJS.ReadableStream> (file as any).nodeStream('nodebuffer');

	return portPartial(input, name, db);
}
