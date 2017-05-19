import * as moment from 'moment';
import { Calendar } from '../interfaces';

export enum Weekdays {
	Sunday = 0,
	Monday = 1,
	Tuesday = 2,
	Wednesday = 3,
	Thursday = 4,
	Friday = 5,
	Saturday = 6
}

/**
 * Get the dates of service for a given calendar entry as a set of
 * integers
 */
export function getDays(
	calendarDB: PouchDB.Database<Calendar>
): (service_id: string) => Promise<Set<Weekdays>> {
	return async (serviceID: string) => {
		const dates = new Set<Weekdays>();
		const cal = await calendarDB.get(serviceID);
		if (cal.sunday) dates.add(Weekdays.Sunday);
		if (cal.monday) dates.add(Weekdays.Monday);
		if (cal.tuesday) dates.add(Weekdays.Tuesday);
		if (cal.wednesday) dates.add(Weekdays.Wednesday);
		if (cal.thursday) dates.add(Weekdays.Thursday);
		if (cal.friday) dates.add(Weekdays.Friday);
		if (cal.saturday) dates.add(Weekdays.Saturday);
		return dates;
	}
}


export function dateRangeString(
	days: Set<Weekdays>,
	mode: 'normal' | 'min' | 'short' = 'normal',
): string {
	// Should be at least 1 day in the set
	if (days.size === 0) throw new Error('Not active on any days');
	// If all 7 weekdays are preset, the schedule runs daily
	else if (days.size >= 7) return 'Daily';

	// Get a map of weekday numbers to strings
	let weekdays: string[];
	switch (mode) {
		case 'normal': weekdays = moment.weekdays(); break;
		case 'min': weekdays = moment.weekdaysShort(); break;
		case 'short': weekdays = moment.weekdaysMin(); break;
		default: throw new Error('Invalid mode');
	}

	// If only 1 day is present, return that day followed by 'Only'.
	// For example, 'Monday Only' or 'F Only'
	if (days.size === 1) {
		const [only] = days; // get the first (and only) element from the set
		return `${weekdays[only]} Only`;
	}

	// Convert the set to a sorted array
	const daysList = Array.from(days).sort();

	// Check if there is a uninterrupted series of days (such as M,T,W)
	let uninterrupted = true;
	let [last, ...restDays] = daysList;
	for (const day of restDays) {
		if (day !== last + 1) {
			uninterrupted = false;
			break;
		}
	}

	if (uninterrupted) {
		const firstDay = daysList[0];
		const lastDay = daysList[daysList.length - 1];
		return `${weekdays[firstDay]} - ${weekdays[lastDay]}`;
	}

	return daysList.map(day => weekdays[day]).join(' & ');
}
