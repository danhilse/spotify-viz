import React, { useState, useRef } from 'react';
import { getSpotifyApi } from '@/lib/spotify';
import type { Artist, Album } from '@spotify/web-api-ts-sdk';
import { Music, User } from 'lucide-react';


interface SearchResult {
  id: string;
  type: 'artist' | 'album';
  name: string;
  images: { url: string }[];
  artists?: { name: string; id?: string }[];
  followers?: { total: number };
  popularity?: number;
}

interface UnifiedSearchProps {
  onSelect: (type: 'artist' | 'album', id: string) => void;
  isLoading: boolean;
}

const MAJOR_ARTISTS = new Set([
    'beatles', 'bob dylan', 'pink floyd', 'led zeppelin', 
    'queen', 'david bowie', 'rolling stones', 'beach boys',
    'the who', 'eagles', 'fleetwood mac', 'bruce springsteen'
  ]);
  
  const normalizeSearchString = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/(^the |^a |^an )/i, '')
      .replace(/([\(\[]).*?([\)\]])/g, '')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .trim();
  };
  
  const compareNames = (name1: string, name2: string): boolean => {
    const n1 = normalizeSearchString(name1);
    const n2 = normalizeSearchString(name2);
    
    if (n1 === n2) return true;
    if (n1.includes(n2) || n2.includes(n1)) return true;
    if (`the ${n1}` === n2 || `the ${n2}` === n1) return true;
    
    return false;
  };
  
  const isLikelyAlbumSearch = (query: string): boolean => {
    // Common words that suggest an album search rather than artist search
    const albumIndicators = ['album', 'record', 'soundtrack', 'vol', 'volume', 'collection', 'deluxe', 'remaster'];
    const normalizedQuery = normalizeSearchString(query);
    
    // Check if query matches any known album titles exactly
    const knownAlbums = new Set([
      'rubber soul', 'revolver', 'abbey road', 'white album', 'sgt pepper', 
      'dark side of the moon', 'the wall', 'led zeppelin iv', 'houses of the holy',
      'blonde on blonde', 'highway 61', 'blood on the tracks'
    ]);
    
    return albumIndicators.some(indicator => normalizedQuery.includes(indicator)) ||
           knownAlbums.has(normalizedQuery);
  };


export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({ onSelect, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  // Calculate match score for sorting
  const getMatchScore = (result: SearchResult, query: string): number => {
    const searchNorm = normalizeSearchString(query);
    const nameNorm = normalizeSearchString(result.name);
    const isAlbumSearch = isLikelyAlbumSearch(query);
    
    let score = 0;
    
    // Base text matching score
    const exactMatch = compareNames(result.name, query);
    if (exactMatch) {
      score += 10000;
    } else if (nameNorm.startsWith(searchNorm) || searchNorm.startsWith(nameNorm)) {
      score += 8000;
    } else if (nameNorm.includes(searchNorm) || searchNorm.includes(nameNorm)) {
      score += 6000;
    }

    // Album-specific scoring
    if (result.type === 'album') {
      const nameMatchScore = score;
      const artistMatch = result.artists?.some(artist => compareNames(artist.name, query));
      
      // Calculate artist popularity
      let artistPopularityBoost = 0;
      if (result.artists?.some(artist => 
        MAJOR_ARTISTS.has(normalizeSearchString(artist.name))
      )) {
        artistPopularityBoost = 5000;
      }

      // If this looks like an album search and we have a name match
      if (isAlbumSearch && nameMatchScore > 0) {
        score = nameMatchScore * 2; // Double the name match score
        score += (result.popularity || 0) * 100; // Heavy album popularity boost
        score += artistPopularityBoost; // Add artist popularity
      }
      // If we match the artist name
      else if (artistMatch) {
        score = 7000; // Base score for artist match
        score += (result.popularity || 0) * 50; // Medium album popularity boost
        score += artistPopularityBoost; // Add artist popularity
      }
      // Otherwise use normal scoring
      else {
        score = nameMatchScore;
        score += (result.popularity || 0) * 30; // Lower album popularity boost
        score += artistPopularityBoost / 2; // Reduced artist popularity boost
      }
    }
    
    // Artist-specific scoring
    if (result.type === 'artist') {
      const artistNameMatch = compareNames(result.name, query);
      
      if (artistNameMatch) {
        score += (result.popularity || 0) * 50;
        score += Math.min(3000, Math.log(result.followers?.total || 1) * 100);
        
        // Extra boost for major artists
        if (MAJOR_ARTISTS.has(normalizeSearchString(result.name))) {
          score += 5000;
        }
      } else if (!isAlbumSearch) {
        // Only give non-matching artists a score if this isn't an album search
        score += (result.popularity || 0) * 10;
      } else {
        // Significantly reduce artist scores for album searches
        score = Math.min(score, 1000);
      }
    }
    
    return score;
  };


  // Rest of the component remains the same...
  React.useEffect(() => {
    if (isLoading) {
      setResults([]);
    }
  }, [isLoading]);
  
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setResults([]);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = async (query: string) => {
    if (!query.trim() || (selectedItem && query === selectedItem.name)) {
      setResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      setError('');
      const spotifyApi = await getSpotifyApi();
      const response = await spotifyApi.search(query, ['artist', 'album'], undefined, 50);
      
      if (!isLoading) {
        const combinedResults: SearchResult[] = [
          ...response.artists.items.map(artist => ({
            ...artist,
            type: 'artist' as const
          })),
          ...response.albums.items.map(album => ({
            ...album,
            type: 'album' as const
          }))
        ];

        const sortedResults = combinedResults
          .map(result => ({
            result,
            score: getMatchScore(result, query)
          }))
          .sort((a, b) => b.score - a.score)
          .map(({ result }) => result);

        setResults(sortedResults);
      }
    } catch (err) {
      setError('Error searching');
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  React.useEffect(() => {
    if (isLoading || (selectedItem && searchTerm === selectedItem.name)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (searchTerm && (!selectedItem || searchTerm !== selectedItem.name)) {
        search(searchTerm);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isLoading, selectedItem]);

  const handleSelect = (result: SearchResult) => {
    setSelectedItem(result);
    setSearchTerm(result.name);
    setResults([]);
    onSelect(result.type, result.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    if (!selectedItem || newValue !== selectedItem.name) {
      setSelectedItem(null);
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
            if (searchTerm && (!selectedItem || searchTerm !== selectedItem.name) && !isLoading) {
              search(searchTerm);
            }
          }}
          placeholder="Search for an artist or album..."
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

      {results.length > 0 && !isLoading && (
        <div className="mt-2 bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto absolute w-full z-10">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full text-left p-3 hover:bg-gray-100 flex items-center space-x-3 border-b last:border-b-0"
            >
              <div className="relative">
                {result.images?.[0] ? (
                  <img
                    src={result.images[0].url}
                    alt={result.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                    {result.type === 'artist' ? (
                      <User className="w-6 h-6 text-gray-400" />
                    ) : (
                      <Music className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                )}
                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gray-200 text-xs font-medium text-gray-700">
                  {result.type}
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-900 truncate">{result.name}</div>
                <div className="text-sm text-gray-500 truncate">
                  {result.type === 'artist' && result.followers ? (
                    `${result.followers.total.toLocaleString()} followers`
                  ) : result.type === 'album' && result.artists ? (
                    `${result.artists.map(a => a.name).join(', ')}`
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnifiedSearch;