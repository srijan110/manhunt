import { supabase } from '../config/supabase.js';
import { emitToGame } from '../middleware/socketAuth.js';

export function initGameEngine(io) {
  console.log('Game engine initialized');
  
  // Zone shrink timer
  setInterval(async () => {
    try {
      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'active');
      
      if (error || !games) return;
      
      for (const game of games) {
        // Auto shrink every interval (in production, use game.zone_shrink_interval)
        // For now, just log
        console.log(`Checking zone for game ${game.id}`);
      }
    } catch (e) {
      console.error('Game engine error:', e);
    }
  }, 60000);
  
  // Cleanup stale positions
  setInterval(async () => {
    try {
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('is_eliminated', false);
      
      if (!players) return;
      
      const now = new Date();
      for (const player of players) {
        if (player.last_seen) {
          const lastSeen = new Date(player.last_seen);
          const diff = (now - lastSeen) / 1000;
          // If no update in 5 minutes, mark as offline (don't eliminate)
          if (diff > 300) {
            console.log(`Player ${player.id} appears offline`);
          }
        }
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }, 30000);
}

export default initGameEngine;
