import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { emitToGame } from '../middleware/socketAuth.js';
import * as turf from '@turf/turf';

const router = express.Router();

// Use sabotage
router.post('/use', async (req, res) => {
  try {
    const { fromPlayerId, gameId, type, targetPlayerId } = req.body;
    
    // Validate type
    if (!['gps_jam', 'false_lead'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid sabotage type' });
    }
    
    // Get from player
    const { data: fromPlayer, error: fromError } = await supabase
      .from('players')
      .select('*, games(*)')
      .eq('id', fromPlayerId)
      .single();
    
    if (fromError) throw fromError;
    
    // Check cooldown
    const now = new Date();
    if (fromPlayer.sabotage_cooldown_until && new Date(fromPlayer.sabotage_cooldown_until) > now) {
      const remaining = Math.ceil((new Date(fromPlayer.sabotage_cooldown_until) - now) / 1000);
      return res.status(400).json({ 
        success: false, 
        error: `Sabotage on cooldown. ${remaining}s remaining.` 
      });
    }
    
    // Get target player
    const { data: targetPlayer, error: targetError } = await supabase
      .from('players')
      .select('*')
      .eq('id', targetPlayerId)
      .single();
    
    if (targetError) throw targetError;
    
    // Set duration based on type
    const duration = type === 'gps_jam' ? 15000 : 30000;
    const until = new Date(Date.now() + duration);
    
    // Apply effect to target
    const updateField = type === 'gps_jam' ? 'hunter_gps_disabled_until' : 'false_lead_until';
    await supabase
      .from('players')
      .update({ [updateField]: until.toISOString() })
      .eq('id', targetPlayerId);
    
    // Set cooldown on attacker
    const cooldownUntil = new Date(Date.now() + (fromPlayer.games.sabotage_cooldown || 60000));
    await supabase
      .from('players')
      .update({ sabotage_cooldown_until: cooldownUntil.toISOString() })
      .eq('id', fromPlayerId);
    
    // Log sabotage
    const sabotageLog = {
      id: uuidv4(),
      game_id: gameId,
      from_player_id: fromPlayerId,
      to_player_id: targetPlayerId,
      type,
      duration,
      created_at: now.toISOString()
    };
    
    await supabase.from('sabotage_logs').insert([sabotageLog]);
    
    // Create event for victim notification (no attribution)
    const event = {
      id: uuidv4(),
      game_id: gameId,
      player_id: targetPlayerId,
      type: 'sabotaged',
      payload: {
        sabotageType: type,
        duration,
        message: type === 'gps_jam' 
          ? 'Your GPS signal was jammed for 15 seconds!'
          : 'A false lead was placed on your tracker!'
      },
      created_at: now.toISOString()
    };
    
    await supabase.from('events').insert([event]);
    
    // Emit to game
    const io = req.app.get('io');
    emitToGame(io, gameId, 'sabotage_used', {
      fromPlayerId,
      targetPlayerId,
      type,
      duration,
      message: event.payload.message
    });
    
    // Emit event to victim only
    io.to(`game_${gameId}`).emit('player_sabotaged', {
      targetPlayerId,
      type,
      message: event.payload.message
    });
    
    res.json({ 
      success: true, 
      message: `${type} used on ${targetPlayer.display_name}!`,
      cooldownUntil: cooldownUntil.toISOString(),
      duration
    });
  } catch (error) {
    console.error('Sabotage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cooldown status
router.get('/cooldown/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const { data: player, error } = await supabase
      .from('players')
      .select('sabotage_cooldown_until')
      .eq('id', playerId)
      .single();
    
    if (error) throw error;
    
    const now = new Date();
    const onCooldown = player.sabotage_cooldown_until && new Date(player.sabotage_cooldown_until) > now;
    const remaining = onCooldown 
      ? Math.ceil((new Date(player.sabotage_cooldown_until) - now) / 1000) 
      : 0;
    
    res.json({ 
      success: true, 
      onCooldown, 
      remaining,
      cooldownUntil: player.sabotage_cooldown_until
    });
  } catch (error) {
    console.error('Cooldown error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;