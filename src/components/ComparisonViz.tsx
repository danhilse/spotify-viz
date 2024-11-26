import React, { useState, useMemo } from 'react';
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { Text } from '@visx/text';
// import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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

type Feature = (typeof FEATURES)[number];

// Helper functions moved to top level
const normalizeValue = (song: Song | Record<Feature, number>, feature: Feature): number => {
    switch (feature) {
      case 'duration':
        const maxDuration = 300000;
        if ('duration_ms' in song) {
          return song.duration_ms / maxDuration;
        }
        return song.duration;
      case 'loudness':
        const value = (song as Song).loudness ?? song[feature];
        return (value + 60) / 60;
      case 'tempo':
        // Most popular music is between 60-180 BPM
        // Center the range more realistically
        const tempo = (song as Song).tempo ?? song[feature];
        return Math.max(0, Math.min(1, (tempo - 60) / 120));
      default:
        return (song as Song)[feature] ?? song[feature];
    }
  };
  

// Color palettes
const LEFT_COLORS = [
  '#FF3366', // Brighter pink-red
  '#FF6B6B', // Coral red
  '#FF8E72', // Salmon
];

const RIGHT_COLORS = [
  '#4A90E2', // Bright blue
  '#2E5EAA', // Medium blue
  '#1E3D59', // Dark blue
];

const getOpacityScale = (numTracks: number) => {
  const baseOpacity = Math.max(0.004, 1 / Math.pow(numTracks, 0.5));
  return {
    fill: baseOpacity * 0.04,
    stroke: baseOpacity * 4,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  width = 900,
  height = 800,
  leftSongs = [],
  rightSongs = [],
  leftLabel = "Set A",
  rightLabel = "Set B"
}) => {
  const [hoveredSong, setHoveredSong] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; } | null>(null);

  const graphWidth = 800;
  const radius = Math.min(graphWidth, height) / 2 - 60;
  const centerY = height / 2;
  const centerX = graphWidth / 2;

  const radialScale = scaleLinear({
    domain: [0, 1],
    range: [0, radius],
  });

  const angleStep = (2 * Math.PI) / FEATURES.length;

  const generatePoints = (song: Song | Record<Feature, number>) => {
    return FEATURES.map((feature, i) => ({
      feature,
      angle: i * angleStep,
      radius: radialScale(normalizeValue(song, feature)),
    }));
  };

  const generatePathCoordinates = (song: Song | Record<Feature, number>) => {
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

  // Calculate average paths

  // Modify getAveragePath to normalize after averaging
  const getAveragePath = (songs: Song[]) => {
    if (!songs.length) return null;
    
    // For tempo, calculate average before normalization
    const tempoAvg = songs.reduce((sum, song) => sum + song.tempo, 0) / songs.length;
    
    const averages = FEATURES.reduce((acc, feature) => {
      if (feature === 'tempo') {
        // Use the raw average for tempo
        acc[feature] = tempoAvg;
      } else {
        // For other features, use normalized values
        const sum = songs.reduce((s, song) => s + normalizeValue(song, feature), 0);
        acc[feature] = sum / songs.length;
      }
      return acc;
    }, {} as Record<Feature, number>);
  
    return generatePathCoordinates(averages);
  };

  const leftAverage = useMemo(() => getAveragePath(leftSongs), [leftSongs]);
  const rightAverage = useMemo(() => getAveragePath(rightSongs), [rightSongs]);

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

  return (
    <div className="w-full flex justify-center">
      <div className="flex items-start gap-8" style={{ width: '1400px' }}>
        {/* Left Legend */}
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

        {/* Center Graph */}
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

              {/* Left songs with soft-light blend */}
              <g style={{ mixBlendMode: 'lighten' }}>
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
              </g>

              {/* Right songs with screen blend */}
              <g style={{ mixBlendMode: 'lighten' }}>
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
              </g>

              {/* Average paths */}
              {leftAverage && (
                <path
                  d={leftAverage}
                  fill="none"
                  stroke="#FF3366"
                  strokeWidth={.45}
                  strokeOpacity={0.6}
                //   strokeDasharray="4,4"
                  pointerEvents="none"
                />
              )}

              {rightAverage && (
                <path
                  d={rightAverage}
                  fill="none"
                  stroke="#4A90E2"
                  strokeWidth={.45}
                  strokeOpacity={0.6}
                //   strokeDasharray="4,4"
                  pointerEvents="none"
                />
              )}
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

        {/* Right Legend */}
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

// Helper components
interface SongLegendItemProps {
  song: Song;
  index: number;
  isLeft: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  getColor: (index: number, isLeft: boolean, isHovered: boolean) => string;
}

const SongLegendItem = ({ song, index, isLeft, isHovered, onHover, getColor }: SongLegendItemProps) => (
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

interface SongPathProps {
  song: Song;
  index: number;
  isLeft: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  generatePathCoordinates: (song: Song) => string;
  getColor: (index: number, isLeft: boolean, isHovered: boolean) => string;
  opacities: { fill: number; stroke: number; hoverFill: number; hoverStroke: number; };
}

const SongPath = ({ song, index, isLeft, isHovered, onHover, generatePathCoordinates, getColor, opacities }: SongPathProps) => (
  <g>
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
      strokeWidth={8}
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