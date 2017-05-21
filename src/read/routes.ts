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
		const allTripsReady = tripsDB.allDocs();

		// Get trips that pass the given stop
		const stopTimes = await stopTimesDB.allDocs();
		const tripIDs = new Set(stopTimes.rows
			.map(row => stopTime(row.id))
			.filter(data => data.stop_id === stopID)
			.map(data => data.trip_id));

		const allTrips = await allTripsReady;
		const desiredIDs = allTrips.rows
			.map(row => row.id)
			.filter(id => tripIDs.has(trip(id).trip_id));
		const trips = await tripsDB.allDocs({
			include_docs: true,
			keys: desiredIDs,
		});

		// Get routes that those trips belong to
		const routeIDs = new Set(trips.rows
			.filter(row => !row.value.deleted)
			.map(row => `route/${(row.doc as Trip).route_id}`));

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
