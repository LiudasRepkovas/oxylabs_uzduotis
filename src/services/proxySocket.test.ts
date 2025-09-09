import {ProxySocket} from "./proxySocket";
import type net from "net";
import {MockSocket} from "../test/mockSocket";

describe("ProxySocket", () => {
  const makeClient = (trafficLimit = 100, forceError = false) => {
    const socket = new MockSocket(forceError);
    const onData = jest.fn();
    const onDisconnect = jest.fn();
    const proxySocket = new ProxySocket(
        "abc123",
        socket as unknown as net.Socket,
        onData,
        onDisconnect,
        trafficLimit
    );
    return {proxySocket, socket, onData, onDisconnect};
  };

  test("sends welcome message on start", async () => {
    const {socket, proxySocket} = makeClient();
    await proxySocket.start();
    expect(socket.writes.length).toBe(1);
    expect(socket.writes[0].toString()).toContain("Hello from server, your id is: abc123");
  });

  test("welcome message does not count towards traffic limit", async () => {
    const {proxySocket, socket} = makeClient();
    await proxySocket.start();
    expect(socket.writes.map((b) => b.toString())).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Hello from server"),
        ])
    );
    expect(proxySocket.getTotalTraffic()).toBe(0);
  })

  test("calls onData when data is received", () => {
    const { socket, onData} = makeClient();

    socket.emit("data", Buffer.from("hello"));

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith("abc123", Buffer.from("hello"));
  });

  test("calls onDisconnect when socket is closed", () => {
    const { socket, onDisconnect} = makeClient();
    socket.emit("end");
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith("abc123");
  })

  test("correctly counts traffic when receiving data", () => {
    const {proxySocket, socket} = makeClient();
    socket.emit("data", "AAAAA");
    expect(proxySocket.getTotalTraffic()).toEqual(5)
  })

  test("correctly counts multi byte characters when receiving", () => {
    const {proxySocket, socket} = makeClient();
    socket.emit("data", Buffer.from("Åa"));
    expect(proxySocket.getTotalTraffic()).toEqual(3)
  })

  test("correctly counts traffic when sending data", async () => {
    const {proxySocket} = makeClient();
    await proxySocket.send(Buffer.from("aaaaa"));
    expect(proxySocket.getTotalTraffic()).toEqual(5)
  })

  test("correctly counts multi byte characters when sending", async () => {
    const {proxySocket, socket} = makeClient();
    await proxySocket.send(Buffer.from("Åa"));
    expect(proxySocket.getTotalTraffic()).toEqual(3)
  })

  test("disconnects when traffic limit is reached or exceeded", async () => {
    const {proxySocket, socket, onDisconnect} = makeClient(10);

    socket.emit("data", "AAAAA");
    await proxySocket.send(Buffer.from("BBBBB"));

    expect(socket.ended).toBe(true);
    expect(onDisconnect).toHaveBeenCalledWith("abc123");
  });

  test("sends disconnect message when disconnect from traffic limit", async () => {
    const {proxySocket, socket} = makeClient(10);
    await proxySocket.send(Buffer.from("AAAAAAAAAAAAAAAAAAAAAAAA"));
    expect(socket.writes.map((b) => b.toString())).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Data limit reached, disconnecting")
        ])
    );
  })

  test("throws error when sending data if write fails", async () => {
    const {proxySocket} = makeClient(10, true);
    await expect(proxySocket.send(Buffer.from("BBBBB"))).rejects.toThrow("Forced error");
  })

  test("throws error when free sending data if write fails", async () => {
    const {proxySocket} = makeClient(10, true);
    await expect((proxySocket as any).freeSend(Buffer.from("BBBBB"))).rejects.toThrow("Forced error");
  })


  test('sendCallback does not count traffic on error', () => {
    console.error = jest.fn();
    const {proxySocket, socket} = makeClient();
    socket.emit("error", new Error("test error"));
    expect(proxySocket.getTotalTraffic()).toEqual(0);
  })

  test('handles errors in data received callback', () => {
    console.error = jest.fn();
    const {proxySocket, socket, onData} = makeClient();
    onData.mockImplementationOnce(() => {
      throw new Error("test error");
    })
    socket.emit("data", 'normal data');
    expect(console.error).toHaveBeenCalledWith('[CLIENT][ERROR][abc123]', new Error("test error"));
  })

});

