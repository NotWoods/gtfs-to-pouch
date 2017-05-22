import * as GTFS from '../interfaces';
import {
	trip, stopTime, frequency, transfer, calendarDate, shapePoint
} from '../uri';

function toInt(n: string) { return parseInt(n, 10); }

export type Transformer = (row: { [prop: string]: string }) => object & { _id: string }

export const transformers: { [name: string]: Transformer } = {
	agency(doc): GTFS.Agency {
		const agency: GTFS.Agency = <any> doc;
		agency._id = doc.agency_id || doc.agency_name;
		return agency;
	},
	stops(doc): GTFS.Stop {
		const stop: GTFS.Stop = <any> doc;
		stop._id = doc.stop_id;
		stop.stop_lat = parseFloat(doc.stop_lat);
		stop.stop_lon = parseFloat(doc.stop_lon);
		if (doc.location_type) stop.location_type = toInt(doc.location_type);
		if (doc.wheelchair_boarding) stop.wheelchair_boarding = toInt(doc.wheelchair_boarding);
		return stop;
	},
	routes(doc): GTFS.Route {
		const route: GTFS.Route = <any> doc;
		route._id = `route/${doc.route_id}`;
		route.route_type = toInt(doc.route_type);
		return route;
	},
	trips(doc): GTFS.Trip {
		const entry: GTFS.Trip = <any> doc;
		if (doc.direction_id) entry.direction_id = Boolean(doc.direction_id);
		{
			const { trip_id, route_id, direction_id } = entry;
			let directionString: string;
			switch (direction_id) {
				case true: directionString = '1'; break;
				case false: directionString = '0'; break;
				default: directionString = ''; break;
			}

			entry._id = trip({ trip_id, route_id, direction_id: directionString });
		}

		if (doc.wheelchair_accessible)
			entry.wheelchair_accessible = toInt(doc.wheelchair_accessible);
		if (doc.bikes_allowed) entry.bikes_allowed = toInt(doc.bikes_allowed);
		return entry;
	},
	stop_times(doc): GTFS.StopTime {
		const time: GTFS.StopTime = <any> doc;
		{
			const { trip_id, stop_id, stop_sequence } = time;
			time._id = stopTime({
				trip_id, stop_id, stop_sequence: String(stop_sequence)
			});
		}

		time.stop_sequence = toInt(doc.stop_sequence);
		if (doc.pickup_type) time.pickup_type = toInt(doc.pickup_type);
		if (doc.drop_off_type) time.drop_off_type = toInt(doc.drop_off_type);
		if (doc.shape_dist_traveled) time.shape_dist_traveled = parseFloat(doc.shape_dist_traveled);
		if (doc.timepoint) time.timepoint = Boolean(doc.timepoint);
		return time;
	},
	calendar(doc): GTFS.Calendar {
		const entry: GTFS.Calendar = <any> doc;
		entry._id = doc.service_id;
		entry.monday = Boolean(doc.monday);
		entry.tuesday = Boolean(doc.tuesday);
		entry.wednesday = Boolean(doc.wednesday);
		entry.thursday = Boolean(doc.thursday);
		entry.friday = Boolean(doc.friday);
		entry.saturday = Boolean(doc.saturday);
		entry.sunday = Boolean(doc.sunday);
		return entry;
	},
	fare_attributes(doc): GTFS.FareAttribute {
		const entry: GTFS.FareAttribute = <any> doc;
		entry._id = doc.fare_id;
		entry.payment_method = toInt(doc.payment_method);
		entry.transfers = toInt(doc.payment_method) || undefined;
		if (doc.transfer_duration) entry.transfer_duration = parseFloat(doc.transfer_duration);
		return entry;
	},
	shapes(doc): GTFS.Shape {
		const shape: GTFS.Shape = <any> doc;
		{
			const { shape_id, shape_pt_sequence } = shape;
			shape._id = shapePoint({
				shape_id, shape_pt_sequence: String(shape_pt_sequence),
			});
		}

		shape.shape_pt_lat = parseFloat(doc.shape_pt_lat);
		shape.shape_pt_lon = parseFloat(doc.shape_pt_lon);
		shape.shape_pt_sequence = toInt(doc.shape_pt_sequence);
		if (doc.shape_dist_traveled)
			shape.shape_dist_traveled = parseFloat(doc.shape_dist_traveled);
		return shape;
	},
	frequencies(doc): GTFS.Frequency {
		const entry: GTFS.Frequency = <any> doc;
		entry._id = frequency(entry);
		entry.headway_secs = parseFloat(doc.headway_secs);
		if (doc.exact_times) entry.exact_times = Boolean(doc.exact_times);
		return entry;
	},
	transfers(doc): GTFS.Transfer {
		const entry: GTFS.Transfer = <any> doc;
		entry._id = transfer(entry);
		entry.transfer_type = toInt(doc.transfer_type);
		if (doc.min_transfer_time)
			entry.min_transfer_time = parseFloat(doc.min_transfer_time);
		return entry;
	},
	feed_info(doc): GTFS.FeedInfo {
		const info: GTFS.FeedInfo = <any> doc;
		info._id = doc.feed_publisher_name;
		return info;
	},
	calendar_dates(doc): GTFS.CalendarDate {
		const date: GTFS.CalendarDate = <any> doc;
		date._id = calendarDate(date);
		date.exception_type = toInt(doc.exception_type);
		return date;
	},
	fare_rules(doc): GTFS.FareRule {
		const rule: GTFS.FareRule = <any> doc;
		const prefix = `rule/${doc.fare_id}/`;
		const ids = ['route', 'origin', 'destination', 'contains'].map(p => `${p}_id`);
		rule._id = prefix + ids.map(id => doc[id]).join(',');
		return rule;
	}
}
