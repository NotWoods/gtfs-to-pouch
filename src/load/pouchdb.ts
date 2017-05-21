import * as PouchDB from 'pouchdb';
import * as load from 'pouchdb-load';

PouchDB.plugin(load);

export interface LoadingDatabase<T> extends PouchDB.Database<T> {
	load(urlOrString: string): Promise<void>
}

export default PouchDB;
