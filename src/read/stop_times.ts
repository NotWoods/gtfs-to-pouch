import * as moment from 'moment';
import { stopTime, trip } from '../uri'
import { StopTime, Trip } from '../interfaces';
import { extractDocs, timeOnly, notFound } from './utils';

/**
 * Gets a stop time from the database
 */
export function getStopTime(
	db: PouchDB.Database<StopTime>
): (trip_id: string, stop_id: string, stop_sequence: number) => Promise<StopTime> {
	return (trip_id, stop_id, stop_sequence) =>
		db.get(stopTime({ trip_id, stop_id, stop_sequence: String(stop_sequence) }))
}

/**
 * Get the stop times associated with a trip, sorted by stop_sequence.
 * Throws 404 error if no schedule is found.
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

		const result = extractDocs(times);
		if (result.length === 0) throw notFound('missing trip schedule');
		return result;
	}
}

/**
 * Returns stop times associated to a stop
 */
export function stopTimesForStop(
	stopTimeDB: PouchDB.Database<StopTime>
): (stop_id: string) => Promise<StopTime[]> {
	return async stopID => {
		const allStopTimes = await stopTimeDB.allDocs({
			startkey: 'time/',
			endkey: 'time/\uffff',
		});

		const desiredStopTimes = allStopTimes.rows
			.map(row => row.id)
			.filter(id => stopTime(id).stop_id === stopID);

		const times = await stopTimeDB.allDocs({
			keys: desiredStopTimes,
			include_docs: true,
		});

		return extractDocs(times);
	}
}

/**
 * Returns the first and last stop in a trip's schedule.
 * Throws if there is no schedule for the trip.
 */
export function firstAndLastStop(
	db: PouchDB.Database<StopTime>
): (trip_id: string) => Promise<{ first_stop_id: string, last_stop_id: string }> {
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

		// If the schedule is empty, throw an error.
		if (ids.length === 0) notFound('missing schedule for trip');

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

/**
 * Returns the next stop that will be reached based on a
 * list of stop times. Throws if the list is empty.
 */
export function nextStopFromList(
	stopTimes: StopTime[], now = moment()
): StopTime {
	if (stopTimes.length === 0) throw new Error('No stop times provided');
	const nowTime = timeOnly(now);

	let closestStop: StopTime | null = null;
	for (const stopTime of stopTimes) {
		const time = moment(stopTime.arrival_time, 'H:mm:ss');
		if (time < nowTime) continue;

		if (!closestStop) closestStop = stopTime;
		else if (time < moment(closestStop.arrival_time)) closestStop = stopTime;
	}

	return <StopTime> closestStop;
}

export function nextStopOfTrip(
	db: PouchDB.Database<StopTime>
): (trip_id: string, now?: moment.Moment) => Promise<StopTime> {
	return async (tripID, now) => {
		const list = await getTripSchedule(db)(tripID);
		return nextStopFromList(list, now);
	}
}

export function nextStopOfRoute(
	tripDB: PouchDB.Database<Trip>,
	stopTimeDB: PouchDB.Database<StopTime>,
): (route_id: string, now?: moment.Moment) => Promise<StopTime> {
	return async (routeID, now) => {
		const allTrips = await tripDB.allDocs();

		const desiredTrips = allTrips.rows
			.filter(row => trip(row.id).route_id === routeID)
			.map(row => trip(row.id).trip_id);

		const getSchedule = getTripSchedule(stopTimeDB);
		let schedules: StopTime[] = [];
		await Promise.all(desiredTrips.map(async trip_id => {
			const subSchedule = await getSchedule(trip_id);
			schedules.push(...subSchedule);
		}));

		return nextStopFromList(schedules, now);
	}
}
