// src/app/page.tsx
'use client';

import { useState } from 'react';
import { UnifiedSearch } from '@/components/UnifiedSearch';
import ComparisonViz from '@/components/ComparisonViz';
import { getSpotifyApi } from '@/lib/spotify';

interface SongWithFeatures {
  id: string;
  name: string;
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  duration_ms: number;
  loudness: number;
  tempo: number;
  key: number;
}

export default function Home() {
  // Left side state
  const [leftSongs, setLeftSongs] = useState<SongWithFeatures[]>([]);
  const [leftLoading, setLeftLoading] = useState(false);
  const [leftError, setLeftError] = useState('');
  const [leftLabel, setLeftLabel] = useState('Set A');

  // Right side state
  const [rightSongs, setRightSongs] = useState<SongWithFeatures[]>([]);
  const [rightLoading, setRightLoading] = useState(false);
  const [rightError, setRightError] = useState('');
  const [rightLabel, setRightLabel] = useState('Set B');

  const fetchAlbumTracks = async (albumId: string, token: string) => {
    const tracks = [];
    let url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;
    
    while (url) {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      tracks.push(...data.items);
      url = data.next;
    }
    
    return tracks.map(track => ({
      id: track.id,
      name: track.name
    }));
  };

  const fetchArtistAlbums = async (artistId: string, token: string) => {
    const albums = [];
    let url = `https://api.spotify.com/v1/artists/${artistId}/albums?limit=50`;
    
    while (url) {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      albums.push(...data.items);
      url = data.next;
    }
    
    return albums;
  };

  const handleSelect = async (type: 'artist' | 'album', id: string, side: 'left' | 'right') => {
    const setLoading = side === 'left' ? setLeftLoading : setRightLoading;
    const setError = side === 'left' ? setLeftError : setRightError;
    const setSongs = side === 'left' ? setLeftSongs : setRightSongs;
    const setLabel = side === 'left' ? setLeftLabel : setRightLabel;
    
    try {
      setLoading(true);
      setError('');
      
      const spotifyApi = await getSpotifyApi();
      const token = await spotifyApi.getAccessToken();

      let tracks;
      let label = '';
      
      if (type === 'artist') {
        // Get artist name for label
        const artist = await spotifyApi.artists.get(id);
        label = artist.name;

        // Get all albums
        const albums = await fetchArtistAlbums(id, token.access_token);
        
        // Get all tracks from each album
        const trackPromises = albums.map(album => 
          fetchAlbumTracks(album.id, token.access_token)
        );
        
        const tracksNestedArray = await Promise.all(trackPromises);
        tracks = tracksNestedArray.flat();
      } else {
        // For albums, get album name and tracks
        const album = await spotifyApi.albums.get(id);
        label = album.name;
        tracks = await fetchAlbumTracks(id, token.access_token);
      }

      // Remove duplicates based on track ID
      const uniqueTracks = Array.from(
        new Map(tracks.map(track => [track.id, track])).values()
      );

      // Get audio features and analysis in batches of 100 (API limit)
      const audioFeaturesBatches = [];
      const audioAnalysisBatches = [];
      for (let i = 0; i < uniqueTracks.length; i += 100) {
        const batch = uniqueTracks.slice(i, i + 100);
        const trackIds = batch.map(track => track.id);
        
        // Get audio features
        const features = await spotifyApi.tracks.audioFeatures(trackIds);
        audioFeaturesBatches.push(features);

        // Get additional track details
        const trackDetails = await fetch(
          `https://api.spotify.com/v1/tracks?ids=${trackIds.join(',')}`,
          {
            headers: { 'Authorization': `Bearer ${token.access_token}` }
          }
        ).then(res => res.json());
        audioAnalysisBatches.push(trackDetails.tracks);
      }

      // Combine all data
      const songsWithFeatures = uniqueTracks.map((track, index) => {
        const batchIndex = Math.floor(index / 100);
        const batchOffset = index % 100;
        const features = audioFeaturesBatches[batchIndex][batchOffset];
        const analysis = audioAnalysisBatches[batchIndex][batchOffset];
        
        return {
          ...track,
          ...features,
          duration_ms: analysis.duration_ms,
          loudness: features.loudness,
          tempo: features.tempo,
          key: features.key
        };
      });

      setSongs(songsWithFeatures);
      setLabel(label);

    } catch (err) {
      console.error('Error details:', err);
      setError('Error fetching data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white">
      <div className="flex flex-col gap-8" style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Search Container */}
        <div className="flex justify-between">
          {/* Left Search */}
          <div className="w-[400px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-300">First Artist/Album</h2>
            <UnifiedSearch 
              onSelect={(type, id) => handleSelect(type, id, 'left')}
              isLoading={leftLoading}
            />
            {leftError && (
              <div className="text-red-400 mt-2">{leftError}</div>
            )}
          </div>

          {/* Right Search */}
          <div className="w-[400px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-300">Second Artist/Album</h2>
            <UnifiedSearch 
              onSelect={(type, id) => handleSelect(type, id, 'right')}
              isLoading={rightLoading}
            />
            {rightError && (
              <div className="text-red-400 mt-2">{rightError}</div>
            )}
          </div>
        </div>

        {/* Visualization Container */}
        <div className="flex flex-col">
          {/* <div className="text-center mb-4">
            <h2 className="text-2xl font-semibold mb-2 text-gray-300">Audio Features Comparison</h2>
            <p className="text-gray-400">
              {leftSongs.length > 0 && rightSongs.length > 0 ? (
                `Comparing ${leftSongs.length} songs from ${leftLabel} with ${rightSongs.length} songs from ${rightLabel}`
              ) : (
                'Search for artists or albums above to compare their audio features'
              )}
            </p>
          </div> */}
          
          <ComparisonViz
            leftSongs={leftSongs}
            rightSongs={rightSongs}
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            width={1500}
            height={700}
          />
        </div>
      </div>
    </main>
  );
}