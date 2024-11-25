// src/components/AudioFeaturesViz.tsx
import React, { useState } from 'react';
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { LineRadial, LineRadialCurve } from '@visx/shape';
import { Text } from '@visx/text';

interface Song {
  id: string;
  name: string;
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
}

interface AudioFeaturesVizProps {
  width?: number;
  height?: number;
  songs: Song[];
}

// Remove speechiness from features
const FEATURES = [
  'acousticness',
  'danceability',
  'energy',
  'instrumentalness',
  'liveness',
  'valence'
] as const;

type Feature = (typeof FEATURES)[number];

const AudioFeaturesViz: React.FC<AudioFeaturesVizProps> = ({ 
  width = 600, 
  height = 600, 
  songs = [] 
}) => {
  const [hoveredSong, setHoveredSong] = useState<string | null>(null);
  
  // Calculate dimensions
  const radius = Math.min(width, height) / 2 - 100;
  const centerY = height / 2;
  const centerX = width / 2;

  // Create scales
  const radialScale = scaleLinear({
    domain: [0, 1],
    range: [0, radius],
  });

  // Calculate angle for each feature
  const angleStep = (2 * Math.PI) / FEATURES.length;

  // Generate points for each song
  const generatePoints = (song: Song) => {
    return FEATURES.map((feature, i) => ({
      feature,
      angle: i * angleStep,
      radius: radialScale(song[feature]),
    }));
  };

  // Function to generate path coordinates
  const generatePathCoordinates = (song: Song) => {
    const points = generatePoints(song);
    return points.map((point, i) => {
      const x = point.radius * Math.cos(point.angle - Math.PI / 2);
      const y = point.radius * Math.sin(point.angle - Math.PI / 2);
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ') + 'Z';
  };

  // Generate background circles
  const backgroundCircles = [0.2, 0.4, 0.6, 0.8, 1].map(percentage => {
    const r = radialScale(percentage);
    return {
      radius: r,
      label: (percentage * 100).toString()
    };
  });

  return (
    <div className="relative w-full h-full">
      <svg width={width} height={height}>
        <Group top={centerY} left={centerX}>
          {/* Background circles */}
          {backgroundCircles.map(({ radius, label }) => (
            <g key={radius}>
              <circle
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <text
                y={-radius}
                dx="0.5em"
                dy="0.3em"
                fontSize={10}
                fill="#94a3b8"
              >
                {label}%
              </text>
            </g>
          ))}

          {/* Axis lines and labels */}
          {FEATURES.map((feature, i) => {
            const angle = i * angleStep;
            const x = radius * Math.cos(angle - Math.PI / 2);
            const y = radius * Math.sin(angle - Math.PI / 2);
            return (
              <g key={feature}>
                <line
                  x1={0}
                  y1={0}
                  x2={x}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <Text
                  x={x * 1.1}
                  y={y * 1.1}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#475569"
                >
                  {feature}
                </Text>
              </g>
            );
          })}

          {/* Song paths */}
          {songs.map((song, index) => {
            const color = `hsl(${(index * 360) / songs.length}, 70%, 50%)`;
            const isHovered = hoveredSong === song.id;
            return (
              <path
                key={song.id}
                d={generatePathCoordinates(song)}
                fill={color}
                fillOpacity={isHovered ? 0.6 : 0.3}
                stroke={color}
                strokeWidth={isHovered ? 2 : 1}
                onMouseEnter={() => setHoveredSong(song.id)}
                onMouseLeave={() => setHoveredSong(null)}
              />
            );
          })}
        </Group>
      </svg>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white p-4 rounded shadow-lg">
        {songs.map((song, index) => (
          <div 
            key={song.id}
            className={`text-sm text-gray-900 flex items-center gap-2 ${
              hoveredSong === song.id ? 'font-bold' : ''
            }`}
            onMouseEnter={() => setHoveredSong(song.id)}
            onMouseLeave={() => setHoveredSong(null)}
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ 
                backgroundColor: `hsl(${(index * 360) / songs.length}, 70%, 50%)`
              }} 
            />
            <span>{song.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudioFeaturesViz;