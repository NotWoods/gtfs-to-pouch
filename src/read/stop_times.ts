import { StopTime } from '../interfaces';
import { extractDocs } from './utils';

/**
 * Get the stop times associated with a trip
 */
export function getTripSchedule(
	stopTimeDB: PouchDB.Database<StopTime>
): (trip_id: string) => Promise<StopTime[]> {
	return async tripID => {
		const times = await stopTimeDB.allDocs({
			include_docs: true,
			startkey: `time/${tripID}/`,
			endkey: `time/${tripID}/\uffff`,
		});

		return extractDocs(times);
	}
}

type FirstLastResult = { first_stop_id: string, last_stop_id: string };

/**
 * Returns the first and last stop in a trip's schedule.
 * Returns null if there is no schedule for the trip.
 */
export function firstAndLastStop(
	db: PouchDB.Database<StopTime>
): (trip_id: string) => Promise<FirstLastResult|null> {
	return async tripID => {
		const times = await db.allDocs({
			startkey: `time/${tripID}/`,
			endkey: `time/${tripID}/\uffff`,
		});

		// Sort the IDs by stop sequence
		const ids = times.rows
			.filter(row => !row.value.deleted)
			.map(row => row.id)
			.sort();

		// If the schedule is empty, return null.
		if (ids.length === 0) return null;

		const firstID = ids[0];
		const lastID = ids[ids.length - 1];
		const [first, last] = await Promise.all([
			db.get(firstID), db.get(lastID)
		]);

		return {
			first_stop_id: first.stop_id,
			last_stop_id: last.stop_id,
		};
	}
}
