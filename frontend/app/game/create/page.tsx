'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import L from 'leaflet';

export default function CreateGamePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [gameName, setGameName] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<any[]>([]);
  const [locked, setLocked] = useState(false);
  const mapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>({});

  useEffect(() => {
    const savedUser = localStorage.getItem('manhunt_user');
    if (!savedUser) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(savedUser));

    // Initialize map only once
    if (typeof window !== 'undefined' && !mapRef.current) {
      const map = L.map('map').setView([51.505, -0.09], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      mapRef.current = map;
    }
  }, []);

  const startDrawing = () => {
    setDrawing(true);
    setPolygonPoints([]);
  };

  const lockZone = async () => {
    if (polygonPoints.length < 3) {
      alert('Need at least 3 points to create a zone');
      return;
    }
    
    setLocked(true);
    
    // Create game
    try {
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: gameName || `Manhunt Game`,
          hostId: user.id,
          zonePolygon: {
            type: 'Polygon',
            coordinates: [[...polygonPoints.map(p => [p.lng, p.lat]), [polygonPoints[0].lng, polygonPoints[0].lat]]]
          }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Game created! Code: ${data.game.id.slice(0, 8).toUpperCase()}`);
        router.push(`/game/lobby/${data.game.id}`);
      }
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Error creating game');
    }
  };

  const addPoint = (e: any) => {
    if (!drawing || locked) return;
    const { lat, lng } = e.latlng;
    setPolygonPoints([...polygonPoints, { lat, lng }]);
    
    // Draw marker
    L.marker([lat, lng]).addTo(mapRef.current);
    
    // Draw line if more than 1 point
    if (polygonPoints.length > 0) {
      const allPoints = [...polygonPoints, { lat, lng }];
      L.polyline(allPoints.map(p => [p.lat, p.lng]), { color: 'red' }).addTo(mapRef.current);
    }
  };

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.on('click', addPoint);
    }
  }, [drawing, polygonPoints]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-red-500">Create Game - Lock Zone</h1>
          <p className="text-gray-400">Draw a freeform polygon for your hunt zone</p>
        </header>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <label className="block text-sm font-medium mb-2">Game Name</label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="My Manhunt Game"
                className="w-full px-3 py-2 bg-gray-700 rounded-lg"
              />
            </div>

            <div className="bg-gray-800 rounded-xl p-4 space-y-3">
              {!drawing && !locked && (
                <button
                  onClick={startDrawing}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
                >
                  Start Drawing Zone
                </button>
              )}
              
              {drawing && !locked && (
                <div className="text-center">
                  <p className="text-sm text-yellow-400 mb-2">Click on map to add points</p>
                  <p className="text-xs text-gray-400">{polygonPoints.length} points added</p>
                </div>
              )}
              
              {polygonPoints.length >= 3 && !locked && (
                <button
                  onClick={lockZone}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold"
                >
                  Lock Zone & Create Game
                </button>
              )}
              
              {locked && (
                <div className="text-center text-green-400 font-bold">
                  Zone Locked!
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-xl overflow-hidden h-[600px]">
              <div id="map" style={{ height: '100%', width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}