# gtfs-to-pouch
Tools to work with GTFS schedules using PouchDB databases.

This library provides scripts to convert GTFS files to a PouchDB database,
and tools to query data from the databases after they are loaded.

## Create dumpfile
Convert a GTFS file to PouchDB dumpfiles. Exported from `'gtfs-to-pouch/dist/dump'`

Transit data is commonly stored in the GTFS format, and this script can
unzip it and store it in a PouchDB database dumpfile, which can be statically
hosted then loaded onto clients.

### API

```ts
function parseGTFS(data: DataType, outputDir: string): Promise<void>
```
- **data**: either a path to a GTFS file or folder, or a stream/buffer representing zip contents
- **outputDir**: path to the output directory

### Command Line

Examples:
```
gtfs-to-pouch -i gtfs.zip -o ./gtfs-dump
gtfs-to-pouch --output ./gtfs-dump < gtfs.zip
gtfs-to-pouch --input ./gtfs-files -o ./gtfs-dump
```

Options:
```
-i, --input   Input path pointing to GTFS file or directory.
              Can also pipe from stdin.
-o, --output  Output directory, relative to the current working directory
-h, --help    Show help text
```

## Load dumpfile
Loads all dumpfiles on the client. Exported from `'gtfs-to-pouch/dist/load'`

```ts
function loadAll(prefix?: string): Promise<{
	agency: PouchDB.Database<Agency>
	calendar: PouchDB.Database<Calendar>
	calendar_dates: PouchDB.Database<CalendarDate>
	fare_attributes: PouchDB.Database<FareAttribute>
	fare_rules: PouchDB.Database<FareRule>
	feed_info: PouchDB.Database<FeedInfo>
	frequencies: PouchDB.Database<Frequency>
	routes: PouchDB.Database<Route>
	shapes: PouchDB.Database<Shape>
	stops: PouchDB.Database<Stop>
	stop_times: PouchDB.Database<StopTime>
	transfers: PouchDB.Database<Transfer>
	trips: PouchDB.Database<Trip>
}>
```
- **prefix**: URL for the folder where the dumpfiles are stored. If omitted,
  the root of the server is assumed to be the folder.

## GTFS object interfaces
Typescript interfaces exported under `'gtfs-to-pouch/dist/interfaces'`.
