import * as moment from 'moment';
import 'moment-range';
import { trip } from '../uri';
import { Trip, StopTime } from '../interfaces';
import { getTripSchedule, scheduleRange } from './stop_times';
import { extractDocs, removeItem, timeOnly, notFound } from './utils';

/**
 * Get a trip based on its `trip_id`, which is different from the `_id`
 * used in the database. Providing a `route_id` will speed up the lookup.
 */
export function getTrip(
	tripDB: PouchDB.Database<Trip>
): (trip_id: string, route_id?: string) => Promise<Trip> {
	return async (tripID, routeID) => {
		if (routeID) {
			// If we know the route ID, the ID is easily generated
			const { rows } = await tripDB.allDocs({
				startkey: `trip/${routeID}/${tripID}/`,
				endkey: `trip/${routeID}/${tripID}/\uffff`,
				limit: 1,
				include_docs: true,
			});

			if (rows.length === 0) throw notFound('missing');
			return rows[0].doc;
		} else {
			// Otherwise look for the specific trip in an ID list
			const trips = await tripDB.allDocs({
				startkey: 'trip/',
				endkey: 'trip/\uffff',
			});

			const desiredRow = trips.rows.find(row => trip(row.id).trip_id === tripID);
			// If not found, throw an error
			if (!desiredRow) throw notFound('missing');
			return tripDB.get(desiredRow.id);
		}
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
 * a moment range.
 */
export function tripTimes(
	stopTimeDB: PouchDB.Database<StopTime>,
): (trip_id: string) => Promise<moment.Range> {
	return async id => scheduleRange(await getTripSchedule(stopTimeDB)(id));
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

		const ranges = times
			.map((time, index) => ({ time, _id: trips.rows[index].id }))
			.filter(range => {
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
