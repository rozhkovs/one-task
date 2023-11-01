import {ICancellationToken} from './types';

export default class CancellationToken implements ICancellationToken {
  public isCanceled = false;
  public cancel = () => {
    this.isCanceled = true;
  };
}
