import CancellationToken from './cancellation-token';
import {ignoreError} from './utils';
import {OneTask, Task} from './types';

export default function oneTask(): OneTask {
  let cancellationToken: CancellationToken | null = null;
  let nextTask: Task | null = null;

  return async (task: Task): Promise<void> => {
    task = ignoreError(task);
    if (nextTask) {
      nextTask = task;
    } else if (cancellationToken) {
      cancellationToken!.cancel();
      nextTask = task;
    } else {
      cancellationToken = new CancellationToken();
      await task(cancellationToken);
      while (nextTask) {
        cancellationToken = new CancellationToken();
        const next = nextTask as Task;
        nextTask = null;
        await next(cancellationToken);
      }
      cancellationToken = null;
    }
  };
}
