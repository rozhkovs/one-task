export interface ICancellationToken {
  readonly isCanceled: boolean;
}
export type Task = (token: ICancellationToken) => Promise<void>;
export type OneTask = (task: Task) => void;
