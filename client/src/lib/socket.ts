import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  socket ??= io('/', { autoConnect: true, transports: ['websocket', 'polling'] })
  return socket
}
