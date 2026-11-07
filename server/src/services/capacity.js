import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errors.js';

const dateOnly = (value) => String(value).slice(0, 10);
function weekStart(date) {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export async function checkCapacity(connection, task, excludeId = null) {
  const plannedDate = dateOnly(task.plannedDate);
  const start = weekStart(plannedDate);
  const endDate = new Date(`${start}T00:00:00Z`); endDate.setUTCDate(endDate.getUTCDate() + 7);
  const end = endDate.toISOString().slice(0, 10);
  const isPlanned = task.status === 'Planned';
  const [settingsRows] = await connection.query(`SELECT daily_story_point_limit AS dailyLimit, weekly_story_point_limit AS weeklyLimit FROM settings WHERE id = 1${isPlanned ? ' FOR UPDATE' : ''}`);
  const settings = settingsRows[0] ?? { dailyLimit: 8, weeklyLimit: 40 };
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(CASE WHEN planned_date = :plannedDate THEN story_points ELSE 0 END), 0) AS dailyUsed,
            COALESCE(SUM(story_points), 0) AS weeklyUsed
       FROM tasks WHERE status = 'Planned' AND planned_date >= :start AND planned_date < :end
         AND (:excludeId IS NULL OR id <> :excludeId)`,
    { plannedDate, start, end, excludeId }
  );
  const dailyUsed = Number(rows[0].dailyUsed);
  const weeklyUsed = Number(rows[0].weeklyUsed);
  const points = Number(task.storyPoints);
  const dailyRemainingBefore = Number(settings.dailyLimit) - dailyUsed;
  const weeklyRemainingBefore = Number(settings.weeklyLimit) - weeklyUsed;
  if (isPlanned && (points > dailyRemainingBefore || points > weeklyRemainingBefore)) {
    const reasons = [];
    if (points > dailyRemainingBefore) reasons.push(`Daily capacity exceeded: ${dailyUsed} planned + ${points} requested exceeds ${settings.dailyLimit} points (remaining ${dailyRemainingBefore})`);
    if (points > weeklyRemainingBefore) reasons.push(`Weekly capacity exceeded: ${weeklyUsed} planned + ${points} requested exceeds ${settings.weeklyLimit} points (remaining ${weeklyRemainingBefore})`);
    throw new AppError(409, reasons.join('. '), { dailyUsed, dailyRemaining: dailyRemainingBefore, dailyLimit: Number(settings.dailyLimit), weeklyUsed, weeklyRemaining: weeklyRemainingBefore, weeklyLimit: Number(settings.weeklyLimit) });
  }
  const pointsToReserve = isPlanned ? points : 0;
  return {
    plannedDate, weekStart: start,
    dailyUsed: dailyUsed + pointsToReserve,
    dailyRemaining: dailyRemainingBefore - pointsToReserve,
    dailyLimit: Number(settings.dailyLimit),
    weeklyUsed: weeklyUsed + pointsToReserve,
    weeklyRemaining: weeklyRemainingBefore - pointsToReserve,
    weeklyLimit: Number(settings.weeklyLimit)
  };
}
