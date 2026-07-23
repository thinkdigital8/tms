import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  const socketUrl = import.meta.env.VITE_API_URL || '/'
  socket ??= io(socketUrl, { autoConnect: true, transports: ['websocket', 'polling'] })
  return socket
}
