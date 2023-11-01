import type {ICancellationToken, Task} from './types';

export const ignoreError = (task: Task): Task => {
  return (token: ICancellationToken) => task(token).catch(() => {});
};
