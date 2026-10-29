export function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  socket.userId = token; // In production, verify JWT here
  next();
}

export function emitToGame(io, gameId, event, data) {
  io.to(`game_${gameId}`).emit(event, data);
}

export function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export const GAME_CONSTANTS = {
  DEFAULT_ZONE_SHRINK_RATE: 5,
  DEFAULT_REVEAL_RADIUS: 300,
  DEFAULT_SABOTAGE_COOLDOWN_MS: 60000,
  DEFAULT_GAME_TICK_INTERVAL_MS: 60000,
  SABOTAGE_TYPES: ['gps_jam', 'false_lead'],
  GPS_JAM_DURATION_MS: 15000,
  FALSE_LEAD_DURATION_MS: 30000
};
