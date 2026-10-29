'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [gameCode, setGameCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('manhunt_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleJoin = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    
    const newUser = {
      id: 'user_' + Math.random().toString(36).slice(2, 9),
      displayName: displayName.trim()
    };
    
    localStorage.setItem('manhunt_user', JSON.stringify(newUser));
    setUser(newUser);
    setLoading(false);
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/80 backdrop-blur rounded-2xl p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-center mb-2 text-red-500">REAL MANHUNT</h1>
          <p className="text-center text-gray-400 mb-6">GPS hide & seek in the real world</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Continue'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white">
      <div className="max-w-4xl mx-auto p-4">
        <header className="text-center py-8">
          <h1 className="text-4xl font-bold text-red-500">REAL MANHUNT</h1>
          <p className="text-gray-400 mt-2">Welcome, {user.displayName}</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Game Card */}
          <div className="bg-gray-800/80 backdrop-blur rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Create Game</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Game Name</label>
                <input
                  type="text"
                  id="gameName"
                  placeholder="My Manhunt Game"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Number of Players</label>
                <input
                  type="number"
                  id="playerCount"
                  defaultValue="4"
                  min="2"
                  max="20"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Reveal Radius (meters)</label>
                <input
                  type="number"
                  id="revealRadius"
                  defaultValue="300"
                  min="100"
                  max="1000"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <button
                onClick={() => window.location.href = '/game/create'}
                className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition"
              >
                Create & Lock Zone
              </button>
            </div>
          </div>

          {/* Join Game Card */}
          <div className="bg-gray-800/80 backdrop-blur rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Join Game</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Game Code</label>
                <input
                  type="text"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value)}
                  placeholder="Enter game code"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <button
                onClick={() => {
                  if (gameCode.trim()) {
                    window.location.href = `/game/join/${gameCode.trim()}`;
                  }
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition"
              >
                Join Game
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}