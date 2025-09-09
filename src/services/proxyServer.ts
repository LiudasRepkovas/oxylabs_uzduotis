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
        this.tcpServer.on('close', () => console.log('[SERVER] Connection closed', this.sockets));
    }

    async listen(port: number): Promise<void> {
        return new Promise((resolve) => {
            this.tcpServer.listen(port);
            this.tcpServer.on('listening', () => {
                console.log('[SERVER] Listening on port: ' + port)
                resolve();
            });
        })
    }

    async shutdown(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.tcpServer.close((e) => {
                if(e) {
                    reject(e)
                } else {
                    console.log('[SERVER] Connection closed');
                    resolve();
                }
            })
        })
    }

    private async createSocket(socket: net.Socket) {
        const id = shortid();
        const proxySocket = new ProxySocket(id, socket, this.onClientReceive.bind(this), this.onClientDisconnect.bind(this), TRAFFIC_LIMIT)
        this.sockets.set(id, proxySocket);
        await proxySocket.start();
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
        console.log('ids still connected:', [...this.sockets].map(([id]) => id));
    }
}
