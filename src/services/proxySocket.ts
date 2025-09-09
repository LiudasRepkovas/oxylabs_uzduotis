import net from "net";

export class ProxySocket {
    private outboundBytes = 0;
    private inboundBytes = 0;

    constructor(
        private readonly id: string,
        private readonly socket: net.Socket,
        private readonly onReceive: (clientId: string, data: Buffer) => void,
        private readonly onDisconnect: (clientId: string) => void,
        private readonly trafficLimit: number
    ) {
        socket.on('error', this.handleError.bind(this));
        socket.on('data', this.receive.bind(this));
        socket.on('end', () => this.onDisconnect(this.id));
        this.freeSend(Buffer.from('\nHello from server, your id is: ' + this.id + '\n'));
    }

    async send(data: Buffer) {
        this.socket.write(data, (e?) => {
            this.sendCallback(data.length, e)
            this.disconnectIfDataLimitReached();
        });
    }

    disconnect() {
        this.socket.end();
        this.onDisconnect(this.id)
    }

    getTotalTraffic() {
        return this.outboundBytes + this.inboundBytes;
    }

    private freeSend(data: Buffer) {
        this.socket.write(data, (e?) => {
            this.sendCallback(0, e)
        });
    }

    private sendCallback(bytes: number, e?: Error | null) {
        if (e) {
            this.handleError(e);
        }
        this.inboundBytes += bytes;
    }

    private receive(data: Buffer) {
        this.onReceive(this.id, data);
        this.outboundBytes += data.length;
        this.disconnectIfDataLimitReached();
    }

    private handleError(err: Error) {
        console.error(`[CLIENT][ERROR][${this.id}]`, err);
    }

    private disconnectIfDataLimitReached() {
        if (this.getTotalTraffic() >= this.trafficLimit) {
            this.freeSend(Buffer.from('\nData limit reached, disconnecting\n'));
            this.disconnect();
        }
    }
}

