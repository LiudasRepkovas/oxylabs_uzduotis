import {ProxyServer} from "./proxyServer";
import {MockSocket} from "../test/mockSocket";

describe("ProxyServer", () => {
  let server: ProxyServer;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    server = new ProxyServer();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("creates a ProxyClient when a new socket connects", () => {
    const createSocketSpy = jest.spyOn<any, any>(server as any, 'createSocket');
    const tcpServer = (server as any).tcpServer;

    const socket = new MockSocket()
    tcpServer.emit('connection', socket)

    expect(createSocketSpy).toHaveBeenCalledTimes(1);
    expect(createSocketSpy).toHaveBeenCalledWith(socket);
  });

  test("logs error when socket connection fails", () => {
    const tcpServer = (server as any).tcpServer;
    tcpServer.emit('error', new Error('test error'));
    expect(console.error).toHaveBeenCalledWith('[ERROR][SERVER]', new Error('test error'));
  })

  test("broadcasts data from one client to the others", () => {
    const tcpServer = (server as any).tcpServer;

    const socket1 = new MockSocket();
    const socket2 = new MockSocket()

    tcpServer.emit('connection', socket1)
    tcpServer.emit('connection', socket2)

    socket1.emit('data', 'hello');

    expect(socket2.writes.map((b: Buffer) => b.toString())).toEqual(
        expect.arrayContaining([
          expect.stringContaining('hello')
        ])
    );
  });

  test("doesn't broadcast data to itself", () => {
    const tcpServer = (server as any).tcpServer;

    const socket1 = new MockSocket();
    const socket2 = new MockSocket()

    tcpServer.emit('connection', socket1)
    tcpServer.emit('connection', socket2)

    socket1.emit('data', 'hello1');
    socket2.emit('data', 'hello2');


    expect(socket1.writes.map((b: Buffer) => b.toString())).toEqual(
        expect.arrayContaining([
          expect.stringContaining('hello2')
        ])
    );
    expect(socket2.writes.map((b: Buffer) => b.toString())).toEqual(
        expect.arrayContaining([
          expect.stringContaining('hello1')
        ])
    );
  });

  test("removes client from map on disconnect", () => {
    const tcpServer = (server as any).tcpServer;
    const socket1 = new MockSocket();
    const socket2 = new MockSocket()
    tcpServer.emit('connection', socket1)
    tcpServer.emit('connection', socket2)
    socket1.emit('data', 'hello');
    socket1.emit('end');
    expect((server as any).sockets.size).toEqual(1);
  })

  test("logs when listening", async () => {
    await server.listen(1234);
    expect(console.log).toHaveBeenCalledWith('[SERVER] Listening on port: 1234');
  })
});
