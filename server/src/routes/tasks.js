import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError } from "../middleware/errors.js";
import { checkCapacity } from "../services/capacity.js";

const router = Router();
const priorities = ["Low", "Medium", "High", "Critical"];
const statuses = ["Backlog", "Planned", "In Progress", "Completed"];
const taskSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().max(10000).default(""),
    storyPoints: z.coerce.number().int().min(1).max(99999),
    priority: z.enum(priorities),
    status: z.enum(statuses).default("Backlog"),
    plannedDate: z.iso.date(),
    dueDate: z.iso.date(),
  })
  .refine((t) => t.dueDate >= t.plannedDate, {
    message: "Due date cannot be earlier than the planned date",
    path: ["dueDate"],
  });
const outputColumns = `id, title, description, story_points AS storyPoints, priority, status,
  DATE_FORMAT(planned_date, '%Y-%m-%d') AS plannedDate, DATE_FORMAT(due_date, '%Y-%m-%d') AS dueDate,
  created_at AS createdAt, updated_at AS updatedAt`;

/** @openapi
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get a task by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Task }
 *       404: { description: Task not found }
 *   put:
 *     tags: [Tasks]
 *     summary: Replace task fields or update board status
 *     description: Every create/update calculates daily and weekly capacity. Planned tasks must fit both limits; other statuses do not reserve capacity. Story points must be whole numbers. Completed tasks cannot return to Backlog.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/TaskInput' } } } }
 *     responses:
 *       200: { description: Updated task }
 *       409: { description: Capacity exceeded or invalid status transition }
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Task deleted }
 *       404: { description: Task not found }
 */
router.get("/", async (req, res) => {
  const query = z
    .object({
      search: z.string().max(160).optional(),
      priority: z.enum(priorities).optional(),
      status: z.enum(statuses).optional(),
      sortBy: z
        .enum([
          "title",
          "storyPoints",
          "priority",
          "status",
          "plannedDate",
          "dueDate",
        ])
        .default("plannedDate"),
      order: z.enum(["asc", "desc"]).default("asc"),
      page: z.coerce.number().int().min(1).max(1000000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    })
    .parse(req.query);
  const sortColumns = {
    title: "title",
    storyPoints: "story_points",
    priority: "priority",
    status: "status",
    plannedDate: "planned_date",
    dueDate: "due_date",
  };
  const clauses = [];
  const params = {};
  if (query.search?.trim()) {
    clauses.push("(title LIKE :search OR description LIKE :search)");
    params.search = `%${query.search.trim()}%`;
  }
  if (query.priority) {
    clauses.push("priority = :priority");
    params.priority = query.priority;
  }
  if (query.status) {
    clauses.push("status = :status");
    params.status = query.status;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [[countRows], [tasks]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM tasks ${where}`, params),
    pool.execute(
      `SELECT ${outputColumns} FROM tasks ${where} ORDER BY ${sortColumns[query.sortBy]} ${query.order.toUpperCase()}, id ASC LIMIT :limit OFFSET :offset`,
      { ...params, limit: query.limit, offset: (query.page - 1) * query.limit },
    ),
  ]);
  const total = Number(countRows[0].total);
  res.json({
    data: tasks,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});

router.get("/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const [rows] = await pool.execute(
    `SELECT ${outputColumns} FROM tasks WHERE id = ?`,
    [id],
  );
  if (!rows[0]) throw new AppError(404, "Task not found");
  res.json({ data: rows[0] });
});

router.post("/", async (req, res) => {
  const task = taskSchema.parse(req.body);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const capacity = await checkCapacity(connection, task);
    const [result] = await connection.execute(
      "INSERT INTO tasks (title, description, story_points, priority, status, planned_date, due_date, created_by) VALUES (:title, :description, :storyPoints, :priority, :status, :plannedDate, :dueDate, :userId)",
      { ...task, userId: req.user.id },
    );
    const [rows] = await connection.execute(
      `SELECT ${outputColumns} FROM tasks WHERE id = ?`,
      [result.insertId],
    );
    await connection.commit();
    res.status(201).json({ data: rows[0], capacity });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.put("/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const task = taskSchema.parse(req.body);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.execute(
      "SELECT id, status FROM tasks WHERE id = ? FOR UPDATE",
      [id],
    );
    const existing = existingRows[0];
    if (!existing) throw new AppError(404, "Task not found");
    if (existing.status === "Completed" && task.status === "Backlog")
      throw new AppError(
        409,
        "Completed tasks cannot be moved back to Backlog",
      );
    const capacity = await checkCapacity(connection, task, id);
    await connection.execute(
      "UPDATE tasks SET title=:title, description=:description, story_points=:storyPoints, priority=:priority, status=:status, planned_date=:plannedDate, due_date=:dueDate WHERE id=:id",
      { ...task, id },
    );
    const [rows] = await connection.execute(
      `SELECT ${outputColumns} FROM tasks WHERE id = ?`,
      [id],
    );
    await connection.commit();
    res.json({ data: rows[0], capacity });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.delete("/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const [result] = await pool.execute("DELETE FROM tasks WHERE id = ?", [id]);
  if (!result.affectedRows) throw new AppError(404, "Task not found");
  res.status(204).end();
});

export default router;
