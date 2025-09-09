import {EventEmitter} from "events";

export class MockSocket extends EventEmitter {
  public writes: (Buffer | Error)[] = [];
  public ended = false;
  public encoding?: string;

  constructor(private forceError: boolean = false) {
    super();
  }

  setEncoding(enc: string) {
    this.encoding = enc;
  }

  write(data: Buffer , cb?: (err?: Error | null) => void) {
    this.writes.push(data);
    if (cb) cb(this.forceError ? new Error("Forced error") : null);
    return true;
  }

  end(cb?: () => void) {
    this.ended = true;
    if (cb) cb();
    this.emit("end");
  }
}
