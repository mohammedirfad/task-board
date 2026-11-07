export type TaskStatus = 'Backlog' | 'Planned' | 'In Progress' | 'Completed';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskSortBy = 'title' | 'storyPoints' | 'priority' | 'status' | 'plannedDate' | 'dueDate';
export interface TaskListQuery {
  search?: string; priority?: Priority | ''; status?: TaskStatus | '';
  sortBy?: TaskSortBy; order?: 'asc' | 'desc'; page?: number; limit?: number;
}
export interface Task {
  id: number; title: string; description: string; storyPoints: number; priority: Priority;
  status: TaskStatus; plannedDate: string; dueDate: string; createdAt?: string; updatedAt?: string;
}
export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
export interface Settings { dailyStoryPointLimit: number; weeklyStoryPointLimit: number; updatedAt?: string; }
export interface CapacitySnapshot {
  plannedDate: string; weekStart: string; dailyUsed: number; dailyRemaining: number; dailyLimit: number;
  weeklyUsed: number; weeklyRemaining: number; weeklyLimit: number;
}
export interface DashboardSummary { totalTasks: number; backlogTasks: number; plannedTasks: number; inProgressTasks: number; completedTasks: number; totalStoryPoints: number; plannedDailyPoints: number; plannedWeeklyPoints: number; }
export interface Page<T> { data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number }; }
export interface ApiError { error?: { message?: string; details?: unknown; code?: string }; }
