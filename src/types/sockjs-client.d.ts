declare module "sockjs-client" {
  interface SockJSConstructor {
    new (url: string): WebSocket;
  }
  const SockJS: SockJSConstructor;
  export default SockJS;
}
