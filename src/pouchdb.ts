import * as PouchDB from 'pouchdb';
import { plugin, adapters } from 'pouchdb-replication-stream';
import * as memoryAdapter from 'pouchdb-adapter-memory'

PouchDB.plugin(memoryAdapter);
PouchDB.plugin(plugin);
PouchDB.adapter('writableStream', adapters.writableStream);

interface RepResult {
	ok: true
}

export interface ReplicatingDatabase<T> extends PouchDB.Database<T> {
	load(rs: NodeJS.ReadableStream): Promise<RepResult>
	dump(ws: NodeJS.WritableStream): Promise<RepResult>
}

export default PouchDB;
