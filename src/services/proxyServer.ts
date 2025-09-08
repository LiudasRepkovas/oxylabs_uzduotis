import net from "net";
import shortid from "shortid";
import {ProxyClient} from "./proxyClient";

export class ProxyServer {
    private clients: Map<string, ProxyClient> = new Map();
    private server: net.Server

    constructor() {
        this.server = net.createServer(socket => {
            this.createClient(socket)
        });
        this.server.on('error', this.handleError);
    }

    listen(port: number) {
        this.server.listen(port);
        console.log(`[SERVER] Listening on port ${port}`);
    }

    private createClient(socket: net.Socket) {
        const id = shortid();
        this.clients.set(id, new ProxyClient(id, socket, this.onClientData.bind(this), this.onClientDisconnect.bind(this)));
    }

    private handleError(err: Error) {
        console.error('[ERROR][SERVER]', err);
    }

    private onClientData(clientId: string, data: Buffer) {
        const clients = [...this.clients].filter(([id]) => id !== clientId);
        clients.forEach(([, c]) => c.send(data));
    }

    private onClientDisconnect(clientId: string) {
        this.clients.delete(clientId);
    }
}
