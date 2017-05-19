import * as moment from 'moment';
import { trip } from '../dump/transformers';
import { Trip, StopTime, Calendar } from '../interfaces';
import { getDays, Weekdays } from './calendar';
import { extractDocs, removeItem } from './utils';

interface TripDetails {
	name: string
	dates: Set<Weekdays>
	direction: boolean
	times: moment.Range
	id: string
	trip_id: string
}

/**
 * Returns the name of the trip
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
		const allTrips = await tripDB.allDocs();

		const desiredTrips = allTrips.rows
			.map(row => row.id)
			.filter(id => trip(id).route_id === routeID);

		const trips = await tripDB.allDocs({
			keys: desiredTrips,
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
): (trip_id: string) => Promise<[moment.Moment,moment.Moment]|null> {
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

		return [earliest, latest];
	}
}

export function tripDetails(
	stopTimeDB: PouchDB.Database<StopTime>,
	calendarDB: PouchDB.Database<Calendar>,
): (trip: Trip) => Promise<TripDetails> {
	return async trip => {
		const name = tripName(trip);
		const { direction_id, _id, trip_id } = trip;

		// Start looking up the service days
		const [dates, range] = await Promise.all([
			getDays(calendarDB)(trip.service_id),
			tripTimes(stopTimeDB)(trip_id),
		]);

		if (!range) throw new Error(`No schedule provided for trip ${trip_id}`);

		return {
			name, dates,
			times: moment.range(range),
			direction: direction_id,
			id: _id, trip_id: trip_id,
		};
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
		const thisTripRange = moment.range(thisTripTime);

		// Remove the passed trip from this list
		removeItem(allTrips, t => t._id === trip._id);

		// Push trips into containers based on wheter they take place
		// before the passed trip or after
		type Result = { trip: Trip, range: moment.Range };
		let before: Result[] = [];
		let after: Result[] = [];
		await Promise.all(allTrips.map(async trip => {
			const times = await tripTimes(stopTimeDB)(trip.trip_id);
			if (!times) return;
			const range = moment.range(times);

			if (thisTripRange.overlaps(range)) return;
			else if (thisTripRange.start > range.end) before.push({ trip, range });
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
