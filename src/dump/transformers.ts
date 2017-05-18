import { route } from 'docuri';

interface Doc {
	_id: string
	[prop: string]: string
}

interface DocURI<T = any> {
	(str: string): T
	(obj: object): string
	(str: string, obj: T): string
}

type StopTime = { trip_id: string, stop_id: string, stop_sequence: string };
type Frequency = { trip_id: string, start_time: string, end_time: string };
type Transfer = { trip_id: string, stop_id: string };
type CalendarDate = { trip_id: string, stop_id: string };

export const stopTime: DocURI<StopTime> = route('time/:trip_id/:stop_id/:stop_sequence');
export const frequency: DocURI<Frequency> = route('frequency/:trip_id/:start_time/:end_time');
export const transfer: DocURI<Transfer> = route('transfer/:from_stop_id/:to_stop_id');
export const calendarDate: DocURI<CalendarDate> = route('exception/:service_id/:date');

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
