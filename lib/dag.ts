// Directed Acyclic Graph engine for task scheduling.
// Each task has an estimated duration (days) and a list of dependency task IDs.
// We compute: topological order, the critical path (longest chain by duration),
// and per-task "drift" = is this task late relative to its planned finish date.

export type TaskNode = {
  id: string;
  title: string;
  duration_days: number;
  depends_on: string[]; // task ids that must finish first
  status: "todo" | "in_progress" | "done";
  planned_start?: string; // ISO date, computed
  planned_finish?: string; // ISO date, computed
  actual_finish?: string | null; // ISO date, set when marked done
};

export class CycleError extends Error {}

/** Kahn's algorithm topological sort. Throws CycleError if the graph isn't a DAG. */
export function topologicalSort(tasks: TaskNode[]): TaskNode[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const inDegree = new Map<string, number>();
  tasks.forEach((t) => inDegree.set(t.id, 0));
  tasks.forEach((t) => t.depends_on.forEach((dep) => {
    if (byId.has(dep)) inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
  }));

  const queue = tasks.filter((t) => (inDegree.get(t.id) || 0) === 0);
  const ordered: TaskNode[] = [];

  while (queue.length) {
    const node = queue.shift()!;
    ordered.push(node);
    tasks.forEach((t) => {
      if (t.depends_on.includes(node.id)) {
        inDegree.set(t.id, (inDegree.get(t.id) || 0) - 1);
        if (inDegree.get(t.id) === 0) queue.push(t);
      }
    });
  }

  if (ordered.length !== tasks.length) {
    throw new CycleError("Task graph has a cycle — dependencies must be acyclic.");
  }
  return ordered;
}

/**
 * Computes the longest path (by duration) through the DAG = the critical path.
 * Returns the set of task IDs on that path plus the total project duration.
 */
export function criticalPath(tasks: TaskNode[]): { path: string[]; totalDays: number } {
  const order = topologicalSort(tasks);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const earliestFinish = new Map<string, number>();
  const predecessor = new Map<string, string | null>();

  order.forEach((task) => {
    const depFinishes = task.depends_on.map((d) => earliestFinish.get(d) || 0);
    const start = depFinishes.length ? Math.max(...depFinishes) : 0;
    earliestFinish.set(task.id, start + task.duration_days);
    const critDep = task.depends_on.reduce<string | null>((best, d) => {
      if (!best) return d;
      return (earliestFinish.get(d) || 0) > (earliestFinish.get(best) || 0) ? d : best;
    }, null);
    predecessor.set(task.id, critDep);
  });

  // find the task with the max finish time — that's the end of the critical path
  let endTask = order[0];
  order.forEach((t) => {
    if ((earliestFinish.get(t.id) || 0) > (earliestFinish.get(endTask.id) || 0)) endTask = t;
  });

  const path: string[] = [];
  let cur: string | null = endTask.id;
  while (cur) {
    path.unshift(cur);
    cur = predecessor.get(cur) || null;
  }

  return { path, totalDays: earliestFinish.get(endTask.id) || 0 };
}

/**
 * Assigns planned_start / planned_finish dates to every task given a project
 * start date, then flags drift: a task is "drifting" if it's still not done
 * past its planned_finish date.
 */
export function scheduleAndDetectDrift(
  tasks: TaskNode[],
  projectStartISO: string
): { scheduled: TaskNode[]; driftedTaskIds: string[]; critical: string[]; totalDays: number } {
  const order = topologicalSort(tasks);
  const start = new Date(projectStartISO);
  const finishOffset = new Map<string, number>(); // days from project start

  order.forEach((task) => {
    const depFinishes = task.depends_on.map((d) => finishOffset.get(d) || 0);
    const startOffset = depFinishes.length ? Math.max(...depFinishes) : 0;
    const finish = startOffset + task.duration_days;
    finishOffset.set(task.id, finish);

    const plannedStart = new Date(start);
    plannedStart.setDate(plannedStart.getDate() + startOffset);
    const plannedFinish = new Date(start);
    plannedFinish.setDate(plannedFinish.getDate() + finish);

    task.planned_start = plannedStart.toISOString().slice(0, 10);
    task.planned_finish = plannedFinish.toISOString().slice(0, 10);
  });

  const today = new Date();
  const driftedTaskIds = tasks
    .filter((t) => t.status !== "done" && t.planned_finish && new Date(t.planned_finish) < today)
    .map((t) => t.id);

  const { path, totalDays } = criticalPath(tasks);

  return { scheduled: tasks, driftedTaskIds, critical: path, totalDays };
}
