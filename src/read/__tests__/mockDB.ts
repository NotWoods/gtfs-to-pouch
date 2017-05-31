export type WithKey = PouchDB.Core.AllDocsWithKeyOptions;
export type WithKeys = PouchDB.Core.AllDocsWithKeysOptions;
export type WithinRange = PouchDB.Core.AllDocsWithinRangeOptions

/**
 * Only get and allDocs are called by functions in the `read` folder.
 */
export class MockDB<T extends { _id: string }> {
	private docs: Map<string, T>
	name: string;

	constructor(name: string) {
		this.name = name;
		this.docs = new Map();
	}

	async get(id: string): Promise<T> {
		const doc = this.docs.get(id);
		if (!doc) throw { status: 404, name: 'not_found', message: 'missing' };
		return doc;
	}

	async allDocs(
		options: WithKeys | WithinRange | WithKey
	): Promise<PouchDB.Core.AllDocsResponse<T>> {
		let total_rows = 0;

		let filterFunc: (doc: T, index: number) => boolean = () => true;
		if ((options as WithKeys).keys) {
			const keys = new Set((options as WithKeys).keys);
			filterFunc = doc => keys.has(doc._id);
		} else if ((options as WithinRange).startkey && (options as WithinRange).endkey) {
			const {
				startkey, endkey,
				inclusive_end = true
			} = options as WithinRange;

			if (inclusive_end !== false)
				filterFunc = doc => doc._id >= startkey && doc._id <= endkey;
			else
				filterFunc = doc => doc._id >= startkey && doc._id < endkey;
		} else if ((options as WithKey).key) {
			const { key } = options as WithKey;
			filterFunc = doc => doc._id === key;
		}

		if (options.skip) {
			const skip = options.skip;
			const noSkipFilter = filterFunc;
			filterFunc = (doc, index) => {
				if (index < skip) return false;
				return noSkipFilter(doc, index);
			}
		}

		let rows = Array.from(this.docs.values())
			.filter(filterFunc)
			.map(doc => {
				const meta = <any> { _id: doc._id, _rev: '1-xxx' };
				const row = {
					doc: <T & PouchDB.Core.AllDocsMeta> meta,
					id: doc._id,
					key: doc._id,
					value: { rev: '1-xxx' },
				};

				if (options.include_docs) Object.assign(row.doc, doc);
				return row;
			});

		if (options.limit) {
			rows = rows.slice(0, options.limit);
		}
		if (options.descending) {
			rows = rows.reverse();
		}

		return {
			offset: options.skip || 0,
			total_rows,
			rows,
		};
	}

	async bulkDocs(docs: T[]): Promise<PouchDB.Core.BasicResponse[]> {
		return docs.map(doc => {
			this.docs.set(doc._id, doc);

			return {
				ok: true,
				id: doc._id,
				rev: '1-xxx',
			};
		})
	}
}
