import * as moment from 'moment';
import { Duration, Moment } from 'moment';
import { CalendarDate } from '../interfaces';
import { extractDocs } from './utils';

/**
 * Returns every exception for the given service ID
 */
export function allExceptions(
	db: PouchDB.Database<CalendarDate>
): (service_id: string) => Promise<CalendarDate[]> {
	return async serviceID => {
		const docs = await db.allDocs({
			include_docs: true,
			startkey: `exception/${serviceID}/`,
			endkey: `exception/${serviceID}/\uffff`,
		});

		return extractDocs(docs);
	}
}

/**
 * Returns exceptions for the following month, or a custom
 * duration instead.
 */
export function upcomingExceptions(
	db: PouchDB.Database<CalendarDate>
): (service_id: string, duration?: Duration, now?: Moment) => Promise<CalendarDate[]> {
	return async (serviceID, duration = moment.duration(1, 'month'), now) => {
		const start = moment(now).format('YMMDD');
		const end = moment(now).add(duration).format('YMMDD');

		const docs = await db.allDocs({
			include_docs: true,
			startkey: `exception/${serviceID}/${start}`,
			endkey: `exception/${serviceID}/${end}`,
		});

		return extractDocs(docs);
	}
}
