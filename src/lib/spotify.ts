import { SpotifyApi, ClientCredentialsStrategy } from '@spotify/web-api-ts-sdk';

// Assert the environment variables are defined
const client_id = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
const client_secret = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET!;

// Validate credentials are present
if (!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || !process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET) {
  throw new Error('Missing Spotify credentials in environment variables');
}

let spotifyApi: SpotifyApi | null = null;

export async function getSpotifyApi(): Promise<SpotifyApi> {
  if (!spotifyApi) {
    const authStrategy = new ClientCredentialsStrategy(client_id, client_secret);
    spotifyApi = new SpotifyApi(authStrategy);
  }
  
  return spotifyApi;
}

// Optional: Add a method to force new instance
export async function refreshSpotifyApi(): Promise<SpotifyApi> {
  spotifyApi = null;
  return getSpotifyApi();
}