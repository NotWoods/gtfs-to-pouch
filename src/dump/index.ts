import { join } from 'path';
import isStream from 'is-stream';
import * as JSZip from 'jszip';
import { toBuffer } from 'promise-stream-utils';
import gtfsNames from '../filenames';
import { readdir, isDirectory, readFile } from './fs';
import createOutputDump from './create-dump';

export type DataType = string | NodeJS.ReadableStream | Buffer;

const filenames = gtfsNames.map(name => `${name}.txt`);

/**
 * Parse a GTFS zip file and convert it to PouchDB dumpfiles, saved in the
 * output directory.
 * @param {string|stream.Readable|Buffer} data - either
 * a path to the GTFS file,
 * or a stream/buffer representing the zip contents
 * @param {string} outputDir - path to the output directory
 */
export async function parseZipFile(data: DataType, outputDir: string) {
	// Convert the object into a buffer
	let buffer: Buffer;
	if (typeof data === 'string') {
		buffer = await readFile(data, null);
	} else if (isStream(data)) {
		buffer = await toBuffer(data as NodeJS.ReadableStream);
	} else {
		buffer = data as Buffer;
	}

	// Read the zip buffer
	let zip = new JSZip();
	zip = await zip.loadAsync(buffer);

	// Extract all GTFS files from the zip folder, discarding null results
	const files = filenames
		.map(name => zip.file(name))
		.filter(obj => obj != null);

	// Call `createOutputDump` on each file then resolve when all are finished
	await Promise.all(files.map(file => createOutputDump(file, outputDir)));
}

/**
 * Parse a GTFS folder and convert each text file into a PouchDB dumpfile.
 * All files are saved in the output directory
 * @param {string} folderPath - path to the GTFS folder
 * @param {string} outputDir - path to the output directory
 */
export async function parseFolder(folderPath: string, outputDir: string) {
	// Create a set containing all files in the folder
	const folder = new Set(await readdir(folderPath));
	// Figure out which GTFS files exist in the folder, then convert them
	// to absolute paths
	const files = filenames
		.filter(name => folder.has(name))
		.map(name => join(folderPath, name));

	// Call `createOutputDump` on each file then resolve when all are finished
	await Promise.all(files.map(file => createOutputDump(file, outputDir)));
}

/**
 * Uses either `parseFolder` or `parseZipFile` depending on the file type
 * @param {string|Buffer|stream.Readable} data - either a
 * path to a GTFS file or folder,
 * or a stream/buffer representing zip contents
 * @param {string} outputDir - path to the output directory
 */
export default async function parseGTFS(data: DataType, outputDir: string) {
	if (typeof data === 'string' && (await isDirectory(data))) {
		await parseFolder(data, outputDir);
	} else {
		await parseZipFile(data, outputDir);
	}
}
