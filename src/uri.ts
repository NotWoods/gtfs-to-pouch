import { route } from 'docuri';

export interface DocURI<T> {
	(str: string): T
	(obj: T): string
	(str: string, obj: T): string
}

export const trip: DocURI<{
	trip_id: string, route_id: string
}> = route('trip/:route_id/:trip_id');

export const stopTime: DocURI<{
	trip_id: string, stop_id: string, stop_sequence: string
}> = route('time/:trip_id/:stop_id/:stop_sequence');

export const frequency: DocURI<{
	trip_id: string, start_time: string, end_time: string
}> = route('frequency/:trip_id/:start_time/:end_time');

export const transfer: DocURI<{
	from_stop_id: string, to_stop_id: string
}> = route('transfer/:from_stop_id/:to_stop_id');

export const calendarDate: DocURI<{
	service_id: string, date: string
}> = route('exception/:service_id/:date');
