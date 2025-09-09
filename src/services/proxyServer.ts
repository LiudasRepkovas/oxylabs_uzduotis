import net from "net";
import shortid from "shortid";
import {ProxyClient} from "./proxyClient";
import {TRAFFIC_LIMIT} from "../config";

export class ProxyServer {
    private clients: Map<string, ProxyClient> = new Map();
    private tcpServer: net.Server

    constructor() {
        this.tcpServer = net.createServer((socket) => this.createClient(socket));
        this.tcpServer.on('error', this.handleError);
        this.tcpServer.on('close', () => console.log('[SERVER] Connection closed'));
    }

    listen(port: number) {
        this.tcpServer.on('listening', ()=> console.log('[SERVER] Listening on port: ' + port ));
        this.tcpServer.listen(port);
    }

    private createClient(socket: net.Socket) {
        const id = shortid();
        this.clients.set(id, new ProxyClient(id, socket, this.onClientData.bind(this), this.onClientDisconnect.bind(this), TRAFFIC_LIMIT));
    }

    private handleError(err: Error) {
        console.error('[ERROR][SERVER]', err);
    }

    private onClientData(clientId: string, data: Buffer) {
        const clients = [...this.clients].filter(([id]) => id !== clientId);
        clients.forEach(([, c]) => c.write(data));
    }

    private onClientDisconnect(clientId: string) {
        this.clients.delete(clientId);
    }
}
