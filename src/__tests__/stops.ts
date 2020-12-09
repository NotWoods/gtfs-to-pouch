import { Readable } from 'stream';
import { Stop } from 'query-pouch-gtfs/es/interfaces';
import * as PouchDB from 'pouchdb';
import * as memoryAdapter from 'pouchdb-adapter-memory';
import { parseGTFSPartial } from '../gtfs-to-pouch';

PouchDB.plugin(memoryAdapter);

let stream: Readable;
let db: PouchDB.Database<Stop>;

beforeEach(() => {
	stream = new Readable();
	stream.push([
		'stop_id,stop_name,stop_lat,stop_lon',
		'bd,Banyan Drive,19.727129,-155.067175',
		'hc,Hilo International Airport,19.714476,-155.039845',
	].join('\n'));
	stream.push(null);

	db = new PouchDB('stops', { adapter: 'memory' })
})

test('parses stops partial', async () => {
	await parseGTFSPartial(stream, 'stops', db);

	// Should be the only entry (other than design docs)
	const { rows } = await db.allDocs();
	const withoutDesignDocs = rows.filter(row => !row.id.startsWith('_design'));

	expect(withoutDesignDocs.length).toBe(2);
});

test('creates the correct _id', async () => {
	await parseGTFSPartial(stream, 'stops', db);

	const response = await db.allDocs({
		startkey: 'stop/bd/',
		endkey: 'stop/bd/\uffff',
	});

	const [stopRow] = response.rows;

	expect(stopRow).toBeDefined();
	expect(stopRow.id).toMatch(/stop\/bd\/[-0-9.]*\/[-0-9.]*/);
})

test('creates the correct object', async () => {
	await parseGTFSPartial(stream, 'stops', db);

	const response = await db.allDocs({
		startkey: 'stop/bd/',
		endkey: 'stop/bd/\uffff',
		include_docs: true,
	});
	const [stopRow] = response.rows;
	expect(stopRow).toBeDefined();

	const stop = stopRow.doc;

	// Should return an object with the correct properties
	expect(stop).toEqual({
		_id: expect.any(String),
		_rev: expect.any(String),
		stop_id: 'bd',
		stop_name: 'Banyan Drive',
		stop_lat: expect.any(Number),
		stop_lon: expect.any(Number),
	});

	expect(stop.stop_lat).toBeCloseTo(19.727129)
	expect(stop.stop_lon).toBeCloseTo(-155.067175)
})
