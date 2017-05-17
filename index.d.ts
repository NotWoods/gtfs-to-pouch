type DataType = string | NodeJS.ReadableStream | Buffer;

/**
 * Parse a GTFS zip file and convert it to PouchDB dumpfiles, saved in the
 * output directory.
 * @param data - either a path to the GTFS file,
 * or a stream/buffer representing the zip contents
 * @param outputDir - path to the output directory
 */
export async function parseZipFile(data: DataType, outputDir: string): Promise<void>

/**
 * Parse a GTFS folder and convert each text file into a PouchDB dumpfile.
 * All files are saved in the output directory
 * @param folderPath - path to the GTFS folder
 * @param outputDir - path to the output directory
 */
export async function parseFolder(folderPath: string, outputDir: string): Promise<void>

/**
 * Uses either `parseFolder` or `parseZipFile` depending on the file type
 * @param data - either a path to a GTFS file or folder,
 * or a stream/buffer representing zip contents
 * @param outputDir - path to the output directory
 */
export default async function parseGTFS(data: DataType, outputDir: string): Promise<void>
