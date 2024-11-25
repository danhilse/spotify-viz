// src/components/ArtistSearch.tsx
import React, { useState, useRef } from 'react';
import { getSpotifyApi } from '@/lib/spotify';
import type { Artist } from '@spotify/web-api-ts-sdk';

interface ArtistSearchProps {
  onArtistSelect: (artistId: string) => void;
}

export const ArtistSearch: React.FC<ArtistSearchProps> = ({ onArtistSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setArtists([]); // Close the dropdown
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchArtists = async (query: string) => {
    if (!query.trim()) {
      setArtists([]);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const spotifyApi = await getSpotifyApi();
      const response = await spotifyApi.search(query, ['artist'], undefined, 10);
      setArtists(response.artists.items);
    } catch (err) {
      setError('Error searching for artists');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchArtists(searchTerm);
      } else {
        setArtists([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleArtistSelect = (artist: Artist) => {
    onArtistSelect(artist.id);
    setSearchTerm(artist.name);
    setArtists([]); // Close dropdown
    // Remove focus from input
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <div className="w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={() => searchTerm && searchArtists(searchTerm)} // Re-open dropdown when clicking input
          placeholder="Search for an artist..."
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-500 mt-2 text-sm">{error}</div>
      )}

      {artists.length > 0 && (
        <div className="mt-2 bg-white rounded-lg shadow-lg border max-h-60 overflow-y-auto absolute w-full z-10">
          {artists.map((artist) => (
            <button
              key={artist.id}
              onClick={() => handleArtistSelect(artist)}
              className="w-full text-left p-3 hover:bg-gray-100 flex items-center space-x-3 border-b last:border-b-0"
            >
              {artist.images?.[0] && (
                <img
                  src={artist.images[0].url}
                  alt={artist.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div className="min-w-0">
                <div className="font-medium text-gray-900 truncate">{artist.name}</div>
                {artist.followers && (
                  <div className="text-sm text-gray-500 truncate">
                    {artist.followers.total.toLocaleString()} followers
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};