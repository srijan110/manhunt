'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GameLobbyPage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('manhunt_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    const fetchGame = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/games/${params.gameId}`);
        const data = await response.json();
        if (data.success) {
          setGame(data.game);
          setIsHost(data.game.host_id === user?.id);
        }
      } catch (error) {
        console.error('Error fetching game:', error);
      }
    };
    
    const fetchPlayers = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/players/game/${params.gameId}`);
        const data = await response.json();
        if (data.success) setPlayers(data.players);
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };
    
    fetchGame();
    fetchPlayers();
    
    // Poll for updates
    const interval = setInterval(() => {
      fetchGame();
      fetchPlayers();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [params.gameId]);

  const startGame = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/games/${params.gameId}/start`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        router.push(`/game/play/${params.gameId}`);
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-500 mx-auto"></div>
          <p className="mt-4">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-4">
        <header className="text-center py-8">
          <h1 className="text-4xl font-bold text-red-500">MANHUNT LOBBY</h1>
          <p className="text-gray-400 mt-2">Game: {game.name}</p>
          <p className="text-sm text-gray-500">Code: {game.id.slice(0, 8).toUpperCase()}</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Players ({players.length})</h2>
            <div className="space-y-3">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium">{player.display_name}</p>
                    <p className="text-xs text-gray-400">
                      {player.role === 'hunter' ? 'HUNTER' : 'HUNTED'}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    player.role === 'hunter' ? 'bg-red-600' : 'bg-blue-600'
                  }`}>
                    {player.role === 'hunter' ? 'HUNTING' : 'HIDING'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Game Settings</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Shrink Rate:</span>
                <span>{game.shrink_rate}m/min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reveal Radius:</span>
                <span>{game.reveal_radius}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sabotage Cooldown:</span>
                <span>{game.sabotage_cooldown / 1000}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="uppercase">{game.status}</span>
              </div>
            </div>
            
            {isHost && (
              <button
                onClick={startGame}
                disabled={players.length < 2}
                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {players.length < 2 ? 'Need 2+ Players' : 'Start Game'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}