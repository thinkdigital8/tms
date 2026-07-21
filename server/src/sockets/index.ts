import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { IMatch } from '../models/Match';

let io: Server | undefined;

export function initSockets(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join:tournament', (tournamentId: string) => socket.join(`tournament:${tournamentId}`));
    socket.on('leave:tournament', (tournamentId: string) => socket.leave(`tournament:${tournamentId}`));
    socket.on('join:match', (matchId: string) => socket.join(`match:${matchId}`));
    socket.on('leave:match', (matchId: string) => socket.leave(`match:${matchId}`));
    socket.on('join:court', (courtId: string) => socket.join(`court:${courtId}`));
  });

  return io;
}

/** Broadcasts a match's live state to anyone watching its tournament, the match itself, or its court. */
export function emitMatchUpdate(match: IMatch) {
  if (!io) return;
  const payload = {
    matchId: match._id,
    tournament: match.tournament,
    status: match.status,
    sets: match.sets,
    winner: match.winner,
    sideA: match.sideA,
    sideB: match.sideB,
    court: match.court,
    updatedAt: new Date(),
  };
  io.to(`tournament:${match.tournament}`).emit('match:update', payload);
  io.to(`match:${match._id}`).emit('match:update', payload);
  if (match.court) io.to(`court:${match.court}`).emit('match:update', payload);
}

export function emitScheduleUpdate(tournamentId: string, payload: unknown) {
  if (!io) return;
  io.to(`tournament:${tournamentId}`).emit('schedule:update', payload);
}

export function emitNotification(userId: string, payload: unknown) {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', payload);
}
