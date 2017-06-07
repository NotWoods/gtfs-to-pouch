import { join, posix, basename } from 'path';
import { readdir, readFile, isDirectory } from './fs';
import * as PouchDB from 'pouchdb'
import * as JSZip from 'jszip';
import isStream from 'is-stream';
import { toBuffer } from 'promise-stream-utils';
import { portFile, portPartial } from './port-file';
import { databaseNames, DatabaseList } from './database-list';

type PortInputList = { [name: string]: string|JSZipObject };
async function portAll(
	inputList: PortInputList,
	outputList: DatabaseList,
): Promise<void> {
	await Promise.all(Object.entries(inputList).map(
		([name, file]) => portFile(file, outputList[name])
	));
}

/**
 * Returns a database list struct created from the provided source
 * @param source Can either be a path to a folder, or a struct listing
 * specific paths to databases for each GTFS filename. Rather than listing paths,
 * database instances can be listed instead.
 */
function prepareOutputList(
	source: string | { [P in keyof DatabaseList]: DatabaseList[P] | string }
): DatabaseList {
	// Create the list to be populated
	const outputList: Partial<DatabaseList> = {};

	if (typeof source === 'string') {
		// Source is a path to a folder containing databases

		// Open an PouchDB instance for each GTFS file in the given path.
		// For example, if the path is localhost:8080/db, then
		// databases will be opened at
		// localhost:8080/db/routes, localhost:8080/db/stops, etc.
		for (const name of databaseNames) {
			const dbPath = posix.join(source, name);
			outputList[name] = new PouchDB(dbPath);
		}
	} else {
		// Source is an object containing paths to seperate databases,
		// or a reference to the database itself

		// For each key in the object, either use the database
		// or use the string as the source locations for a database
		for (const [name, ref] of Object.entries(source)) {
			if (typeof ref === 'string') {
				// Open a database at the given path
				outputList[name] = new PouchDB(ref);
			} else {
				// Use the database reference
				outputList[name] = ref;
			}
		}
	}

	return <DatabaseList> outputList;
}

/**
 * Parses a single GTFS partial, rather than the entire ZIP file.
 * @param partialFile Either a path to an unzipped partial (ie: './routes.txt'),
 * or a readable stream representing the file contents.
 * @param partialName If partialFile is a stream, provide the name of the file
 * here (ie: 'routes').
 * @param destination The database to save results to, or a path to it.
 */
export function parseGTFSPartial(
	partialFile: string,
	destination: string | PouchDB.Database<any>,
): Promise<void>
export function parseGTFSPartial(
	partialFile: NodeJS.ReadableStream,
	partialName: string,
	destination: string | PouchDB.Database<any>,
): Promise<void>
export function parseGTFSPartial(
	partialFile: string | NodeJS.ReadableStream,
	partialName: string | PouchDB.Database<any>,
	destination?: string | PouchDB.Database<any>,
): Promise<void> {
	let outputDB: PouchDB.Database<any>;
	if (destination) {
		if (typeof destination === 'string') outputDB = new PouchDB(destination);
		else outputDB = destination;
	} else {
		if (typeof partialName === 'string') outputDB = new PouchDB(partialName);
		else outputDB = partialName;
	}

	let name: string;
	if (typeof partialFile === 'string') {
		name = basename(partialFile, '.txt');
	} else if (destination) {
		if (typeof partialName !== 'string')
			throw new TypeError('partialName must be a string');
		name = partialName;
	} else {
		if (typeof destination !== 'string')
			throw new TypeError('partialName must be a string');
		name = destination;
	}

	return portPartial(partialFile, name, outputDB);
}

/**
 * Parses a GTFS zip file and saves the data into multiple PouchDB databases.
 * @param inputFile Either a path to a GTFS file or folder, or a stream/buffer
 * representing zip contents
 * @param destinations Either a path to a folder containing the databases, or
 * an object specifying paths for each database explicitly.
 */
export async function parseGTFS(
	inputFile: string | NodeJS.ReadableStream | Buffer,
	destinations: string | { [P in keyof DatabaseList]: DatabaseList[P] | string },
): Promise<void> {
	// Create a list of databases to save to
	const outputList = prepareOutputList(destinations);

	const inputIsPath = typeof inputFile === 'string';
	if (inputIsPath && (await isDirectory(inputFile as string))) {
		// inputFile is a path to a directory
		const folderPath = inputFile as string;

		// Create a set containing all files in the folder
		const folder = new Set(await readdir(folderPath));

		// Figure out which GTFS files exist in the folder, then convert them
		// to absolute paths
		let files: PortInputList = {};
		for (const name of databaseNames) {
			const filename = `${name}.txt`;
			if (folder.has(filename)) files[name] = join(folderPath, filename);
		}

		// Port each file and resolve when finished
		await portAll(files, outputList);
	} else {
		// Convert the object into a buffer
		let buffer: Buffer;
		if (inputIsPath) {
			// inputFile is a path to a ZIP file
			buffer = await readFile(inputFile as string, null);
		} else if (isStream(inputFile)) {
			// inputFile is a stream representing a ZIP file
			buffer = await toBuffer(inputFile as NodeJS.ReadableStream);
		} else {
			// inputFile is a buffer representing a ZIP file
			buffer = inputFile as Buffer;
		}

		// Read the zip buffer
		let zip = new JSZip();
		zip = await zip.loadAsync(buffer);

		// Extract all GTFS files from the zip folder, discarding null results
		let files: PortInputList = {};
		for (const name of databaseNames) {
			const file = zip.file(`${name}.txt`);
			if (file != null) files[name] = file;
		}

		await portAll(files, outputList);
	}
}
