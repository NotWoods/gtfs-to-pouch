import { Stop } from '../interfaces';

interface LatLng {
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
