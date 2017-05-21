import { Stop } from '../interfaces';
import { extractDocs } from './utils'

export interface LatLng {
	lat: number
	lng: number
}

interface ReverseGeocodingResult {
	address_components: {
		long_name: string
		short_name: string
		types: string[]
	}[],
	formatted_address: string,
	geometry: {
		location: LatLng,
		location_type: 'ROOFTOP'|'RANGE_INTERPOLATED'|'GEOMETRIC_CENTER'|'APPROXIMATE',
		viewport: {
			northeast: LatLng
			southwest: LatLng
		},
	},
	place_id: string
	types: string[]
}

interface ReverseGeocodingResponse {
	results: ReverseGeocodingResult[]
}

/**
 * Looks up the address for a stop using Google Reverse Geocoding
 */
export function stopAddress(
	db: PouchDB.Database<Stop>,
	apiKey: string
): (stop_id: string) => Promise<string> {
	return async stopID => {
		const stop = await db.get(stopID);
		const latlng = `${stop.stop_lat},${stop.stop_lon}`;
		const url = 'https://maps.googleapis.com/maps/api/geocode/json';

		try {
			const res = await fetch(`${url}?latlng=${latlng}&key=${apiKey}`);
			const { results } = <ReverseGeocodingResponse> await res.json();

			const [first] = results;
			if (!first) {
				console.warn(`No address found for stop ${stopID}`);
				return '';
			} else {
				return first.formatted_address;
			}
		} catch (err) {
			console.error(err);
			return '';
		}
	}
}

/**
 * Returns the nearest stop to some position. Optionally, a maximum distance
 * from the position can be specified. Maximum distance is set in the same
 * units as latitude and longitude.
 */
export function nearestStop(
	db: PouchDB.Database<Stop>,
): (pos: LatLng) => Promise<Stop>
export function nearestStop(
	db: PouchDB.Database<Stop>,
	maxDistance: number,
): (pos: LatLng) => Promise<Stop|null>
export function nearestStop(
	db: PouchDB.Database<Stop>,
	maxDistance: number = Number.POSITIVE_INFINITY,
): (pos: LatLng) => Promise<Stop|null> {
	const maxDistSquared = Math.pow(maxDistance, 2);
	return async pos => {
		let closestDistanceSqr = Number.POSITIVE_INFINITY;
		let closestStop: Stop | null = null;

		const stops = extractDocs(await db.allDocs({ include_docs: true }));
		for (const stop of stops) {
			// Use pythagorean formula to compute distance.
			// Use squared distances to skip calculating the square root.
			const aSqr = Math.pow(pos.lat - stop.stop_lat, 2);
			const bSqr = Math.pow(pos.lng - stop.stop_lon, 2);

			const distanceSqr = aSqr + bSqr;
			if (distanceSqr < closestDistanceSqr) {
				closestStop = stop;
				closestDistanceSqr = distanceSqr;
			}
		}

		if (maxDistSquared >= closestDistanceSqr) return closestStop;
		else return null;
	}
}

/**
 * Returns the stop as a GeoJSON point.
 */
export function stopAsGeoJSON(stop: Stop): GeoJSON.Feature<GeoJSON.Point> {
	return {
		type: 'Feature',
		geometry: {
			type: 'Point',
			coordinates: [stop.stop_lon, stop.stop_lat]
		},
		id: stop.stop_id,
		properties: {
			stop_code: stop.stop_code,
			stop_name: stop.stop_name,
			stop_desc: stop.stop_desc,
			stop_url: stop.stop_url,
			location_type: stop.location_type,
			parent_station: stop.parent_station,
			wheelchair_boarding: stop.wheelchair_boarding,
		},
	};
}
