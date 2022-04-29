#!/usr/bin/env/node
import { promises as fs } from "fs";
import * as parseArgs from "minimist";
import { extname, join } from "path";
import { parseGTFS, parseGTFSPartial } from "./gtfs-to-pouch";

export * from "./gtfs-to-pouch";

type Args = {
  input?: string;
  output?: string;
  partial?: boolean;
  name?: string;
  help?: boolean;
  stack?: boolean;
};

const helpText = `
Transit data is commonly stored in the GTFS format. This script can unzip it
and store it in PouchDB databases. These can later be queried with the
'query-pouch-gtfs' package.

--partial     Switches to partial mode. Allows for parsing a single GTFS text
              file, such as routes.txt, rather than the entire ZIP file.

-i, --input   Input path pointing to GTFS file or directory.
              Can also pipe from stdin.
-n, --name    Name of the GTFS partial. Only needed if both in partial mode
              and stdin is being used instead of input.
-o, --output  Output directory, relative to the current working directory.
              Should contain databases, or point to the database in partial mode.
-h, --help    Show help text
`;

if (require.main === module) {
  // Read arguments
  const { partial, input, output, name, help, stack } = parseArgs(
    process.argv,
    {
      alias: {
        i: "input",
        o: "output",
        n: "name",
        h: "help",
      },
      string: ["input", "output", "name"],
      boolean: ["help", "stack", "partial"],
    }
  ) as Args;

  (async () => {
    if (help) {
      console.log(helpText);
      return;
    }

    // Output options is required
    if (!output) throw new Error("Missing --output option");

    // True if piping in (example: `gtfs-to-pouch < gtfs.zip`)
    const hasDataStreamedIn = !process.stdin.isTTY;

    if (partial) {
      const db = new PouchDB(output);
      if (hasDataStreamedIn) {
        if (!name) throw new Error("Must specify --name or use --input");
        await parseGTFSPartial(process.stdin, name, db);
      } else if (input) {
        await parseGTFSPartial(join(process.cwd(), input), db);
      } else {
        // Either --input or stdin is required
        throw new Error("Missing --input path");
      }
    } else {
      const outputDir = join(process.cwd(), output);
      if (hasDataStreamedIn) {
        // Load from stdin
        await parseGTFS(process.stdin, outputDir);
      } else if (input) {
        // Check that the input string is either a zip file or directory
        const zipOrDirectory =
          extname(input) === ".zip" || (await fs.stat(input)).isDirectory();
        if (!zipOrDirectory) {
          throw new Error("Input path must be a zip file or directory");
        }

        await parseGTFS(input, outputDir);
      } else {
        // Either --input or stdin is required
        throw new Error("Missing --input path");
      }
    }

    console.log("Done");
    process.exit(0);
  })().catch((err) => {
    console.error(stack ? err : err.message);
    process.exit(1);
  });
}
