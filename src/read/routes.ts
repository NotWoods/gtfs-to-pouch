import { stopTime, trip } from '../dump/transformers';
import { Route, StopTime, Trip, Calendar } from '../interfaces';
import { allTripsForRoute } from './trips'
import { getDays, Weekdays } from './calendar';
import { extractDocs } from './utils'

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
 * Get route summaries for every single route
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

export interface RouteDetails {
	route_data: Route
	trips: Trip[]
	dates: Set<Weekdays>
}

export function routeDetails(
	routeDB: PouchDB.Database<Route>,
	tripDB: PouchDB.Database<Trip>,
	calendarDB: PouchDB.Database<Calendar>,
): (route_id: string) => Promise<RouteDetails> {
	return async routeID => {
		const [route_data, trips] = await Promise.all([
			routeDB.get(`route/${routeID}`),
			allTripsForRoute(tripDB)(routeID),
		]);

		const dates = new Set<Weekdays>();
		await Promise.all(trips.map(async trip => {
			const subDates = await getDays(calendarDB)(trip.service_id);
			subDates.forEach(dates.add, dates);
		}));

		return { route_data, trips, dates };
	}
}
