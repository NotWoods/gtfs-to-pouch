import { Agency } from '../interfaces';

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

		const res = await db.allDocs({ limit: 1, include_docs: true });
		return res.rows[0].doc;
	}
}
