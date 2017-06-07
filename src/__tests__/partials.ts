import { Readable } from 'stream';
import { Agency, Stop } from 'query-pouch-gtfs';
import * as PouchDB from 'pouchdb';
import * as memoryAdapter from 'pouchdb-adapter-memory';
import { parseGTFSPartial } from '../gtfs-to-pouch';

PouchDB.plugin(memoryAdapter);

test('parses agency partial', async () => {
	const stream = new Readable();
	stream.push([
		'agency_name,agency_url,agency_timezone',
		'Hele-On Bus,http://heleonbus.org,Pacific/Honolulu',
	].join(''));
	stream.push(null);
	const db = new PouchDB<Agency>('agency', { adapter: 'memory' })

	await parseGTFSPartial(stream, 'agency', db);

	// Should return an object with the correct properties
	expect(await db.get('Hele-On Bus')).toBe(expect.objectContaining({
		agency_name: 'Hele-On Bus',
		agency_url: 'http://heleonbus.org',
		agency_timezone: 'Pacific/Honolulu',
	}));

	// There shouldn't be some other agency
	expect(await db.get('TransLink')).toThrow();

	// Should be the only entry (other than design docs)
	const { rows } = await db.allDocs({});
	expect(rows.filter(row => !row.id.startsWith('_design')).length)
		.toBe(1);
});

test('parses stops partial', async () => {
	const stream = new Readable();
	stream.push([
		'stop_id,stop_name,stop_lat,stop_lon',
		'bd,Banyan Drive,19.727129,-155.067175',
		'hc,Hilo International Airport,19.714476,-155.039845',
	].join(''));
	stream.push(null);
	const db = new PouchDB<Stop>('stops', { adapter: 'memory' })

	await parseGTFSPartial(stream, 'stops', db);

	// Should return an object with the correct properties
	expect(await db.get('stop/bd/[-155.067175,19.727129]'))
		.toBe(expect.objectContaining({
			stop_id: 'bd',
			stop_name: 'Banyan Drive',
			stop_lat: 19.727129,
			stop_lon: -155.067175,
		}));

	// Should be the only entry (other than design docs)
	const { rows } = await db.allDocs({});
	expect(rows.filter(row => !row.id.startsWith('_design')).length)
		.toBe(2);
});
