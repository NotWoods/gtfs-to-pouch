import { Agency } from '../interfaces';
import { notFound } from './utils';

/**
 * Gets an agency from the schedule, or the first listed agency if no ID is
 * used. Since most schedules have only 1 agency without an agency_id property,
 * this function will return that agency.
 */
export function getAgency(
	db: PouchDB.Database<Agency>
): (agency_id?: string) => Promise<Agency> {
	return async id => {
		if (id) return db.get(id);

		const { rows } = await db.allDocs({ limit: 1, include_docs: true });
		if (rows.length === 0) throw notFound('no agencies in database');

		return rows[0].doc;
	}
}
