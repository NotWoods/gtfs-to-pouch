import { createReadStream, createWriteStream } from 'fs';
import { basename, join } from 'path';
import parseCSVFile from 'csv-to-pouch';
import { exists } from './fs';
import { transformers } from './transformers';
import PouchDB, { ReplicatingDatabase } from './pouchdb';

/**
 * Creates the output dump file for the given GTFS file, and resolves once
 * complete.
 * @param file - either a path to a CSV file, or a ZipObject
 * representing a CSV file.
 */
export default async function createOutputDump(
	file: string | JSZipObject,
	outputDir: string
): Promise<void> {
	// Extract the file name and a readable stream for its contents
	let name: string;
	let input: NodeJS.ReadableStream;
	if (typeof file === 'string') {
		name = basename(file);
		input = createReadStream(file);
	} else {
		name = basename(file.name);
		input = file.nodeStream('nodebuffer');
	}

	// Save the resulting file inside the output directory as a ndjson file
	const outputPath = join(outputDir, `${name}.ndjson`);

	// Ensure the name is recognized by the program
	if (typeof transformers[name] !== 'function') {
		throw new TypeError(`No transformer exists for ${name}`);
	}

	// Create a PouchDB database
	const db = <ReplicatingDatabase<any>> new PouchDB(name, { adapter: 'memory' });
	// If there is an existing dumpfile, load it into the memery database.
	if (await exists(outputPath)) {
		await db.load(createReadStream(outputPath));
	}

	// Parse the CSV text file, then dump the updated database to the output path
	await parseCSVFile(db, input, transformers[name]);
	await db.dump(createWriteStream(outputPath));

	await db.destroy();
}
