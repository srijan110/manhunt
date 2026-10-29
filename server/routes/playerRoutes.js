import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { emitToGame } from '../middleware/socketAuth.js';
import * as turf from '@turf/turf';

const router = express.Router();

// Join game
router.post('/join', async (req, res) => {
  try {
    const { gameId, userId, displayName } = req.body;
    
    // Check if game exists and is waiting
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    
    if (gameError) throw gameError;
    
    if (game.status !== 'waiting') {
      return res.status(400).json({ success: false, error: 'Game already started' });
    }
    
    // Check if player already joined
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .single();
    
    if (existingPlayer) {
      return res.json({ success: true, player: existingPlayer });
    }
    
    const playerId = uuidv4();
    const player = {
      id: playerId,
      game_id: gameId,
      user_id: userId,
      display_name: displayName || `Player ${playerId.slice(0, 6)}`,
      role: 'hunted',
      position: null,
      is_eliminated: false,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('players')
      .insert([player])
      .select()
      .single();
    
    if (error) throw error;
    
    const io = req.app.get('io');
    emitToGame(io, gameId, 'player_joined', { player: data });
    
    res.json({ success: true, player: data });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update GPS position
router.post('/position', async (req, res) => {
  try {
    const { playerId, gameId, lat, lng, accuracy } = req.body;
    
    const position = { lat, lng, accuracy, timestamp: new Date().toISOString() };
    
    // Check if in zone
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('zone_polygon_json, status')
      .eq('id', gameId)
      .single();
    
    if (gameError) throw gameError;
    
    let isInZone = true;
    if (game.status === 'active' && game.zone_polygon_json) {
      try {
        const point = turf.point([lng, lat]);
        const poly = turf.polygon(game.zone_polygon_json.coordinates);
        isInZone = turf.booleanPointInPolygon(point, poly);
      } catch (e) {
        console.error('Zone check error:', e);
        isInZone = true;
      }
    }
    
    const updateData = {
      position,
      gps_accuracy: accuracy,
      last_seen: new Date().toISOString()
    };
    
    if (game.status === 'active' && !isInZone) {
      updateData.is_eliminated = true;
      updateData.eliminated_at = new Date().toISOString();
      
      const io = req.app.get('io');
      emitToGame(io, gameId, 'player_eliminated', { playerId, reason: 'out_of_bounds' });
    }
    
    const { data: player, error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', playerId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Broadcast position to game
    const io = req.app.get('io');
    emitToGame(io, gameId, 'player_position_update', { playerId, position, role: player.role, isEliminated: player.is_eliminated });
    
    res.json({ success: true, player, isInZone });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get players in game
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    res.json({ success: true, players });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get hunter positions visible to player (with distance filter)
router.get('/visible/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*, games(*)')
      .eq('id', playerId)
      .single();
    
    if (playerError) throw playerError;
    
    if (player.role === 'hunter') {
      // Hunters see all hunted players
      const { data: hunted, error: huntedError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', player.game_id)
        .eq('role', 'hunted')
        .eq('is_eliminated', false);
      
      if (huntedError) throw huntedError;
      return res.json({ success: true, visible: hunted, type: 'hunters_view' });
    }
    
    // Hunted players see hunters only within reveal radius
    const { data: hunters, error: huntersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', player.game_id)
      .eq('role', 'hunter')
      .eq('is_eliminated', false);
    
    if (huntersError) throw huntersError;
    
    const visibleHunters = [];
    const revealRadius = player.games.reveal_radius || 300;
    
    for (const hunter of hunters) {
      if (!hunter.position || !player.position) continue;
      
      const distance = turf.distance(
        turf.point([hunter.position.lng, hunter.position.lat]),
        turf.point([player.position.lng, player.position.lat]),
        { units: 'meters' }
      );
      
      if (distance <= revealRadius) {
        // Check if hunter has GPS disabled by GPS Jam
        if (hunter.hunter_gps_disabled_until && new Date(hunter.hunter_gps_disabled_until) > new Date()) {
          continue;
        }
        visibleHunters.push({ ...hunter, distance: Math.round(distance) });
      }
    }
    
    res.json({ success: true, visible: visibleHunters, type: 'hunted_view', revealRadius });
  } catch (error) {
    console.error('Error fetching visible players:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
