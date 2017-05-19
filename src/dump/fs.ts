import * as denodeify from 'denodeify';
import { stat, readdir, readFile, Stats } from 'fs';

interface ReadFileAsync {
	(path: string, encoding: string): Promise<string>
	(path: string, encoding?: null): Promise<Buffer>
}

const statAsync: (path: string) => Promise<Stats> = denodeify(stat);
const readdirAsync: (path: string, encoding?: string) => Promise<string[]> = denodeify(readdir);
const readFileAsync: ReadFileAsync = <any> denodeify(readFile);

export {
	statAsync as stat,
	readdirAsync as readdir,
	readFileAsync as readFile,
}

/**
 * Checks if a path is a directory
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function isDirectory(path: string): Promise<boolean> {
	return (await statAsync(path)).isDirectory();
}

/**
 * Checks if a path exists
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function exists(path: string): Promise<boolean> {
	try {
		await statAsync(path);
		return true;
	} catch (err) {
		if (err.code === 'ENOENT') return false;
		throw err;
	}
}
