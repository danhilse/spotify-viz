// src/app/page.tsx
'use client';

import { useState } from 'react';
import { UnifiedSearch } from '@/components/UnifiedSearch';
import AudioFeaturesViz from '@/components/AudioFeaturesViz';
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
  const [songs, setSongs] = useState<SongWithFeatures[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSelect = async (type: 'artist' | 'album', id: string) => {
    try {
      setLoading(true);
      setError('');
      
      const spotifyApi = await getSpotifyApi();
      const token = await spotifyApi.getAccessToken();

      let tracks;
      
      if (type === 'artist') {
        // Get all albums first
        const albums = await fetchArtistAlbums(id, token.access_token);
        
        // Get all tracks from each album
        const trackPromises = albums.map(album => 
          fetchAlbumTracks(album.id, token.access_token)
        );
        
        const tracksNestedArray = await Promise.all(trackPromises);
        tracks = tracksNestedArray.flat();
      } else {
        // For albums, just get tracks from that album
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

    } catch (err) {
      console.error('Error details:', err);
      setError('Error fetching data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <UnifiedSearch 
            onSelect={handleSelect}
            isLoading={loading}
          />
        </div>

        {error && (
          <div className="text-red-400 mb-4">{error}</div>
        )}

        {!loading && songs.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-300">Audio Features Analysis</h2>
            <p className="mb-4 text-gray-400">
              Showing analysis for {songs.length} unique songs
            </p>
            <div className="w-full aspect-square">
              <AudioFeaturesViz
                songs={songs}
                width={1200}
                height={800}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}