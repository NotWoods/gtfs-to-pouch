import { promisify } from 'util';
import { stat, readdir, readFile } from 'fs';

const statAsync = promisify(stat);
const readdirAsync = promisify(readdir);
const readFileAsync = promisify(readFile);

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
