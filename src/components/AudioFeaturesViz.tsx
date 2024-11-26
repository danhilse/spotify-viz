import React, { useState } from 'react';
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
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
  duration_ms: number;
  loudness: number;
  tempo: number;
  key: number;
}

interface AudioFeaturesVizProps {
  width?: number;
  height?: number;
  songs: Song[];
}

const FEATURES = [
  'tempo',
  'danceability',
  'energy',
  'acousticness',
  'instrumentalness',
  'loudness',
  'valence',
//   'liveness',
  'duration',
//   'key'
] as const;

// Warm color palette
const COLORS = [
    '#FF6B6B', // Coral red
    '#FF8E72', // Salmon
    '#FFA07A', // Light salmon
    '#FFB347', // Orange
    '#FFD700', // Gold
  ];

type Feature = (typeof FEATURES)[number];

// Try different blend modes for different effects
type BlendMode = 'screen' | 'plus-lighter' | 'lighten' | 'hard-light' | 'overlay';
const BLEND_MODE: BlendMode = 'screen'; // Try changing this to experiment


const getOpacityScale = (numTracks: number) => {
    // More aggressive scaling for larger datasets
    // Start with lower base opacity and use gentler power scaling
    const baseOpacity = Math.max(0.008, 1 / Math.pow(numTracks, 0.6));
    
    return {
      fill: baseOpacity * .4,      // Reduced fill opacity
      stroke: baseOpacity * 1,    // Reduced stroke opacity
      hoverFill: 0.08,             // Subtle fill on hover
      hoverStroke: 0.5             // Medium stroke on hover
    };
  };



const formatFeatureLabel = (feature: Feature): string => {
    switch (feature) {
    case 'duration':
        return 'Duration';
    case 'loudness':
        return 'Loudness';
    case 'tempo':
        return 'BPM';
    // case 'key':
    //   return 'Key';
    default:
        return feature.charAt(0).toUpperCase() + feature.slice(1);
    }
};

const AudioFeaturesViz: React.FC<AudioFeaturesVizProps> = ({ 
  width = 900, 
  height = 800, 
  songs = [] 
}) => {
  const [hoveredSong, setHoveredSong] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; } | null>(null);
  
  const normalizeValue = (song: Song, feature: Feature): number => {
    switch (feature) {
      case 'duration':
        const maxDuration = 400000;
        return song.duration_ms / maxDuration;
      case 'loudness':
        return (song.loudness + 60) / 60;
      case 'tempo':
        return Math.max(0, Math.min(1, (song.tempo - 40) / 160));
    //   case 'key':
    //     return song.key / 11;
      default:
        return song[feature];
    }
  };

  const formatValue = (song: Song, feature: Feature): string => {
    switch (feature) {
      case 'duration':
        return `${Math.round(song.duration_ms / 1000)}s`;
      case 'loudness':
        return `${song.loudness.toFixed(1)} dB`;
      case 'tempo':
        return `${Math.round(song.tempo)} BPM`;
    //   case 'key':
    //     const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    //     return keys[song.key] || 'Unknown';
      default:
        return `${(song[feature] * 100).toFixed(0)}%`;
    }
  };
  
  const opacities = getOpacityScale(songs.length);
  
  const legendWidth = 240;
  const graphWidth = width - legendWidth;
  const radius = Math.min(graphWidth, height) / 2 - 100;
  const centerY = height / 2;
  const centerX = graphWidth / 2;

  const radialScale = scaleLinear({
    domain: [0, 1],
    range: [0, radius],
  });

  const angleStep = (2 * Math.PI) / FEATURES.length;

  const generatePoints = (song: Song) => {
    return FEATURES.map((feature, i) => ({
      feature,
      angle: i * angleStep,
      radius: radialScale(normalizeValue(song, feature)),
    }));
  };

  const generatePathCoordinates = (song: Song) => {
    const points = generatePoints(song);
    const linePoints = points.map((point) => ({
      x: point.radius * Math.cos(point.angle - Math.PI / 2),
      y: point.radius * Math.sin(point.angle - Math.PI / 2),
    }));

    let path = `M ${linePoints[0].x},${linePoints[0].y}`;
    for (let i = 0; i < linePoints.length; i++) {
      const current = linePoints[i];
      const next = linePoints[(i + 1) % linePoints.length];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      path += ` Q ${current.x},${current.y} ${midX},${midY}`;
    }
    path += ' Z';
    return path;
  };

  const handleMouseMove = (event: React.MouseEvent<SVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  };

  const getColor = (index: number, isHovered: boolean) => {
    if (isHovered) {
      return 'rgba(255, 255, 255, 0.95)'; // Almost pure white when hovered
    }
    // For non-hovered state, add some intensity
    const baseColor = COLORS[index % COLORS.length];
    return baseColor;
  };

  return (
    <div className="relative w-full h-full flex">
      <div className="flex-shrink-0 relative">
        <svg 
          width={graphWidth} 
          height={height} 
          className="relative bg-gray-900 rounded-lg shadow-lg"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHoveredSong(null);
            setTooltipPosition(null);
          }}
        >
          <Group top={centerY} left={centerX}>
            {/* Background circles */}
            {[0.2, 0.4, 0.6, 0.8, 1].map((percentage) => (
              <circle
                key={percentage}
                r={radialScale(percentage)}
                fill="none"
                stroke="#ffffff10"
                strokeWidth={1}
              />
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
                    stroke="#ffffff08"
                    strokeWidth={1}
                  />
                  <Text
                    x={x * 1.15}
                    y={y * 1.15}
                    textAnchor="middle"
                    fontSize={14}
                    fill="#ffffff60"
                    fontFamily="system-ui"
                  >
                    {formatFeatureLabel(feature)}
                  </Text>
                </g>
              );
            })}

