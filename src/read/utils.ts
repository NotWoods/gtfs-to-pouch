import * as moment from 'moment';

/**
 * Converts a result from `db.allDocs` to an array of documents, skipping
 * any delelted or errored documents
 */
export function extractDocs<T>(result: PouchDB.Core.AllDocsResponse<T>): T[] {
	return result.rows.reduce((docs, row) => {
		if (row.doc) docs.push(row.doc);
		return docs;
	}, [] as T[]);
}

/**
 * Removes an item from an array
 * @param array array that will be changed
 * @param func the first item that returns true will be removed
 */
export function removeItem<T>(array: T[], func: (T) => boolean): void {
	const index = array.findIndex(func);
	if (index === -1) return;
	array.splice(index, 1);
}

/**
 * Sets the date of a moment to zero, leaving only the hour and
 * smaller units
 */
export function timeOnly(base: moment.Moment): moment.Moment {
	return moment(0).set({
		hour: base.hour(),
		minute: base.minute(),
		second: base.second(),
		millisecond: base.millisecond(),
	});
}
