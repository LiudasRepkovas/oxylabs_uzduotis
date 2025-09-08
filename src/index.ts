import {ProxyServer} from "./services/proxyServer";
import {PORT} from "./config";

const proxy = new ProxyServer();

proxy.listen(PORT)