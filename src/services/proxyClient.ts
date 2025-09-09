import net from "net";

export class ProxyClient {
    private sent = 0;
    private received = 0;

    constructor(
        private id: string,
        private socket: net.Socket,
        private onData: (clientId: string, data: Buffer) => void,
        private onDisconnect: (clientId: string) => void,
        private readonly trafficLimit: number
    ) {
        socket.setEncoding('utf8');
        socket.on('error', this.handleError.bind(this));
        socket.on('data', this.handleData.bind(this));
        this.freeWrite(Buffer.from('\nHello from server, your id is: ' + this.id + '\n'));
    }

    write(data: Buffer) {
        this.socket.write(data, (e?) => {
            this.writeCallback(data.length, e)
            this.disconnectIfDataLimitReached();
        });
    }

    disconnect() {
        this.socket.end();
    }

    getTotalTraffic() {
        return this.sent + this.received;
    }

    private freeWrite(data: Buffer) {
        this.socket.write(data, (e?) => {
            this.writeCallback(0, e)
        });
    }

    private writeCallback(bytes: number, e?: Error | null) {
        if (e) {
            this.handleError(e);
        }
        this.received += bytes;
    }

    private handleData(data: string) {
        this.onData(this.id, Buffer.from(data));
        this.sent += data.length;
        this.disconnectIfDataLimitReached();
    }

    private handleError(err: Error) {
        console.error(`[CLIENT][ERROR][${this.id}]`, err);
    }

    private disconnectIfDataLimitReached() {
        console.log(`[CLIENT][${this.id}] Total traffic: ${this.getTotalTraffic()}`)
        if (this.getTotalTraffic() >= this.trafficLimit) {
            this.freeWrite(Buffer.from('\nData limit reached, disconnecting\n'));
            this.disconnect();
            this.onDisconnect(this.id)
        }
    }
}

