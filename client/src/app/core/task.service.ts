import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { forkJoin, map, of, switchMap } from "rxjs";
import {
  CapacitySnapshot,
  DashboardSummary,
  Page,
  Settings,
  Task,
  TaskInput,
  TaskListQuery,
} from "./models";

@Injectable({ providedIn: "root" })
export class TaskService {
  constructor(private http: HttpClient) {}
  list(query: TaskListQuery = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== "")
        params = params.set(key, String(value));
    });
    return this.http.get<Page<Task>>("/api/tasks", { params });
  }
  listAll() {
    return this.list({ limit: 100, page: 1 }).pipe(
      switchMap((first) =>
        first.pagination.totalPages <= 1
          ? of(first.data)
          : forkJoin(
              Array.from(
                { length: first.pagination.totalPages - 1 },
                (_, index) => this.list({ limit: 100, page: index + 2 }),
              ),
            ).pipe(
              map((pages) => [
                ...first.data,
                ...pages.flatMap((page) => page.data),
              ]),
            ),
      ),
    );
  }
  get(id: number) {
    return this.http.get<{ data: Task }>(`/api/tasks/${id}`);
  }
  create(task: TaskInput) {
    return this.http.post<{ data: Task; capacity: CapacitySnapshot }>(
      "/api/tasks",
      task,
    );
  }
  update(task: Task) {
    const { id, ...input } = task;
    return this.http.put<{ data: Task; capacity: CapacitySnapshot }>(
      `/api/tasks/${id}`,
      input,
    );
  }
  capacityMessage(capacity: CapacitySnapshot) {
    return `Daily remaining: ${capacity.dailyRemaining}/${capacity.dailyLimit} pts. Weekly remaining: ${capacity.weeklyRemaining}/${capacity.weeklyLimit} pts.`;
  }
  remove(id: number) {
    return this.http.delete<void>(`/api/tasks/${id}`);
  }
  settings() {
    return this.http.get<{ data: Settings }>("/api/settings");
  }
  saveSettings(settings: Settings) {
    return this.http.put<{ data: Settings }>("/api/settings", settings);
  }
  dashboard(date = new Date().toLocaleDateString("en-CA")) {
    return this.http.get<{ data: DashboardSummary }>("/api/dashboard", {
      params: { date },
    });
  }
}
