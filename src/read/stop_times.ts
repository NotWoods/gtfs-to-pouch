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

		if (times.total_rows === 0) throw notFound('missing trip schedule');
		return extractDocs(times);
	}
}

/**
 * Returns stop times associated to a stop
 */
export function stopTimesForStop(
	stopTimeDB: PouchDB.Database<StopTime>
): (stop_id: string) => Promise<StopTime[]> {
	return async stopID => {
		// Get every single stop time
		const allStopTimes = await stopTimeDB.allDocs({
			startkey: 'time/',
			endkey: 'time/\uffff',
		});

		// Filter out just the stop times that go to the correct stop
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

		// Get the IDs, sorted by stop sequence
		const ids = times.rows.map(row => row.id)

		// If the schedule is empty, throw an error.
		if (ids.length === 0) throw notFound('missing schedule for trip');

		// Get the first and last stop times in the schedule
		const endpoints = await db.allDocs({
			include_docs: true,
			keys: [ids[0], ids[ids.length - 1]],
		});

		const [{ doc: first }, { doc: last }] = endpoints.rows;
		if (!first || !last) throw notFound('endpoints may have been deleted');

		return {
			first_stop_id: first.stop_id,
			last_stop_id: last.stop_id,
		};
	}
}

/**
 * Returns the next stop that will be reached based on a
 * list of stop times. Throws if the list is empty.
 * If all times in the schedule are earlier than the current time,
 * the first item in the schedule is returned.
 */
export function nextStopFromList(
	stopTimes: StopTime[], now = moment()
): StopTime {
	if (stopTimes.length === 0) throw new Error('No stop times provided');
	const nowTime = timeOnly(now);

	let earliestStop: StopTime | null = null;
	for (const stopTime of stopTimes) {
		const time = moment(stopTime.arrival_time, 'H:mm:ss');
		// Skip if earlier than the current time
		if (time < nowTime) continue;

		// If this stop time is earlier than the current earliestStop,
		// update earliestStop with a new value
		if (!earliestStop) earliestStop = stopTime;
		else if (time < moment(earliestStop.arrival_time)) earliestStop = stopTime;
	}

	if (!earliestStop) earliestStop = stopTimes[0];
	return earliestStop;
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
		const routeTrips = await tripDB.allDocs({
			startkey: `trip/${routeID}/`,
			endkey: `trip/${routeID}/\uffff`,
		});

		const desiredTrips = routeTrips.rows
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

/**
 * Returns a moment range representing the first and last time in a set of
 * stop times.
 */
export function scheduleRange(schedule: Iterable<StopTime>): moment.Range {
	let earliest = moment(Number.POSITIVE_INFINITY);
	let latest = moment(0);
	for (const time of schedule) {
		const start = moment(time.arrival_time, 'H:mm:ss');
		const end = moment(time.departure_time, 'H:mm:ss');

		if (start < earliest) earliest = start;
		if (end > latest) latest = end;
	}

	return moment.range(earliest, latest);
}
