export class ExecutionQueue {
  private static userExecutions = new Map<string, number>();
  private static globalExecutions = 0;

  private static MAX_GLOBAL_CONCURRENT_EXECUTIONS = parseInt(process.env.MAX_GLOBAL_CONCURRENT_EXECUTIONS || '50', 10);
  private static MAX_CONCURRENT_EXECUTIONS_PER_USER = parseInt(process.env.MAX_CONCURRENT_EXECUTIONS_PER_USER || '3', 10);

  static tryAcquire(userId: string): boolean {
    if (this.globalExecutions >= this.MAX_GLOBAL_CONCURRENT_EXECUTIONS) {
      return false;
    }

    const userCount = this.userExecutions.get(userId) || 0;
    if (userCount >= this.MAX_CONCURRENT_EXECUTIONS_PER_USER) {
      return false;
    }

    this.globalExecutions++;
    this.userExecutions.set(userId, userCount + 1);
    return true;
  }

  static release(userId: string): void {
    this.globalExecutions = Math.max(0, this.globalExecutions - 1);
    const userCount = this.userExecutions.get(userId) || 0;
    if (userCount <= 1) {
      this.userExecutions.delete(userId);
    } else {
      this.userExecutions.set(userId, userCount - 1);
    }
  }
}
