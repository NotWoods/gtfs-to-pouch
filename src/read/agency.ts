import { Agency } from '../interfaces';

export function getAgency(
	db: PouchDB.Database<Agency>
): (agency_id?: string) => Promise<Agency> {
	return async id => {
		if (id) return db.get(id);

		const res = await db.allDocs({ limit: 1, include_docs: true });
		return res.rows[0].doc;
	}
}
