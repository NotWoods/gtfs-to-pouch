# gtfs-to-pouch

Scripts to convert GTFS files to a PouchDB database,

Transit data is commonly stored in the GTFS format. This script can unzip it
and store it in PouchDB databases. These can later be queried with
[query-pouch-gtfs](https://www.npmjs.com/package/query-pouch-gtfs).

## API

```ts
function parseGTFS(
  inputFile: string | NodeJS.ReadableStream | Buffer,
  destinations: string | { [P in keyof DatabaseList]: DatabaseList[P] | string }
): Promise<void>;
```

Parses a GTFS zip file and saves the data into multiple PouchDB databases.

- **inputFile**: Either a path to a GTFS file or folder,
  or a stream/buffer representing zip contents
- **destinations**: Either a path to a folder containing the databases, or
  an object specifying paths for each database explicitly.

```ts
function parseGTFSPartial(
  partialFile: string,
  destination: string | PouchDB.Database<any>
): Promise<void>;
function parseGTFSPartial(
  partialFile: NodeJS.ReadableStream,
  partialName: string,
  destination: string | PouchDB.Database<any>
): Promise<void>;
```

Parses a single GTFS partial, rather than the entire ZIP file.

- **partialFile**: Either a path to an unzipped partial (ie: './routes.txt'),
  or a readable stream representing the file contents.
- **partialName**: If partialFile is a stream, provide the name of the file
  here (ie: 'routes').
- **destination**: The database to save results to, or a path to it.

## Command Line

Examples:

```
gtfs-to-pouch -i gtfs.zip -o ./gtfs-dbs
gtfs-to-pouch --output ./gtfs-dbs < gtfs.zip
gtfs-to-pouch --input ./gtfs-files -o ./gtfs-dbs
gtfs-to-pouch --partial -i ./routes.txt -o ./db/routes
```

Options:

```
--partial     Switches to partial mode. Allows for parsing a single GTFS text
              file, such as routes.txt, rather than the entire ZIP file.

-i, --input   Input path pointing to GTFS file or directory.
              Can also pipe from stdin.
-n, --name    Name of the GTFS partial. Only needed if both in partial mode
              and stdin is being used instead of input.
-o, --output  Output directory, relative to the current working directory.
              Should contain databases, or point to the database in partial mode.
-h, --help    Show help text
```
