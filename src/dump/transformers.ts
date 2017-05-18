import { route } from 'docuri';

interface Doc {
	_id: string
	[prop: string]: string
}

interface DocURI {
	(str: string): any
	(obj: object): string
	(str: string, obj: object): string
}

const stopTime: DocURI = route('time/:trip_id/:stop_id');
const frequency: DocURI = route('frequency/:trip_id/:start_time/:end_time');
const transfer: DocURI = route('transfer/:from_stop_id/:to_stop_id');
const calendarDate: DocURI = route('exception/:service_id/:date');

interface IDGetters {
	[name: string]: (doc: Doc) => string
}

export const idGetters: IDGetters = {
	agency: doc => doc.agency_id,
	stops: doc => doc.stop_id,
	routes: doc => `route/${doc.route_id}`,
	trips: doc => doc.trip_id,
	stop_times: stopTime,
	calendar: doc => doc.service_id,
	fare_attributes: doc => doc.fare_id,
	shapes: doc => doc.shape_id,
	frequencies: frequency,
	transfers: transfer,
	feed_info: doc => doc.feed_publisher_name,
	calendar_dates: calendarDate,
	fare_rules(doc) {
		const prefix = `rule/${doc.fare_id}/`;
		const ids = ['route', 'origin', 'destination', 'contains'].map(p => `${p}_id`);
		return prefix + ids.map(id => doc[id]).join(',');
	}
}

export function getGTFSNames() {
	return Object.keys(idGetters);
}
