import type {Task} from '../types';
import oneTask from '../one-task';
import CancellationToken from '../cancellation-token';

jest.useFakeTimers();

describe('oneTask', () => {
  // region fixture

  type TaskNames = 'task1' | 'task2' | 'task3';
  type TaskActions = 'started' | 'completed';
  type Events = `${TaskNames}.${TaskActions}`;

  const createPreset = () => {
    const events: Events[] = [];

    type CreateTaskOptions = {
      durMs?: number; //  milliseconds
      callReject?: boolean;
    };
    const createTask = (
      name: TaskNames,
      {durMs = 0, callReject = false}: CreateTaskOptions = {}
    ): Task => {
      return () => {
        return new Promise<void>((resolve, reject) => {
          events.push(`${name}.started`);
          setTimeout(() => {
            events.push(`${name}.completed`);
            if (callReject) {
              resolve();
            } else {
              reject();
            }
          }, durMs);
        });
      };
    };

    const updateTask = (task: jest.Mock, options: CreateTaskOptions) => {
      const update = (taskName: TaskNames) =>
        task.mockImplementation(createTask(taskName, options));
      if (task === task1) {
        update('task1');
      } else if (task === task2) {
        update('task2');
      } else if (task === task3) {
        update('task3');
      } else {
        throw new Error('Task not found');
      }
    };

    const setDuration = (task: jest.Mock, durMs: number) => {
      updateTask(task, {durMs});
    };

    return {
      events,
      runTask: oneTask(),
      task1: jest.fn().mockImplementation(createTask('task1')),
      task2: jest.fn().mockImplementation(createTask('task2')),
      task3: jest.fn().mockImplementation(createTask('task3')),
      setDuration,
      updateTask,
    };
  };

  let {runTask, events, task1, task2, task3, setDuration, updateTask} =
    createPreset();

  beforeEach(() => {
    jest.clearAllMocks();
    const preset = createPreset();
    runTask = preset.runTask;
    events = preset.events;
    task1 = preset.task1;
    task2 = preset.task2;
    task3 = preset.task3;
    setDuration = preset.setDuration;
    updateTask = preset.updateTask;
  });

  // endregion

  const getLastToken = (task: jest.Mock): CancellationToken => {
    return task.mock.lastCall[0] as CancellationToken;
  };

  it('should run the task immediately at the first start', () => {
    runTask(task1);
    expect(task1).toBeCalledTimes(1);
    expect(getLastToken(task1).isCanceled).toBe(false);
  });
  it('should be performed sequentially', async () => {
    setDuration(task1, 50);
    setDuration(task2, 20);
    runTask(task1);
    runTask(task2);
    await jest.advanceTimersByTimeAsync(70);

    expect(events).toStrictEqual([
      'task1.started',
      'task1.completed',
      'task2.started',
      'task2.completed',
    ] as Events[]);
  });
  test('new tasks should replace the next non-started task', async () => {
    runTask(task1);
    runTask(task2);
    runTask(task3);
    await jest.advanceTimersByTimeAsync(40);

    expect(events).toStrictEqual([
      'task1.started',
      'task1.completed',
      'task3.started',
      'task3.completed',
    ] as Events[]);
  });
  test('an error in the task should not interrupt the execution chain', async () => {
    updateTask(task1, {callReject: true});
    runTask(task1);
    runTask(task2);
    await jest.advanceTimersByTimeAsync(100);
    expect(events).toStrictEqual([
      'task1.started',
      'task1.completed',
      'task2.started',
      'task2.completed',
    ] as Events[]);
  });
  it('should correctly restore its state after completing tasks', async () => {
    setDuration(task1, 20);
    setDuration(task2, 20);
    setDuration(task3, 20);
    const expectEvents: Events[] = [];

    runTask(task1);
    await jest.advanceTimersByTimeAsync(20);
    expectEvents.push('task1.started', 'task1.completed');

    runTask(task1);
    runTask(task2);
    await jest.advanceTimersByTimeAsync(40);
    expectEvents.push('task1.started', 'task1.completed');
    expectEvents.push('task2.started', 'task2.completed');

    runTask(task1);
    runTask(task2);
    runTask(task3);
    await jest.advanceTimersByTimeAsync(40);
    expectEvents.push('task1.started', 'task1.completed');
    expectEvents.push('task3.started', 'task3.completed');

    runTask(task1);
    await jest.advanceTimersByTimeAsync(20);
    expectEvents.push('task1.started', 'task1.completed');

    expect(events).toStrictEqual(expectEvents);
  });
  describe('CancellationToken', () => {
    it('should not be canceled for the current task', () => {
      runTask(task1);
      expect(getLastToken(task1).isCanceled).toBe(false);
    });
    it('should be canceled for the current task when adding a new one', async () => {
      runTask(task1);
      runTask(task2);
      await jest.advanceTimersByTimeAsync(20);
      expect(getLastToken(task1).isCanceled).toBe(true);
      expect(getLastToken(task2).isCanceled).toBe(false);
    });
  });
});
