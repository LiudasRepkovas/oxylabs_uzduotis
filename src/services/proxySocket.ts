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
    }

    start(): Promise<void> {
        return this.freeSend(Buffer.from(`Hello from server, your id is: ${this.id}\n`));
    }

    async send(data: Buffer): Promise<void> {
        try {
            await new Promise<void>((resolve, reject) => {
                this.socket.write(data, async (e?) => {
                    if (e) {
                        reject(e);
                        return;
                    }
                    this.inboundBytes += data.length;
                    await this.disconnectIfDataLimitReached();
                    resolve();
                });
            })
        } catch (e: Error | any) {
            this.handleError(e);
            throw e;
        }
    }

    disconnect(): Promise<void> {
        return new Promise((resolve) => {
            this.socket.end(() => {
                resolve();
            });
        })
    }

    getTotalTraffic() {
        return this.outboundBytes + this.inboundBytes;
    }

    private async freeSend(data: Buffer): Promise<void> {
        try {
            await new Promise<void>((resolve, reject) => {
                this.socket.write(data, async (e?) => {
                    if (e) {
                        reject(e);
                        return;
                    }
                    resolve();
                });
            })
        } catch (e: Error | any) {
            this.handleError(e);
            throw e;
        }
    }

    private async receive(data: Buffer) {
        try {
            this.onReceive(this.id, data);
            this.outboundBytes += data.length;
            await this.disconnectIfDataLimitReached();
        } catch (e: Error | any) {
           this.handleError(e);
        }
    }

    private handleError(err: Error) {
        console.error(`[CLIENT][ERROR][${this.id}]`, err);
    }

    private async disconnectIfDataLimitReached(): Promise<void> {
        if (this.getTotalTraffic() >= this.trafficLimit) {
            await this.freeSend(Buffer.from('\nData limit reached, disconnecting\n'));
            await this.disconnect();
        }
    }
}

