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
 * Looks up the address for a location using Google Reverse Geocoding.
 * If an error is thrown, it is emitted to the console and an empty address
 * is returned
 * @param apiKey API key for google maps reverse geocoding API
 * @param coord a GeoJSON coordinate
 */
export async function getAddress(
	apiKey: string,
	coord: [number, number],
): Promise<string> {
	const latlng = `${coord[1]},${coord[0]}`;
	const url = 'https://maps.googleapis.com/maps/api/geocode/json';

	try {
		const res = await fetch(`${url}?latlng=${latlng}&key=${apiKey}`);
		const { results } = <ReverseGeocodingResponse> await res.json();

		const [first] = results;
		if (!first) {
			console.warn(`No address found for coordinate [${coord.join()}]`);
			return '';
		} else {
			return first.formatted_address;
		}
	} catch (err) {
		console.error(err);
		return '';
	}
}

/**
 * Returns the URL for a street view image
 * @param apiKey API Key for Street View Image API
 * @param location either a GeoJSON coordinate or an address
 * @param width width of the image
 * @param height height of the image
 */
export function getStreetViewImage(
	apiKey: string,
	location: [number, number] | string,
	width: number,
	height: number,
): string {
	let locationQuery: string;
	if (Array.isArray(location)) {
		locationQuery = `${location[1]},${location[0]}`;
	} else {
		locationQuery = location;
	}

	return 'https://maps.googleapis.com/maps/api/streetview'
		+ `?location=${locationQuery}`
		+ `&size=${width}x${height}`
		+ `&key=${apiKey}`;
}
