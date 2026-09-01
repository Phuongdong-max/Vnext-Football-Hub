import React from 'react';
import { PlayerSkills } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface PlayerSkillChartProps {
  skills: PlayerSkills;
  size?: number;
}

const skillOrder: (keyof PlayerSkills)[] = ['speed', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];

export const PlayerSkillChart: React.FC<PlayerSkillChartProps> = ({ skills, size = 300 }) => {
  const { translate } = useLanguage();
  const center = size / 2;
  // Add padding to ensure labels are not clipped by the SVG boundary
  const padding = size * 0.15;
  const radius = center - padding; // Radius of the outermost grid line
  const levels = 4;

  const getPoint = (angle: number, value: number) => {
    const r = radius * (value / 100);
    const x = center + r * Math.cos((angle * Math.PI) / 180);
    const y = center + r * Math.sin((angle * Math.PI) / 180);
    return { x, y };
  };

  const hexagonPoints = skillOrder.map((_, i) => {
    const angle = i * 60 - 90; // Start from top
    return getPoint(angle, 100);
  });

  const skillPoints = skillOrder
    .map((key, i) => {
      const angle = i * 60 - 90;
      return getPoint(angle, skills[key] || 0);
    })
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid Levels */}
      {[...Array(levels)].map((_, levelIndex) => {
        const levelValue = 100 - levelIndex * (100 / levels);
        const points = skillOrder
          .map((_, i) => {
            const angle = i * 60 - 90;
            return getPoint(angle, levelValue);
          })
          .map((p) => `${p.x},${p.y}`)
          .join(' ');

        return (
          <polygon
            key={levelIndex}
            points={points}
            fill="none"
            stroke="hsl(var(--border))"
            strokeOpacity="0.3"
            strokeWidth="1"
          />
        );
      })}

      {/* Radial Lines */}
      {hexagonPoints.map((point, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={point.x}
          y2={point.y}
          stroke="hsl(var(--border))"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
      ))}

      {/* Skill Polygon */}
      <polygon
        points={skillPoints}
        fill="hsl(var(--primary))"
        fillOpacity="0.4"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
      />

      {/* Skill Labels */}
      {skillOrder.map((key, i) => {
        const angle = i * 60 - 90;
        // Position labels just outside the main grid, with enough space
        const labelRadius = radius + 15;
        const x = center + labelRadius * Math.cos((angle * Math.PI) / 180);
        const y = center + labelRadius * Math.sin((angle * Math.PI) / 180);

        const textAnchor = angle === 90 || angle === -90 ? 'middle' : angle > 90 || angle < -90 ? 'end' : 'start';

        return (
          <text
            key={key}
            x={x}
            y={y}
            dy="0.3em" // Vertically center
            textAnchor={textAnchor}
            fill="hsl(var(--foreground))" // Brighter text color
            fontSize={size > 200 ? '13' : '11'} // Slightly larger font
            fontWeight="bold" // Bolder font
            style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.7))' }} // Add shadow for pop
          >
            {translate(`playerSkills.${key}`)}
          </text>
        );
      })}
    </svg>
  );
};
