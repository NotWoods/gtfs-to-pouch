# gtfs-to-pouch
Converts a GTFS file to PouchDB dumpfiles.

## API

```ts
function parseGTFS(data: DataType, outputDir: string): Promise<void>
```
- **data**: either a path to a GTFS file or folder, or a stream/buffer representing zip contents
- **outputDir**: path to the output directory

## Command Line

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