{songs.map((song, index) => {
              const isHovered = song.id === hoveredSong;
              const color = getColor(index, isHovered);
              
              return (
                <g key={song.id} style={{ mixBlendMode: BLEND_MODE }}>
                  {/* Filled Path */}
                  <path
                    d={generatePathCoordinates(song)}
                    fill={color}
                    fillOpacity={isHovered ? opacities.hoverFill : opacities.fill}
                    stroke="transparent"
                    pointerEvents="none"
                  />
                  {/* Hover Detection Path */}
                  <path
                    d={generatePathCoordinates(song)}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={12}
                    strokeOpacity={0}
                    onMouseEnter={() => setHoveredSong(song.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Visible Stroke */}
                  <path
                    d={generatePathCoordinates(song)}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={isHovered ? 1 : .5}
                    strokeOpacity={isHovered ? opacities.hoverStroke : opacities.stroke}
                    pointerEvents="none"
                    style={{ mixBlendMode: BLEND_MODE }}
                  />
                </g>
              );
            })}
          </Group>
        </svg>

        {/* Tooltip */}
        {hoveredSong && tooltipPosition && (
          <div
            className="absolute pointer-events-none bg-gray-900/90 px-3 py-2 rounded-lg text-white text-sm shadow-lg"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y + 10,
              transform: 'translate(0, -50%)'
            }}
          >
            {songs.find(s => s.id === hoveredSong)?.name}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="ml-8 flex-shrink-0 w-60 overflow-y-auto max-h-full">
        <div className="bg-[#0a0c14] p-4 rounded">
          <div className="mb-4">
            <h3 className="font-medium text-gray-300 text-lg">Tracks</h3>
            <p className="text-sm text-gray-500">Total: {songs.length}</p>
          </div>
          <div className="space-y-2">
            {songs.map((song, index) => {
              const isHovered = hoveredSong === song.id;
              const color = getColor(index, isHovered);
              return (
                <div 
                  key={song.id}
                  className={`flex flex-col gap-1 py-2 px-2 rounded transition-colors ${
                    isHovered ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'
                  }`}
                  onMouseEnter={() => setHoveredSong(song.id)}
                  onMouseLeave={() => setHoveredSong(null)}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }} 
                    />
                    <span className="truncate font-medium text-sm" title={song.name}>
                      {song.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioFeaturesViz;