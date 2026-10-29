'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import L from 'leaflet';

export default function GamePlayPage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [myPlayer, setMyPlayer] = useState<any>(null);
  const [visiblePlayers, setVisiblePlayers] = useState<any[]>([]);
  const [position, setPosition] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>({});

  useEffect(() => {
    const savedUser = localStorage.getItem('manhunt_user');
    if (!savedUser) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const gameRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/games/${params.gameId}`);
        const gameData = await gameRes.json();
        if (gameData.success) setGame(gameData.game);

        const playersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/players/game/${params.gameId}`);
        const playersData = await playersRes.json();
        if (playersData.success) {
          setPlayers(playersData.players);
          const mine = playersData.players.find((p: any) => p.user_id === user.id);
          setMyPlayer(mine);
        }

        if (mine?.id) {
          const visibleRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/players/visible/${mine.id}`);
          const visibleData = await visibleRes.json();
          if (visibleData.success) setVisiblePlayers(visibleData.visible);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [user]);

  // GPS Tracking
  useEffect(() => {
    if (!user || !myPlayer || !game) return;
    if (game.status !== 'active') return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos: any) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setPosition(newPos);

        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/players/position`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: myPlayer.id,
              gameId: params.gameId,
              lat: newPos.lat,
              lng: newPos.lng,
              accuracy: newPos.accuracy,
            }),
          });
        } catch (e) {
          console.error('GPS update error:', e);
        }
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, myPlayer, game]);

  // Map initialization
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return;
    const map = L.map('map').setView([51.505, -0.09], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
  }, []);

  // Update map markers
  useEffect(() => {
    if (!mapRef.current) return;
    Object.values(markersRef.current).forEach((m: any) => m.remove());
    markersRef.current = {};

    if (game?.zone_polygon_json) {
      try {
        const coords = game.zone_polygon_json.coordinates[0].map((c: any) => [c[1], c[0]]);
        L.polygon(coords, { color: 'red', fillOpacity: 0.1, weight: 3 }).addTo(mapRef.current);
      } catch (e) { /* ignore */ }
    }

    if (position) {
      const marker = L.circleMarker([position.lat, position.lng], {
        radius: 8, color: myPlayer?.role === 'hunter' ? '#ff0000' : '#00ff00', fillOpacity: 1,
      }).addTo(mapRef.current).bindPopup('YOU');
      markersRef.current['me'] = marker;
      mapRef.current.setView([position.lat, position.lng]);
    }

    visiblePlayers.forEach((p) => {
      if (p.position) {
        const isHunter = p.role === 'hunter';
        const marker = L.circleMarker([p.position.lat, p.position.lng], {
          radius: 6, color: isHunter ? '#ff4444' : '#4444ff', fillOpacity: 0.8,
        }).addTo(mapRef.current).bindPopup(`${p.display_name} ${p.distance ? '(' + p.distance + 'm)' : ''}`);
        markersRef.current[p.id] = marker;
      }
    });
  }, [position, visiblePlayers, game]);

  const useSabotage = async (type: 'gps_jam' | 'false_lead') => {
    if (!myPlayer) return;
    const now = new Date();
    if (myPlayer.sabotage_cooldown_until && new Date(myPlayer.sabotage_cooldown_until) > now) {
      alert('Sabotage on cooldown!');
      return;
    }

    try {
      const targetPlayerId = visiblePlayers.find((p) => p.role === 'hunter')?.id || players.find((p) => p.role === 'hunter' && p.id !== myPlayer.id)?.id;
      if (!targetPlayerId) {
        alert('No hunter found to sabotage');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sabotage/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPlayerId: myPlayer.id,
          gameId: params.gameId,
          type,
          targetPlayerId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error('Sabotage error:', e);
    }
  };

  if (!game || game.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-500">WAITING TO START</h1>
          <p className="mt-4">Go to lobby to start the game</p>
          <button onClick={() => router.push(`/game/lobby/${params.gameId}`)} className="mt-4 px-6 py-2 bg-blue-600 rounded-lg">
            Go to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (myPlayer?.is_eliminated) {
    return (
      <div className="min-h-screen bg-red-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold">ELIMINATED</h1>
          <p className="mt-4">You were eliminated from the game</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="h-screen flex flex-col">
        <header className="bg-gray-800 p-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-red-500">REAL MANHUNT</h1>
            <p className="text-xs text-gray-400">{myPlayer?.role === 'hunter' ? 'HUNTER' : 'HUNTED'} | Round {game.current_round}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Zone Shrinking</p>
            <p className="text-sm text-yellow-400">Next shrink in ~60s</p>
          </div>
        </header>

        <div className="flex-1 relative">
          <div id="map" style={{ height: '100%', width: '100%' }}></div>

          {/* HUD */}
          <div className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur rounded-lg p-3 max-w-xs">
            <h3 className="font-bold mb-2">Visible</h3>
            {visiblePlayers.length === 0 ? (
              <p className="text-xs text-gray-400">No one visible</p>
            ) : (
              visiblePlayers.map((p) => (
                <div key={p.id} className="text-xs mb-1">
                  <span className={p.role === 'hunter' ? 'text-red-400' : 'text-blue-400'}>
                    {p.role === 'hunter' ? 'HUNTER' : 'HUNTED'}
                  </span>{' '}{p.display_name} {p.distance && '(' + p.distance + 'm)'}
                </div>
              ))
            )}
          </div>

          {/* Sabotage Panel (for hunted players) */}
          {myPlayer?.role === 'hunted' && (
            <div className="absolute bottom-4 left-4 right-4 bg-gray-800/90 backdrop-blur rounded-lg p-4">
              <h3 className="font-bold mb-2 text-center">SABOTAGE</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => useSabotage('gps_jam')} className="py-2 px-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold">
                  GPS JAM
                  <div className="text-xs">15s</div>
                </button>
                <button onClick={() => useSabotage('false_lead')} className="py-2 px-3 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-bold">
                  FALSE LEAD
                  <div className="text-xs">30s</div>
                </button>
              </div>
              <p className="text-xs text-center text-gray-400 mt-2">60s cooldown</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
