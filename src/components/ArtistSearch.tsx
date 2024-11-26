// src/components/ArtistSearch.tsx
import React, { useState, useRef } from 'react';
import { getSpotifyApi } from '@/lib/spotify';
import type { Artist } from '@spotify/web-api-ts-sdk';

interface ArtistSearchProps {
  onArtistSelect: (artistId: string) => void;
  isLoading: boolean;
}

export const ArtistSearch: React.FC<ArtistSearchProps> = ({ onArtistSelect, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  // Clear artists when parent is loading
  React.useEffect(() => {
    if (isLoading) {
      setArtists([]);
    }
  }, [isLoading]);
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setArtists([]);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchArtists = async (query: string) => {
    if (!query.trim() || query === selectedArtist) {
      setArtists([]);
      return;
    }

    try {
      setSearchLoading(true);
      setError('');
      const spotifyApi = await getSpotifyApi();
      const response = await spotifyApi.search(query, ['artist'], undefined, 10);
      if (!isLoading) {
        setArtists(response.artists.items);
      }
    } catch (err) {
      setError('Error searching for artists');
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  React.useEffect(() => {
    if (isLoading || searchTerm === selectedArtist) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (searchTerm && searchTerm !== selectedArtist) {
        searchArtists(searchTerm);
      } else {
        setArtists([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isLoading, selectedArtist]);

  const handleArtistSelect = (artist: Artist) => {
    setSelectedArtist(artist.name);
    setSearchTerm(artist.name);
    setArtists([]); // Clear results immediately
    onArtistSelect(artist.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    if (newValue !== selectedArtist) {
      setSelectedArtist(''); // Clear selected artist if search term changes
    }
  };

  return (
    <div className="w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onClick={() => {
            if (searchTerm && searchTerm !== selectedArtist && !isLoading) {
              searchArtists(searchTerm);
            }
          }}
          placeholder="Search for an artist..."
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
          disabled={isLoading}
        />
        {(searchLoading || isLoading) && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
          </div>
        )}
      </div>

      {error && !isLoading && (
        <div className="text-red-500 mt-2 text-sm">{error}</div>
      )}

      {artists.length > 0 && !isLoading && (
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