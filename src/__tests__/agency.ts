import { Readable } from "stream";
import { Agency } from "query-pouch-gtfs/es/interfaces";
import * as PouchDB from "pouchdb";
import * as memoryAdapter from "pouchdb-adapter-memory";
import { parseGTFSPartial } from "../gtfs-to-pouch";

PouchDB.plugin(memoryAdapter);

let stream: Readable;
let db: PouchDB.Database<Agency>;

beforeEach(() => {
  stream = new Readable();
  stream.push(
    [
      "agency_name,agency_url,agency_timezone",
      "Hele-On Bus,http://heleonbus.org,Pacific/Honolulu",
    ].join("\n")
  );
  stream.push(null);

  db = new PouchDB("agency", { adapter: "memory" });
});

test("sees correct number of rows", async () => {
  await parseGTFSPartial(stream, "agency", db);

  // Should be the only entry (other than design docs)
  const { rows } = await db.allDocs({});
  const withoutDesignDocs = rows.filter((row) => !row.id.startsWith("_design"));

  expect(withoutDesignDocs.length).toBe(1);
});

test("Correctly creates object", async () => {
  await parseGTFSPartial(stream, "agency", db);

  // Should return an object with the correct properties
  expect(await db.get("Hele-On Bus")).toEqual({
    _id: "Hele-On Bus",
    _rev: expect.any(String),
    agency_name: "Hele-On Bus",
    agency_url: "http://heleonbus.org",
    agency_timezone: "Pacific/Honolulu",
  });
});
