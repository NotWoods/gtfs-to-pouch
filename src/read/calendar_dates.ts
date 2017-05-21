import * as moment from 'moment';
import { Duration, Moment } from 'moment';
import { calendarDate } from '../uri';
import { CalendarDate } from '../interfaces';
import { extractDocs } from './utils';

/**
 * Gets a specific calendar date object from the database
 */
export function getCalendarDate(
	db: PouchDB.Database<CalendarDate>
): (service_id: string, date: string | moment.Moment) => Promise<CalendarDate> {
	/** @param date Either a moment, or a string in the YYYYMMDD format */
	return (service_id, date) => {
		// Convert the moment into a date string
		if (typeof date !== 'string') {
			date = date.format('YMMDD');
		}

		return db.get(calendarDate({ service_id, date }))
	}
}

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
	/**
	 * @param duration A moment duration, defaults to 1 month
	 * @param now The current time. Can be overriden.
	 */
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
