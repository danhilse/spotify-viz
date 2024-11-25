// src/app/page.tsx
'use client';

import { useState } from 'react';
import { ArtistSearch } from '@/components/ArtistSearch';
import AudioFeaturesViz from '@/components/AudioFeaturesViz';
import { getSpotifyApi } from '@/lib/spotify';
import type { Track } from '@spotify/web-api-ts-sdk';

interface SongWithFeatures extends Track {
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  valence: number;
}

export default function Home() {
  const [songs, setSongs] = useState<SongWithFeatures[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchArtistTopTracks = async (artistId: string) => {
    try {
      setLoading(true);
      setError('');
      
      const spotifyApi = await getSpotifyApi();
      
      // Get artist's top tracks
      const topTracks = await spotifyApi.artists.topTracks(artistId, 'US');
      
      // Get audio features for all tracks at once
      const audioFeatures = await spotifyApi.tracks.audioFeatures(
        topTracks.tracks.map(track => track.id)
      );

      // Combine track info with audio features
      const songsWithFeatures = topTracks.tracks.map((track, index) => ({
        ...track,
        ...audioFeatures[index]
      })) as SongWithFeatures[];

      setSongs(songsWithFeatures);
    } catch (err) {
      console.error('Error details:', err);
      setError('Error fetching artist data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          Artist Top Tracks Analysis
        </h1>
        
        <div className="mb-8">
          <ArtistSearch onArtistSelect={fetchArtistTopTracks} />
        </div>

        {loading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        )}

        {error && (
          <div className="text-red-500 mb-4">{error}</div>
        )}

        {!loading && songs.length > 0 && (
          <div>
            <p className="mb-4 text-gray-700">
              Showing top {songs.length} tracks
            </p>
            <div className="w-full aspect-square">
              <AudioFeaturesViz
                songs={songs}
                width={800}
                height={800}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}