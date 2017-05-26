import { extname, join } from 'path';
import * as parseArgs from 'minimist';
import { isDirectory } from './fs';
import parseGTFS from './index';

export * from './index';

type Args = {
	input?: string,
	output?: string,
	help?: boolean,
	stack?: boolean
};

const helpText = `
-i, --input   Input path pointing to GTFS file or directory.
              Can also pipe from stdin.
-o, --output  Output directory, relative to the current working directory
-h, --help    Show help text
`

if (require.main === module) {
	// Read arguments
	const { input, output, help, stack }: Args = parseArgs(process.argv, {
		alias: {
			i: 'input',
			o: 'output',
			h: 'help'
		},
		string: ['input', 'output'],
		boolean: ['help', 'stack'],
	});

	(async () => {
		if (help) {
			console.log(helpText);
			return;
		}

		// Output options is required
		if (!output) throw new Error('Missing --output option');
		const outputDir = join(process.cwd(), output);

		// True if piping in (example: `gtfs-to-pouch < gtfs.zip`)
		const hasDataStreamedIn = !process.stdin.isTTY;
		if (hasDataStreamedIn) {
			// Load from stdin
			await parseGTFS(process.stdin, outputDir);
		} else if (input) {
			// Check that the input string is either a zip file or directory
			const zipOrDirectory = extname(input) === '.zip' || (await isDirectory(input));
			if (!zipOrDirectory) throw new Error('Input path must be a zip file or directory');

			await parseGTFS(input, outputDir);
		} else {
			// Either --input or stdin is required
			throw new Error('Missing --input path');
		}

		console.log('Done');
		process.exit(0);
	})().catch(err => console.error(stack ? err : err.message));
}
