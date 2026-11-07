import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errors.js';

const router = Router();
const settingsSchema = z.object({ dailyStoryPointLimit: z.coerce.number().positive().max(99999.99), weeklyStoryPointLimit: z.coerce.number().positive().max(99999.99) });

/** @openapi
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get planning capacity limits
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Current daily and weekly story point limits } }
 *   put:
 *     tags: [Settings]
 *     summary: Update planning capacity limits
 *     description: Limits are used to validate task creation, edits, and Backlog-to-Planned transitions.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [dailyStoryPointLimit, weeklyStoryPointLimit], properties: { dailyStoryPointLimit: { type: number, exclusiveMinimum: 0, example: 8 }, weeklyStoryPointLimit: { type: number, exclusiveMinimum: 0, example: 40 } } }
 *     responses: { 200: { description: Saved capacity limits }, 400: { description: Invalid limits }, 409: { description: New limits conflict with existing planned work } }
 */
router.get('/', async (_req, res) => {
  const [rows] = await pool.query('SELECT daily_story_point_limit AS dailyStoryPointLimit, weekly_story_point_limit AS weeklyStoryPointLimit, updated_at AS updatedAt FROM settings WHERE id = 1');
  res.json({ data: rows[0] });
});

router.put('/', async (req, res) => {
  const settings = settingsSchema.parse(req.body);
  if (settings.dailyStoryPointLimit > settings.weeklyStoryPointLimit) throw new AppError(400, 'Daily limit cannot be greater than the weekly limit');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT id FROM settings WHERE id = 1 FOR UPDATE');
    const [[dailyRows], [weeklyRows]] = await Promise.all([
      connection.query(`SELECT COALESCE(MAX(day_points), 0) AS peak FROM (SELECT SUM(story_points) AS day_points FROM tasks WHERE status='Planned' GROUP BY planned_date) AS day_totals`),
      connection.query(`SELECT COALESCE(MAX(week_points), 0) AS peak FROM (SELECT SUM(story_points) AS week_points FROM tasks WHERE status='Planned' GROUP BY YEARWEEK(planned_date, 3)) AS week_totals`)
    ]);
    if (Number(dailyRows[0].peak) > settings.dailyStoryPointLimit || Number(weeklyRows[0].peak) > settings.weeklyStoryPointLimit) {
      throw new AppError(409, 'The new limits are below workload that is already planned. Move or re-estimate tasks before lowering capacity.', { peakDailyPoints: Number(dailyRows[0].peak), peakWeeklyPoints: Number(weeklyRows[0].peak) });
    }
    await connection.execute('UPDATE settings SET daily_story_point_limit = ?, weekly_story_point_limit = ? WHERE id = 1', [settings.dailyStoryPointLimit, settings.weeklyStoryPointLimit]);
    const [rows] = await connection.query('SELECT daily_story_point_limit AS dailyStoryPointLimit, weekly_story_point_limit AS weeklyStoryPointLimit, updated_at AS updatedAt FROM settings WHERE id = 1');
    await connection.commit();
    res.json({ data: rows[0] });
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
});

export default router;
