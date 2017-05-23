import { stopTime, trip } from '../uri';
import { Route, StopTime, Trip, Calendar } from '../interfaces';
import { allTripsForRoute } from './trips'
import { getDays, Weekdays } from './calendar';
import { extractDocs } from './utils'

/**
 * Returns the name string from the route. route_long_name is preferred,
 * and route_short_name is used as a fallback
 */
export function getRouteName(route: Route): string {
	return route.route_long_name || route.route_short_name;
}

/**
 * Get a route based on its `route_id`, which is different from the `_id`
 * used in the database
 */
export function getRoute(
	db: PouchDB.Database<Route>
): (route_id: string) => Promise<Route> {
	return routeID => db.get(`route/${routeID}`)
}

/**
 * Get every single route
 */
export function listRoutes(
	db: PouchDB.Database<Route>
): () => Promise<Route[]> {
	return async () => {
		const docs = await db.allDocs({ include_docs: true });
		return extractDocs(docs);
	}
}

/**
 * Get every route that connects to a given stop
 */
export function connectedRoutes(
	stopTimesDB: PouchDB.Database<StopTime>,
	tripsDB: PouchDB.Database<Trip>,
	routesDB: PouchDB.Database<Route>,
): (stop_id: string) => Promise<Route[]> {
	return async stopID => {
		const allTripsReady = tripsDB.allDocs({
			startkey: 'trip/',
			endkey: 'trip/\uffff',
		});

		// Get the unique trips that pass the given stop
		const stopTimes = await stopTimesDB.allDocs({
			startkey: 'time/',
			endkey: 'time/\uffff',
		});
		const tripIDs = new Set<string>();
		for (const time of stopTimes.rows) {
			const { trip_id, stop_id } = stopTime(time.id);
			if (stop_id === stopID) tripIDs.add(trip_id);
		}

		// Find all the routes that the trips belong to
		const allTrips = await allTripsReady;
		const routeIDs = new Set<string>();
		for (const { id } of allTrips.rows) {
			const { trip_id, route_id } = trip(id);
			if (tripIDs.has(trip_id)) routeIDs.add(`route/${route_id}`);
		}

		// Now that the keys have been found, load the full documents
		const routes = await routesDB.allDocs({
			keys: Array.from(routeIDs),
			include_docs: true,
		});

		return extractDocs(routes);
	}
}

/**
 * Returns all days of the week that a route is active on
 */
export function routeDays(
	tripDB: PouchDB.Database<Trip>,
	calendarDB: PouchDB.Database<Calendar>,
): (route_id: string) => Promise<Set<Weekdays>> {
	return async routeID => {
		const trips = await allTripsForRoute(tripDB)(routeID);

		const dates = new Set<Weekdays>();
		await Promise.all(trips.map(async trip => {
			const subDates = await getDays(calendarDB)(trip.service_id);
			subDates.forEach(dates.add, dates);
		}));

		return dates;
	}
}
