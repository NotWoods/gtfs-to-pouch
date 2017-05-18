import { stopTime, trip } from '../dump/transformers';

interface Route {

}

interface Trip {

}

interface StopTime {

}

interface TripSummary {
	dates: Set<number>,
	heading: string,
	trip_id: string
}

export function listRoutes(db: PouchDB.Database<Route>): () => Promise<Route[]> {
	return async () => {
		const docs = await db.allDocs({ include_docs: true });
		return docs.rows.map(row => row.doc as Route);
	}
}

export function connectedRoutes(stopTimesDB: PouchDB.Database<StopTime>, tripsDB: PouchDB.Database<Trip>) {
	return async (stopID: string) => {
		const stopTimes = await stopTimesDB.allDocs();
		const tripIDs = new Set(stopTimes.rows
			.map(row => stopTime(row.id))
			.filter(data => data.stop_id === stopID)
			.map(data => data.trip_id));

		const trips = await tripsDB.allDocs({
			keys: Array.from(tripIDs),
			include_docs: true
		});

		trips.rows
			.filter(row => !row.value.deleted)
			.map(row => row.doc.route_id)
	}
}

export function routeDetails(db: PouchDB.Database<Route>) {
	return async (route_id: string) => {
		const route = await db.get(`route/${route_id}`);

		return {
			route_data: route,
			trips: [] as TripSummary[],
			dates: new Set<number>(),
		};
	}
}
