type Task = {
  id: string
  fn: () => Promise<void> | void
  intervalMs: number
  timer?: NodeJS.Timeout
}

class Cron {
  private tasks: Map<string, Task> = new Map()

  addTask(
    id: string,
    fn: () => Promise<void> | void,
    intervalMs: number,
  ): boolean {
    if (this.tasks.has(id)) {
      // Duplicate task, do not add
      return false
    }
    const task: Task = { id, fn, intervalMs }
    task.timer = setInterval(async () => {
      try {
        await fn()
      } catch {
        // Optionally log error
      }
    }, intervalMs)
    this.tasks.set(id, task)
    return true
  }

  hasTask(id: string): boolean {
    return this.tasks.has(id)
  }

  removeTask(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) return false
    if (task.timer) clearInterval(task.timer)
    this.tasks.delete(id)
    return true
  }

  clearAll() {
    for (const task of this.tasks.values()) {
      if (task.timer) clearInterval(task.timer)
    }
    this.tasks.clear()
  }
}

export const cron = new Cron()
