import * as moment from 'moment';
import 'moment-range';
import { trip } from '../uri';
import { Trip, StopTime } from '../interfaces';
import { getTripSchedule } from './stop_times';
import { extractDocs, removeItem, timeOnly } from './utils';

/**
 * Get a trip based on its `trip_id`, which is different from the `_id`
 * used in the database. Providing a `route_id` will speed up the lookup.
 */
export function getTrip(
	tripDB: PouchDB.Database<Trip>
): (trip_id: string, route_id?: string) => Promise<Trip> {
	return async (trip_id, route_id) => {
		let desiredDocID: string;
		if (route_id) {
			// If we know the route ID, the ID is easily generated
			desiredDocID = trip({ trip_id, route_id });
		} else {
			// Otherwise look for the specific trip in an ID list
			const trips = await tripDB.allDocs({
				startkey: 'trip/',
				endkey: 'trip/\uffff',
			});

			const desiredRow = trips.rows.find(row => trip(row.id).trip_id === trip_id);
			// If not found, just let PouchDB throw an error
			desiredDocID = desiredRow ? desiredRow.id : '';
		}

		return tripDB.get(desiredDocID);
	}
}

/**
 * Returns the name of the trip. Uses trip_short_name or trip_headsign,
 * and returns an empty string if neither are avaliable
 */
export function tripName(trip: Trip): string {
	return trip.trip_short_name || trip.trip_headsign || '';
}

/**
 * Get every single trip that is a child of a route
 */
export function allTripsForRoute(
	tripDB: PouchDB.Database<Trip>
): (route_id: string) => Promise<Trip[]> {
	return async routeID => {
		const trips = await tripDB.allDocs({
			startkey: `trip/${routeID}/`,
			endkey: `trip/${routeID}/\uffff`,
			include_docs: true,
		});

		return extractDocs(trips);
	}
}

/**
 * Finds the earliest and latest time in the trip's schedule and returns
 * an array representing a range. If the schedule is empty, null is
 * returned instead.
 */
export function tripTimes(
	stopTimeDB: PouchDB.Database<StopTime>,
): (trip_id: string) => Promise<moment.Range|null> {
	return async tripID => {
		const schedule = await getTripSchedule(stopTimeDB)(tripID);
		// Return null if the schedule is empty
		if (schedule.length === 0) return null;

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
}

/**
 * Gets the trip that is currently running in a route. If none are running,
 * the first trip is returned instead. If some are running, the earliest current
 * trip is returned.
 */
export function currentTrip(
	tripDB: PouchDB.Database<Trip>,
	stopTimeDB: PouchDB.Database<StopTime>,
): (route_id: string, now?: moment.Moment) => Promise<Trip> {
	return async (routeID, now = moment()) => {
		const trips = await tripDB.allDocs({
			startkey: `trip/${routeID}/`,
			endkey: `trip/${routeID}/\uffff`,
		});

		const nowTime = timeOnly(now);

		const getTimes = tripTimes(stopTimeDB);
		const times = await Promise.all(trips.rows.map(
			t => getTimes(trip(t.id).trip_id)
		));

		const ranges = <{ time: moment.Range, _id: string }[]> times
			.map((time, index) => ({ time, _id: trips.rows[index].id }))
			.filter(range => {
				if (range.time === null) return false;
				const { start, end } = range.time;
				return start > nowTime && end < nowTime;
			});

		let desiredID: string;
		if (ranges.length === 0) desiredID = trips.rows[0].id;
		else {
			const [earliest] = ranges.sort(
				(a, b) => a.time[0].valueOf() - b.time[0].valueOf()
			);
			desiredID = earliest._id;
		}

		return tripDB.get(desiredID);
	}
}

/**
 * Gets the previous and following trips in this trip's route;
 * that is, the trip that took place immediately before and immediately
 * after.
 */
export function siblingTrips(
	tripDB: PouchDB.Database<Trip>,
	stopTimeDB: PouchDB.Database<StopTime>,
): (trip: Trip) => Promise<{ previous: Trip|null, following: Trip|null }> {
	return async trip => {
		const [thisTripTime, allTrips] = await Promise.all([
			tripTimes(stopTimeDB)(trip.trip_id),
			allTripsForRoute(tripDB)(trip.route_id),
		]);

		// Must have some times to compare to
		if (!thisTripTime) return { previous: null, following: null };

		// Remove the passed trip from this list
		removeItem(allTrips, t => t._id === trip._id);

		// Push trips into containers based on wheter they take place
		// before the passed trip or after
		type Result = { trip: Trip, range: moment.Range };
		let before: Result[] = [];
		let after: Result[] = [];
		await Promise.all(allTrips.map(async trip => {
			const range = await tripTimes(stopTimeDB)(trip.trip_id);
			if (!range) return;

			if (thisTripTime.overlaps(range)) return;
			else if (thisTripTime.start > range.end) before.push({ trip, range });
			else after.push({ trip, range });
		}));

		// Sort the arrays then get the items adjacent to the passed trip
		before.sort((a, b) => a.range.end.valueOf() - b.range.end.valueOf());
		after.sort((a, b) => a.range.start.valueOf() - b.range.start.valueOf());

		const lastBefore = before[before.length - 1];
		const firstAfter = after[0];

		return {
			previous: lastBefore ? lastBefore.trip : null,
			following: firstAfter ? firstAfter.trip : null,
		};
	}
}
