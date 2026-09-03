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
    // The chart is wider than it is tall on purpose. Labels sit to the left and
    // right of the hexagon and are far wider than they are tall, so a square
    // canvas either clipped them ("Physical" arrived as "hysical") or forced the
    // hexagon down to a stub to make room. `size` is the hexagon's box; the
    // canvas grows sideways around it.
    const width = size * 1.4;
    const height = size;
    const cx = width / 2;
    const cy = height / 2;
    const radius = cy - size * 0.1; // Radius of the outermost grid line
    const levels = 4;

    const getPoint = (angle: number, value: number) => {
        const r = radius * (value / 100);
        const x = cx + r * Math.cos(angle * Math.PI / 180);
        const y = cy + r * Math.sin(angle * Math.PI / 180);
        return { x, y };
    };

    const hexagonPoints = skillOrder.map((_, i) => {
        const angle = i * 60 - 90; // Start from top
        return getPoint(angle, 100);
    });

    const skillPoints = skillOrder.map((key, i) => {
        const angle = i * 60 - 90;
        return getPoint(angle, skills[key] || 0);
    }).map(p => `${p.x},${p.y}`).join(' ');

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            // Never push the panel sideways on a narrow screen.
            style={{ maxWidth: '100%', height: 'auto' }}
            role="img"
        >
            {/* Grid Levels */}
            {[...Array(levels)].map((_, levelIndex) => {
                const levelValue = 100 - (levelIndex * (100 / levels));
                const points = skillOrder.map((_, i) => {
                    const angle = i * 60 - 90;
                    return getPoint(angle, levelValue);
                }).map(p => `${p.x},${p.y}`).join(' ');

                return (
                    <polygon
                        key={levelIndex}
                        points={points}
                        fill="none"
                        stroke="var(--color-secondary)"
                        strokeOpacity="0.3"
                        strokeWidth="1"
                    />
                );
            })}
            
             {/* Radial Lines */}
            {hexagonPoints.map((point, i) => (
                <line
                    key={i}
                    x1={cx} y1={cy}
                    x2={point.x} y2={point.y}
                    stroke="var(--color-secondary)"
                    strokeOpacity="0.3"
                    strokeWidth="1"
                />
            ))}

            {/* Skill Polygon */}
            <polygon points={skillPoints} fill="var(--color-primary)" fillOpacity="0.4" stroke="var(--color-primary)" strokeWidth="2" />

            {/* Skill Labels */}
            {skillOrder.map((key, i) => {
                const angle = i * 60 - 90;
                // Position labels just outside the main grid, with enough space
                const labelRadius = radius + 14;
                const x = cx + labelRadius * Math.cos(angle * Math.PI / 180);
                const y = cy + labelRadius * Math.sin(angle * Math.PI / 180);

                const textAnchor = angle === 90 || angle === -90 ? 'middle' : (angle > 90 || angle < -90 ? 'end' : 'start');
                 
                return (
                     <text
                        key={key}
                        x={x}
                        y={y}
                        dy="0.3em" // Vertically center
                        textAnchor={textAnchor}
                        fill="var(--color-text-secondary)"
                        fontSize={size > 200 ? "12" : "10"}
                        fontWeight="600"
                    >
                        {translate(`playerSkills.${key}`)}
                    </text>
                );
            })}

        </svg>
    );
};