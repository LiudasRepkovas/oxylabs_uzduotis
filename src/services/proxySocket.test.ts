import {ProxySocket} from "./proxySocket";
import type net from "net";
import {MockSocket} from "../test/mockSocket";

describe("ProxySocket", () => {
  const makeClient = (trafficLimit = 100) => {
    const socket = new MockSocket();
    const onData = jest.fn();
    const onDisconnect = jest.fn();
    const proxySocket = new ProxySocket(
        "abc123",
        socket as unknown as net.Socket,
        onData,
        onDisconnect,
        trafficLimit
    );
    return {client: proxySocket, socket, onData, onDisconnect};
  };

  test("sends welcome message on construction", () => {
    const {socket} = makeClient();

    expect(socket.writes.length).toBe(1);
    expect(socket.writes[0].toString()).toContain("Hello from server, your id is: abc123");
  });

  test("welcome message does not count towards traffic limit", () => {
    const {client, socket} = makeClient();
    expect(socket.writes.map((b: Buffer) => b.toString())).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Hello from server"),
        ])
    );
    expect(client.getTotalTraffic()).toBe(0);
  })

  test("calls onData when data is received", () => {
    const {client, socket, onData} = makeClient();

    socket.emit("data", Buffer.from("hello"));

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith("abc123", Buffer.from("hello"));
  });

  test("calls onDisconnect when socket is closed", () => {
    const {client, socket, onDisconnect} = makeClient();
    socket.emit("end");
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith("abc123");
  })


  test("correctly counts traffic when receiving data", () => {
    const {client, socket} = makeClient();
    socket.emit("data", "AAAAA");
    expect(client.getTotalTraffic()).toEqual(5)
  })

  test("correctly counts multi byte characters when receiving", () => {
    const {client, socket} = makeClient();
    socket.emit("data", Buffer.from("Åa"));
    expect(client.getTotalTraffic()).toEqual(3)
  })

  test("correctly counts traffic when sending data", () => {
    const {client} = makeClient();
    client.send(Buffer.from("aaaaa"));
    expect(client.getTotalTraffic()).toEqual(5)
  })

  test("correctly counts multi byte characters when sending", () => {
    const {client, socket} = makeClient();
    client.send(Buffer.from("Åa"));
    expect(client.getTotalTraffic()).toEqual(3)
  })

  test("disconnects when traffic limit is reached or exceeded", () => {
    const {client, socket, onDisconnect} = makeClient(10);

    socket.emit("data", "AAAAA");
    client.send(Buffer.from("BBBBB"));

    expect(socket.ended).toBe(true);
    expect(onDisconnect).toHaveBeenCalledWith("abc123");
  });

  test("sends disconnect message when disconnect from traffic limit", () => {
    const {client, socket} = makeClient(10);
    client.send(Buffer.from("AAAAAAAAAAAAAAAAAAAAAAAA"));
    expect(socket.writes.map((b: Buffer) => b.toString())).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Data limit reached, disconnecting")
        ])
    );
  })
});

