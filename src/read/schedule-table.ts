import { StopTime, Trip, Stop, Calendar } from '../interfaces';
import { trip } from '../uri';
import { getDays, daysToURI, Weekdays } from './calendar';
import { getTripSchedule, scheduleRange, stopTimesForStop } from './stop_times';
import { getStop } from './stops';
import { getTrip } from './trips';

export interface RouteTableRow {
	trip_id: string,
	schedule: Map<Stop, StopTime | null>
}

/**
 * Tool used to generate a table for a route's schedule.
 * Each row of the table corresponds to a different trip, sorted by the trip's
 * starting time. Each row contains the trip's trip_id, along with a schedule
 * map representing the values of a row in the table. Null values in the map
 * represent the bus skipping a bus stop that is reached by other trips.
 */
export function routeScheduleTable(
	tripDB: PouchDB.Database<Trip>,
	stopTimeDB: PouchDB.Database<StopTime>,
	stopDB: PouchDB.Database<Stop>,
): (route_id: string, direction_id: boolean | null) => Promise<RouteTableRow[]> {
	return async (routeID, directionID) => {
		// Get IDs of all trips in this route
		const tripData = await tripDB.allDocs({
			startkey: `trip/${routeID}/`,
			endkey: `trip/${routeID}/\uffff`,
		});

		// Convert the allDocs response into ids
		let tripIDs = tripData.rows.map(row => row.id)

		// Select only trips in the correct direction
		if (directionID) {
			const directionString = directionID ? '1' : '0';
			tripIDs = tripIDs.filter(id => trip(id).direction_id === directionString);
		}

		// Load stop times for all trips in the route,
		// then find every unique stop_id, and convert schedules to a map
		const stopIds = new Set<string>();
		const scheduleMaps: Map<string, StopTime>[] = [];

		const getSchedule = getTripSchedule(stopTimeDB);
		await Promise.all(tripIDs.map(async _id => {
			const scheduleMap = new Map<string, StopTime>();
			const schedule = await getSchedule(trip(_id).trip_id);
			for (const time of schedule) {
				stopIds.add(time.stop_id);
				scheduleMap.set(time.stop_id, time);
			}
			scheduleMaps.push(scheduleMap);
		}));

		// Load stop data for all the unique stop_ids
		const stopData = await Promise.all(Array.from(stopIds, getStop(stopDB)));

		let results: RouteTableRow[] = [];
		for (let i = 0; i < tripIDs.length; i++) {
			const trip_id = tripIDs[i];
			const times = scheduleMaps[i];

			const schedule = new Map<Stop, StopTime | null>();
			for (const stop of stopData) {
				const time = times.get(stop.stop_id);
				schedule.set(stop, time || null);
			}
			results.push({ trip_id, schedule });
		}

		// Sort using a map to cache results
		const startCache = new Map<RouteTableRow, number>();
		results = results.sort((a, b) => {
			let startA = startCache.get(a);
			let startB = startCache.get(b);
			if (!startA) {
				const scheduleA = <StopTime[]> Array.from(a.schedule.values()).filter(Boolean);
				startA = scheduleRange(scheduleA).start.valueOf();
				startCache.set(a, startA);
			}
			if (!startB) {
				const scheduleB = <StopTime[]> Array.from(b.schedule.values()).filter(Boolean);
				startB = scheduleRange(scheduleB).start.valueOf();
				startCache.set(b, startB);
			}

			return startA - startB;
		})

		return results;
	}
}

function sameItems<T>(arr1: T[], arr2: T[]): boolean {
	if (arr1 === arr2) return true;
	if (arr1.length !== arr2.length) return false;
	return arr1.every((item, i) => item === arr2[i]);
}

export interface StopTableEntry {
	route_id: string,
	service_days: {
		[day: number]: StopTime[]
	}
}

/**
 * Tool used to generate a table for a stop's schedule.
 * Each entry in the table represents a route that goes through the given stop,
 * and stop times are futher split up into different weekdays. If two
 * weekdays have an identical schedule, the same array object is used and can
 * be identified by using the === operator.
 */
export function stopScheduleTable(
	tripDB: PouchDB.Database<Trip>,
	stopTimeDB: PouchDB.Database<StopTime>,
	calendarDB: PouchDB.Database<Calendar>,
): (stop_id: string) => Promise<StopTableEntry[]> {
	return async stopID => {
		// Get all the stop times associated to the stop, then categorize them
		// based on the trip_id
		const times = await stopTimesForStop(stopTimeDB)(stopID);
		const map = times.reduce((map, time) => {
			const prev = map.get(time.trip_id) || [];
			prev.push(time);
			return map.set(time.trip_id, prev);
		}, new Map<string, StopTime[]>())

		const entries = new Map<string, StopTableEntry>();

		// For each trip ID
		const _getTrip = getTrip(tripDB);
		const _getDays = getDays(calendarDB);
		await Promise.all(Array.from(map, async ([trip_id, times]) => {
			// Get trip object and days set
			const trip = await _getTrip(trip_id);
			const days = await _getDays(trip.service_id);
			const { route_id } = trip;

			// Get a StopTableEntry from the set, and convert the weekdays set to a string
			const entry = entries.get(route_id) || { route_id, service_days: {} };

			// Add all the stop times to the array for these service days
			for (let day = 0; day < 7; day++) {
				if (!entry.service_days[day]) entry.service_days[day] = [];
				if (days.has(day)) entry.service_days[day].push(...times);
			}

			// Replace duplicate arrays with the same object, so that idential
			// service times can be easily identified across days
			for (let day = 0; day < 7; day++) {
				for (let j = day + 1; j < 7; j++) {
					if (sameItems(entry.service_days[day], entry.service_days[j])) {
						// Now, when the === operator is used between these arrays the
						// returned value will be true
						entry.service_days[j] = entry.service_days[day];
					}
				}
			}

			// Save the entry if newly created
			entries.set(route_id, entry);
		}));

		return Array.from(entries.values());
	}
}
