import net from "net";
import shortid from "shortid";
import {ProxySocket} from "./proxySocket";
import {TRAFFIC_LIMIT} from "../config";

export class ProxyServer {
    private sockets: Map<string, ProxySocket> = new Map();
    private tcpServer: net.Server

    constructor() {
        this.tcpServer = net.createServer((socket) => this.createSocket(socket));
        this.tcpServer.on('error', this.handleError);
        this.tcpServer.on('close', () => console.log('[SERVER] Connection closed'));
    }

    async listen(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.tcpServer.listen(port);
            this.tcpServer.on('listening', () => {
                console.log('[SERVER] Listening on port: ' + port)
                resolve();
            });
        })
    }

    private createSocket(socket: net.Socket) {
        const id = shortid();
        this.sockets.set(id, new ProxySocket(id, socket, this.onClientReceive.bind(this), this.onClientDisconnect.bind(this), TRAFFIC_LIMIT));
    }

    private handleError(err: Error) {
        console.error('[ERROR][SERVER]', err);
    }

    private onClientReceive(clientId: string, data: Buffer) {
        const clients = [...this.sockets].filter(([id]) => id !== clientId);
        clients.forEach(([, c]) => c.send(data));
    }

    private onClientDisconnect(clientId: string) {
        this.sockets.delete(clientId);
    }
}
