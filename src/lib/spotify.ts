// src/lib/spotify.ts
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

const client_id = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const client_secret = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;

if (!client_id || !client_secret) {
  throw new Error('Missing Spotify credentials in environment variables');
}

let tokenData: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid token
  if (tokenData && tokenData.expires_at > Date.now()) {
    return tokenData.access_token;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(client_id + ':' + client_secret),
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get access token');
  }

  const data = await response.json();
  
  // Store token with expiration
  tokenData = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in * 1000), // Convert to milliseconds
  };

  return data.access_token;
}

// Create and cache Spotify API instance
let spotifyApi: SpotifyApi | null = null;

export async function getSpotifyApi(): Promise<SpotifyApi> {
  const token = await getAccessToken();
  
  if (!spotifyApi) {
    spotifyApi = SpotifyApi.withAccessToken(client_id, {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
    });
  }
  
  return spotifyApi;
}