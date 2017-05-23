import * as PouchDB from 'pouchdb';
import { plugin, adapters } from 'pouchdb-replication-stream';
import * as memoryAdapter from 'pouchdb-adapter-memory'

PouchDB.plugin(memoryAdapter);
PouchDB.plugin(plugin);
(PouchDB as any).adapter('writableStream', adapters.writableStream);

export interface ReplicatingDatabase<T = any> extends PouchDB.Database<T> {
	load(rs: NodeJS.ReadableStream): Promise<{ ok: true }>
	dump(ws: NodeJS.WritableStream): Promise<{ ok: true }>
}

export default PouchDB;
