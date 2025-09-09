import {EventEmitter} from "events";

export class MockSocket extends EventEmitter {
  public writes: Buffer[] = [];
  public ended = false;
  public encoding?: string;

  setEncoding(enc: string) {
    this.encoding = enc;
  }

  write(data: Buffer | string, cb?: (err?: Error | null) => void) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    this.writes.push(buf);
    if (cb) cb(null);
    return true;
  }

  end() {
    this.ended = true;
    this.emit("end");
  }
}
