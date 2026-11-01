import api from '@/utils/axios';
import { migrateLegacyWorkoutQueue, registerSender } from './outbox';

/** Outbox record kinds. Each server endpoint is an upsert, so a resend updates, never duplicates. */
export const WORKOUT_SETS_KIND = 'workout-sets';
export const NUTRITION_LOG_KIND = 'nutrition-log';

export const workoutSetsKey = ({ userId, date, exerciseName }) =>
	`${WORKOUT_SETS_KIND}:${String(userId)}__${date}__${String(exerciseName || '').toLowerCase()}`;

let registered = false;

export function registerOfflineSenders() {
	if (registered) return;
	registered = true;

	// POST /prs upserts one exercise's sets for one day (user + exercise + date).
	registerSender(WORKOUT_SETS_KIND, async (payload, { idempotencyKey }) => {
		const { data } = await api.post(
			'/prs',
			{ exerciseName: payload.exerciseName, date: payload.date, records: payload.records },
			{ params: { userId: payload.userId }, headers: { 'Idempotency-Key': idempotencyKey } },
		);
		return data;
	});

	// POST /nutrition/food-logs upserts the log of one meal (or the day's supplements) per day.
	registerSender(NUTRITION_LOG_KIND, async (payload, { idempotencyKey }) => {
		const { data } = await api.post('/nutrition/food-logs', payload.body, {
			headers: { 'Idempotency-Key': idempotencyKey },
		});
		return data;
	});

	migrateLegacyWorkoutQueue(item =>
		item?.exerciseName && item?.date
			? { key: workoutSetsKey(item), kind: WORKOUT_SETS_KIND, payload: item }
			: null,
	);
}
