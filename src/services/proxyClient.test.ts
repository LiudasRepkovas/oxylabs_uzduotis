import {ProxyClient} from "./proxyClient";
import type net from "net";
import {MockSocket} from "../test/mockSocket";

describe("ProxyClient", () => {
  const makeClient = (trafficLimit = 100) => {
    const socket = new MockSocket();
    const onData = jest.fn();
    const onDisconnect = jest.fn();
    const client = new ProxyClient(
        "abc123",
        socket as unknown as net.Socket,
        onData,
        onDisconnect,
        trafficLimit
    );
    return {client, socket, onData, onDisconnect};
  };

  test("sends welcome message on construction", () => {
    const {socket} = makeClient();

    expect(socket.writes.length).toBe(1);
    expect(socket.writes[0].toString()).toContain("Hello from server, your id is: abc123");
  });

  test("welcome message does not count towards traffic limit", () => {
    const {client} = makeClient();
    expect(client.getTotalTraffic()).toBe(0);
  })

  test("emit data to server on incoming data and rebroadcast send increments counters", () => {
    const {client, socket, onData} = makeClient();

    socket.emit("data", "hello");

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith("abc123", Buffer.from("hello"));

    client.write(Buffer.from("world"));

    expect(socket.writes.map((b: Buffer) => b.toString())).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Hello from server"),
          "world"
        ])
    );
  });


  test("correctly counts traffic when receiving data", () => {
    const {client, socket} = makeClient();
    socket.emit("data", "AAAAA");
    expect(client.getTotalTraffic()).toEqual(5)

  })

  test("correctly counts traffic when sending data", () => {
    const {client} = makeClient();
    client.write(Buffer.from("AAAAA"));
    expect(client.getTotalTraffic()).toEqual(5)
  })

  test("disconnects when traffic limit is reached or exceeded", () => {
    const {client, socket, onDisconnect} = makeClient(10);

    socket.emit("data", "AAAAA");
    client.write(Buffer.from("BBBBB"));

    expect(socket.ended).toBe(true);
    expect(onDisconnect).toHaveBeenCalledWith("abc123");
  });

  test("sends disconnect message when disconnect from traffic limit", () => {
    const {client, socket} = makeClient(10);
    client.write(Buffer.from("AAAAAAAAAAAAAAAAAAAAAAAA"));
    expect(socket.writes.map((b: Buffer) => b.toString())).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Data limit reached, disconnecting")
        ])
    );
  })
});

