/**
 * Only get and allDocs are called by functions in the `read` folder.
 */
export class MockDB<T> {
	constructor(name: string) {

	}

	async get(id: string): Promise<T> {
		return <any> null;
	}

	async allDocs(options: PouchDB.Core.AllDocsOptions): Promise<PouchDB.Core.AllDocsResponse<T>> {
		return <any> null;
	}
}
