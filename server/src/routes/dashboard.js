import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";

const router = Router();

/** @openapi
 * /dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get task totals and story points
 *     description: Returns task counts by status and total story points. Story points are workload estimates and not monetary values.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: query, name: date, description: Local calendar date used for the capacity snapshot (YYYY-MM-DD), schema: { type: string, format: date } }]
 *     responses: { 200: { description: Dashboard summary } }
 */
router.get("/", async (req, res) => {
  const today = z.iso
    .date()
    .parse(req.query.date ?? new Date().toISOString().slice(0, 10));
  const monday = new Date(`${today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weekStart = monday.toISOString().slice(0, 10);
  monday.setUTCDate(monday.getUTCDate() + 7);
  const weekEnd = monday.toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS totalTasks,
    SUM(status='Backlog') AS backlogTasks, SUM(status='Planned') AS plannedTasks,
    SUM(status='In Progress') AS inProgressTasks, SUM(status='Completed') AS completedTasks,
    COALESCE(SUM(story_points), 0) AS totalStoryPoints,
    (SELECT COALESCE(SUM(story_points), 0) FROM tasks WHERE status='Planned' AND planned_date=?) AS plannedDailyPoints,
    (SELECT COALESCE(SUM(story_points), 0) FROM tasks WHERE status='Planned' AND planned_date >= ? AND planned_date < ?) AS plannedWeeklyPoints
    FROM tasks`,
    [today, weekStart, weekEnd],
  );
  const summary = Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]),
  );
  res.json({ data: summary });
});

export default router;
