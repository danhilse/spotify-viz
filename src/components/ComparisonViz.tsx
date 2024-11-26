import React, { useState } from 'react';
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { Text } from '@visx/text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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

interface ComparisonVizProps {
  width?: number;
  height?: number;
  leftSongs: Song[];
  rightSongs: Song[];
  leftLabel?: string;
  rightLabel?: string;
}

const FEATURES = [
  'tempo',
  'danceability',
  'energy',
  'acousticness',
  'loudness',
  'valence',
  'duration',
] as const;

// Warm vs Cool color palettes
const LEFT_COLORS = [
  '#FF6B6B', // Coral red
  '#FF8E72', // Salmon
  '#FFA07A', // Light salmon
];

const RIGHT_COLORS = [
  '#4169E1', // Royal blue
  '#6495ED', // Cornflower blue
  '#87CEEB', // Sky blue
];

type Feature = (typeof FEATURES)[number];
type BlendMode = 'screen' | 'plus-lighter' | 'lighten' | 'overlay' | 'multiply';
const BLEND_MODE: BlendMode = 'screen';

const getOpacityScale = (numTracks: number) => {
  const baseOpacity = Math.max(0.008, 1 / Math.pow(numTracks, 0.6));
  return {
    fill: baseOpacity * 0.3,
    stroke: baseOpacity * 1,
    hoverFill: 0.08,
    hoverStroke: 0.5
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
    default:
      return feature.charAt(0).toUpperCase() + feature.slice(1);
  }
};

const ComparisonViz: React.FC<ComparisonVizProps> = ({
    width = 900,
    height = 800,
    leftSongs = [],
    rightSongs = [],
    leftLabel = "Set A",
    rightLabel = "Set B"
  }) => {
    const [hoveredSong, setHoveredSong] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; } | null>(null);
  
    const legendWidth = 240;
    const graphWidth = 800; // Fixed graph width
    const radius = Math.min(graphWidth, height) / 2 - 60;
    const centerY = height / 2;
    const centerX = graphWidth / 2;

  const normalizeValue = (song: Song, feature: Feature): number => {
    switch (feature) {
      case 'duration':
        const maxDuration = 300000;
        return song.duration_ms / maxDuration;
      case 'loudness':
        return (song.loudness + 60) / 60;
      case 'tempo':
        return Math.max(0, Math.min(1, (song.tempo - 40) / 160));
      default:
        return song[feature];
    }
  };

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

  const getColor = (index: number, isLeft: boolean, isHovered: boolean) => {
    if (isHovered) {
      return isLeft ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    }
    const colors = isLeft ? LEFT_COLORS : RIGHT_COLORS;
    return colors[index % colors.length];
  };

  const leftOpacities = getOpacityScale(leftSongs.length);
  const rightOpacities = getOpacityScale(rightSongs.length);

  return (
    <div className="w-full flex justify-center">
      <div className="flex items-start gap-8" style={{ width: '1400px' }}>
        {/* Left Legend - Fixed width */}
        <div className="w-60 flex-shrink-0 pl-8">
          <div className="bg-[#0a0c14] p-4 rounded">
            <div className="mb-4">
              <h3 className="font-medium text-gray-300 text-lg">{leftLabel}</h3>
              <p className="text-sm text-gray-500">
                {leftSongs.length > 0 ? `${leftSongs.length} tracks` : 'No tracks selected'}
              </p>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {leftSongs.map((song, index) => (
                <SongLegendItem
                  key={song.id}
                  song={song}
                  index={index}
                  isLeft={true}
                  isHovered={hoveredSong === song.id}
                  onHover={setHoveredSong}
                  getColor={getColor}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Center Graph - Fixed width */}
        <div className="flex-shrink-0 relative">
          <svg 
            width={graphWidth} 
            height={height} 
            className="bg-gray-900 rounded-lg"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              setHoveredSong(null);
              setTooltipPosition(null);
            }}
          >
            <Group top={centerY} left={centerX}>
            {/* Background circles and axis lines remain the same */}
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

            {/* Song paths */}
            {leftSongs.map((song, index) => (
              <SongPath
                key={song.id}
                song={song}
                index={index}
                isLeft={true}
                isHovered={hoveredSong === song.id}
                onHover={setHoveredSong}
                generatePathCoordinates={generatePathCoordinates}
                getColor={getColor}
                opacities={getOpacityScale(leftSongs.length)}
              />
            ))}

            {rightSongs.map((song, index) => (
              <SongPath
                key={song.id}
                song={song}
                index={index}
                isLeft={false}
                isHovered={hoveredSong === song.id}
                onHover={setHoveredSong}
                generatePathCoordinates={generatePathCoordinates}
                getColor={getColor}
                opacities={getOpacityScale(rightSongs.length)}
              />
            ))}
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
              {[...leftSongs, ...rightSongs].find(s => s.id === hoveredSong)?.name}
            </div>
          )}
        </div>

        {/* Right Legend - Fixed width */}
        <div className="w-60 flex-shrink-0 pr-8">
          <div className="bg-[#0a0c14] p-4 rounded">
            <div className="mb-4">
              <h3 className="font-medium text-gray-300 text-lg">{rightLabel}</h3>
              <p className="text-sm text-gray-500">
                {rightSongs.length > 0 ? `${rightSongs.length} tracks` : 'No tracks selected'}
              </p>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {rightSongs.map((song, index) => (
                <SongLegendItem
                  key={song.id}
                  song={song}
                  index={index}
                  isLeft={false}
                  isHovered={hoveredSong === song.id}
                  onHover={setHoveredSong}
                  getColor={getColor}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components for cleaner rendering
const SongLegendItem = ({ song, index, isLeft, isHovered, onHover, getColor }) => (
  <div 
    className={`flex flex-col gap-1 py-2 px-2 rounded transition-colors ${
      isHovered ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'
    }`}
    onMouseEnter={() => onHover(song.id)}
    onMouseLeave={() => onHover(null)}
  >
    <div className="flex items-center gap-2">
      <div 
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: getColor(index, isLeft, isHovered) }} 
      />
      <span className="truncate font-medium text-sm" title={song.name}>
        {song.name}
      </span>
    </div>
  </div>
);

const SongPath = ({ song, index, isLeft, isHovered, onHover, generatePathCoordinates, getColor, opacities }) => (
  <g style={{ mixBlendMode: BLEND_MODE }}>
    <path
      d={generatePathCoordinates(song)}
      fill={getColor(index, isLeft, isHovered)}
      fillOpacity={isHovered ? opacities.hoverFill : opacities.fill}
      stroke="transparent"
      pointerEvents="none"
    />
    <path
      d={generatePathCoordinates(song)}
      fill="transparent"
      stroke={getColor(index, isLeft, isHovered)}
      strokeWidth={12}
      strokeOpacity={0}
      onMouseEnter={() => onHover(song.id)}
      style={{ cursor: 'pointer' }}
    />
    <path
      d={generatePathCoordinates(song)}
      fill="transparent"
      stroke={getColor(index, isLeft, isHovered)}
      strokeWidth={isHovered ? 1 : 0.5}
      strokeOpacity={isHovered ? opacities.hoverStroke : opacities.stroke}
      pointerEvents="none"
    />
  </g>
);

export default ComparisonViz;