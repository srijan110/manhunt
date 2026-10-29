import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { emitToGame } from '../middleware/socketAuth.js';

const router = express.Router();

// Create a new game
router.post('/create', async (req, res) => {
  try {
    const { name, hostId, zonePolygon, shrinkRate = 5, revealRadius = 300, sabotageCooldown = 60000 } = req.body;
    
    const gameId = uuidv4();
    const game = {
      id: gameId,
      name: name || `Manhunt ${gameId.slice(0, 8)}`,
      host_id: hostId,
      zone_polygon_json: zonePolygon,
      shrink_rate: shrinkRate,
      current_round: 1,
      status: 'waiting',
      reveal_radius: revealRadius,
      sabotage_cooldown: sabotageCooldown,
      zone_shrink_interval: 60000,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('games')
      .insert([game])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, game: data });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get game by ID
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, game });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start game
router.post('/:gameId/start', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Randomly assign roles (at least 1 hunter)
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_eliminated', false);
    
    if (playersError) throw playersError;
    
    if (!players || players.length < 2) {
      return res.status(400).json({ success: false, error: 'Need at least 2 players to start' });
    }
    
    // Assign 1 hunter if < 4 players, else 25% hunters
    const hunterCount = players.length < 4 ? 1 : Math.max(1, Math.floor(players.length * 0.25));
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length; i++) {
      await supabase
        .from('players')
        .update({ role: i < hunterCount ? 'hunter' : 'hunted' })
        .eq('id', shuffled[i].id);
    }
    
    const { data: game, error } = await supabase
      .from('games')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', gameId)
      .select()
      .single();
    
    if (error) throw error;
    
    const io = req.app.get('io');
    emitToGame(io, gameId, 'game_started', { game, hunters: hunterCount });
    
    res.json({ success: true, game });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Shrink zone
router.post('/:gameId/shrink', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { shrinkBy = 5 } = req.body;
    
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    
    if (gameError) throw gameError;
    
    // Simple polygon shrink - in real implementation use turf
    const polygon = game.zone_polygon_json;
    // Mock shrink for now
    const shrunkPolygon = polygon; // TODO: implement proper shrinking
    
    const { data, error } = await supabase
      .from('games')
      .update({ 
        zone_polygon_json: shrunkPolygon,
        current_round: game.current_round + 1
      })
      .eq('id', gameId)
      .select()
      .single();
    
    if (error) throw error;
    
    const io = req.app.get('io');
    emitToGame(io, gameId, 'zone_shrunk', { game: data, round: data.current_round });
    
    res.json({ success: true, game: data });
  } catch (error) {
    console.error('Error shrinking zone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
