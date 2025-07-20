
import React, { useState, useEffect, useRef } from 'react';
import { Player, DividedTeam, PlayerSeed } from '../types';
import { useLanguage } from '../App';
import { useAppContext } from '../contexts/AppContext';
import { Button } from './shared/Button';
import { PlayIcon } from './icons';

interface TeamDivisionSpinnerProps {
    players: Player[];
    numberOfTeams: number;
    onComplete: (teams: DividedTeam[]) => void;
}

const seedValues: Record<PlayerSeed, number> = { GK: 0, A: 5, B: 4, C: 3, D: 2, E: 1 };

const sliceColors = [
  '#F97316', // primary (orange)
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#14b8a6', // teal-500
  '#ef4444', // red-500
  '#64748b', // slate-500
];


export const TeamDivisionSpinner: React.FC<TeamDivisionSpinnerProps> = ({ players, numberOfTeams, onComplete }) => {
    const { translate } = useLanguage();
    const { addToast } = useAppContext();
    
    const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>(players);
    const [teams, setTeams] = useState<DividedTeam[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [wheelRotation, setWheelRotation] = useState(0);
    const [announcement, setAnnouncement] = useState(translate('teamDivider.spinner.waiting'));
    const [flyingPlayer, setFlyingPlayer] = useState<{ player: Player; startPos: DOMRect; endPos: DOMRect; } | null>(null);

    const wheelRef = useRef<HTMLDivElement>(null);
    const teamsRef = useRef(teams); 

    const createConicGradient = (playersList: Player[]) => {
        if (playersList.length <= 0) return 'transparent';
        const angleStep = 360 / playersList.length;
        const gradientParts = playersList.map((_, i) => {
            const color = sliceColors[i % sliceColors.length];
            const startAngle = i * angleStep;
            const endAngle = (i + 1) * angleStep;
            return `${color} ${startAngle}deg ${endAngle}deg`;
        });
        return `conic-gradient(${gradientParts.join(', ')})`;
    };

    useEffect(() => {
        const initialTeams = Array.from({ length: numberOfTeams }, (_, i) => ({
            id: i + 1,
            players: [],
            totalSeedValue: 0,
            playerCount: 0,
        }));
        setTeams(initialTeams);
        teamsRef.current = initialTeams;
    }, [numberOfTeams]);
    
    useEffect(() => {
        teamsRef.current = teams;
    }, [teams]);

     useEffect(() => {
        if (!isSpinning && unassignedPlayers.length === 0 && teams.length > 0) {
            const totalAssigned = teams.reduce((acc, team) => acc + team.playerCount, 0);
            if (totalAssigned === players.length) {
                setAnnouncement(translate('teamDivider.spinner.completed'));
                setTimeout(() => onComplete(teamsRef.current), 1500);
            }
        }
     }, [isSpinning, unassignedPlayers.length, teams, players.length, onComplete, translate]);

    const findTargetTeam = (player: Player): DividedTeam => {
        const currentTeams = [...teamsRef.current];

        // Ideal candidates are teams that DO NOT have this player's seed yet.
        const idealCandidates = currentTeams.filter(t => !t.players.some(p => p.seed === player.seed));
        
        // If there are ideal teams, we MUST pick from them. Otherwise, we consider all teams.
        const candidatesToConsider = idealCandidates.length > 0 ? idealCandidates : currentTeams;
        
        if (idealCandidates.length === 0 && currentTeams.length > 0 && player.seed !== 'GK') {
             addToast(translate('teamDivider.spinner.unbalancedWarning', { playerName: player.name }), 'warning', true);
        }
        
        // Sort the chosen candidates to find the single best fit
        candidatesToConsider.sort((a, b) => {
            // 1. Primary sort: fewest players
            const playerCountDiff = a.playerCount - b.playerCount;
            if (playerCountDiff !== 0) return playerCountDiff;
            
            // 2. Secondary sort: lowest total seed value
            const seedValueDiff = a.totalSeedValue - b.totalSeedValue;
            if (seedValueDiff !== 0) return seedValueDiff;
            
            // 3. Tertiary sort: random tie-breaker
            return Math.random() - 0.5;
        });
        
        return candidatesToConsider[0];
    };
    
    const handleSpin = () => {
        if (isSpinning || unassignedPlayers.length === 0) return;

        setIsSpinning(true);
        setAnnouncement(translate('teamDivider.spinner.spinning'));

        const selectedPlayerIndex = Math.floor(Math.random() * unassignedPlayers.length);
        const selectedPlayer = unassignedPlayers[selectedPlayerIndex];
        
        const sliceAngle = 360 / unassignedPlayers.length;
        const targetAngleOnWheel = (selectedPlayerIndex * sliceAngle) + (sliceAngle / 2);
        const targetRotation = -targetAngleOnWheel;

        const randomSpins = 5 + Math.floor(Math.random() * 3);
        const finalRotation = (wheelRotation - (wheelRotation % 360)) + (randomSpins * 360) + targetRotation;
        
        setWheelRotation(finalRotation);

        setTimeout(() => {
            setAnnouncement(translate('teamDivider.spinner.selected', { playerName: selectedPlayer.name, playerSeed: selectedPlayer.seed }));

            const targetTeam = findTargetTeam(selectedPlayer);
            
            // We use the wrapper div for positioning as it is more stable
            const wheelItemElement = document.getElementById(`wheel-player-wrapper-${selectedPlayer.name}`);
            const teamBoxElement = document.getElementById(`team-box-${targetTeam.id}`);

            if (wheelItemElement && teamBoxElement) {
                setFlyingPlayer({
                    player: selectedPlayer,
                    startPos: wheelItemElement.getBoundingClientRect(),
                    endPos: teamBoxElement.getBoundingClientRect()
                });
            }

            setTimeout(() => {
                setTeams(prevTeams => {
                    const newTeams = prevTeams.map(team => {
                        if (team.id === targetTeam.id) {
                            const newPlayers = [...team.players, selectedPlayer].sort((a,b) => seedValues[b.seed] - seedValues[a.seed]);
                            return {
                                ...team,
                                players: newPlayers,
                                totalSeedValue: team.totalSeedValue + (selectedPlayer.seed === 'GK' ? 0 : seedValues[selectedPlayer.seed]),
                                playerCount: team.playerCount + 1,
                            };
                        }
                        return team;
                    });
                    teamsRef.current = newTeams;
                    return newTeams;
                });

                setFlyingPlayer(null);

                const remainingPlayers = unassignedPlayers.filter((_, index) => index !== selectedPlayerIndex);
                setUnassignedPlayers(remainingPlayers);
                
                if (remainingPlayers.length > 0) {
                    setAnnouncement(translate('teamDivider.spinner.waiting'));
                    setIsSpinning(false);
                }
            }, 1000); 

        }, 4100); 
    };
    
    const wheelSize = Math.min(window.innerWidth * 0.9, 500);
    const wheelRadius = wheelSize / 2;

    return (
        <div className="flex flex-col items-center justify-start p-4 min-h-[80vh] bg-background dark:bg-slate-900/50 rounded-lg">
            {flyingPlayer && (
                 <div
                    className="player-fly-animation"
                    style={{
                      '--start-x': `${flyingPlayer.startPos.left + flyingPlayer.startPos.width / 2}px`,
                      '--start-y': `${flyingPlayer.startPos.top + flyingPlayer.startPos.height / 2}px`,
                      '--end-x': `${flyingPlayer.endPos.left + flyingPlayer.endPos.width / 2}px`,
                      '--end-y': `${flyingPlayer.endPos.top + 40}px`,
                    } as React.CSSProperties}
                 >
                    {flyingPlayer.player.name}
                 </div>
            )}
            <h1 className="text-3xl font-bold text-textPrimary mb-2 text-center">{translate('teamDivider.spinner.title')}</h1>
            <p className="text-lg text-textSecondary h-8 mb-6 text-center transition-all duration-300">{announcement}</p>
            
            <div className="relative flex items-center justify-center" style={{ height: `${wheelSize}px`, width: `${wheelSize}px`}}>
                <div 
                    className="absolute top-[-25px] left-1/2 -translate-x-1/2 z-20 transition-transform duration-200"
                    style={{
                        clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                        width: '30px', height: '40px',
                        transform: isSpinning ? 'scale(1.1)' : 'scale(1)',
                    }}
                >
                    <div className="w-full h-full bg-primary shadow-lg"/>
                </div>

                <div 
                    ref={wheelRef}
                    className="relative rounded-full list-none m-0 p-0"
                    style={{ 
                        transform: `rotate(${wheelRotation}deg)`,
                        height: `${wheelSize}px`,
                        width: `${wheelSize}px`,
                        border: `8px solid var(--color-secondary)`,
                        boxShadow: `0 0 20px rgba(0,0,0,0.3), inset 0 0 15px rgba(0,0,0,0.2)`,
                        transition: 'transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        background: createConicGradient(unassignedPlayers),
                    }}
                >
                   {unassignedPlayers.map((player, index) => {
                        const sliceAngle = 360 / unassignedPlayers.length;
                        const textAngle = sliceAngle * index + (sliceAngle / 2);

                        // This is the invisible "spoke" of the wheel, rotated to the middle of the slice.
                        const spokeStyle: React.CSSProperties = {
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            height: `${wheelRadius}px`,
                            width: '1px',
                            transform: `translateX(-50%) rotate(${textAngle}deg)`,
                            transformOrigin: 'bottom center',
                        };
                        
                        // This div sits on the spoke and is responsible for positioning the text block.
                        const textPositionerStyle: React.CSSProperties = {
                            position: 'absolute',
                            // Position the block halfway along the radius
                            top: `${wheelRadius * 0.5}px`, 
                            left: '0.5px', // Center on the 1px spoke
                            // Center the block itself on the spoke line, and move its own center up to its position
                            transform: 'translate(-50%, -50%)', 
                            pointerEvents: 'none',
                        };
                        
                        // This handles the text's own rotation to make it vertical and readable.
                        const textRotation = textAngle > 90 && textAngle < 270 ? 90 : -90;
                        
                        let fontSize = '13px';
                        if (unassignedPlayers.length > 15) fontSize = '12px';
                        if (unassignedPlayers.length > 25) fontSize = '11px';
                        if (player.name.length > 12) fontSize = '10px';
                        if (unassignedPlayers.length > 35) fontSize = '9px';

                        const textSpanStyle: React.CSSProperties = {
                            display: 'block',
                            transform: `rotate(${textRotation}deg)`,
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: fontSize,
                            textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                            whiteSpace: 'nowrap',
                        };

                        return (
                            <div key={`${player.name}-${index}`} id={`wheel-player-wrapper-${player.name}`} style={spokeStyle}>
                                <div style={textPositionerStyle}>
                                    <span style={textSpanStyle}>
                                        {player.name}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <Button
                    onClick={handleSpin}
                    disabled={isSpinning || unassignedPlayers.length === 0}
                    className="w-28 h-28 absolute z-10 rounded-full !p-0 flex items-center justify-center flex-col text-white shadow-lg bg-secondary hover:bg-opacity-90 transition-transform duration-200 active:scale-95 border-4 border-slate-300 dark:border-slate-500"
                >
                    <PlayIcon className="w-8 h-8" />
                    <span className="font-bold text-lg uppercase tracking-wider">{translate('teamDivider.spinner.spinButton')}</span>
                </Button>
            </div>

            <div className="w-full max-w-6xl mx-auto grid gap-4 mt-10" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))` }}>
                {teams.map(team => (
                    <div key={team.id} id={`team-box-${team.id}`} className="bg-surface rounded-lg shadow-md p-4 min-h-[150px] transition-all duration-300 flex flex-col">
                        <h3 className="text-lg font-semibold text-primary mb-2 text-center border-b border-border pb-2">{translate('teamDivider.teamLabel', { id: team.id })}</h3>
                        <ul className="space-y-1 flex-grow">
                            {team.players.map(p => (
                                <li key={`${p.name}-${team.id}`} className="text-sm text-textPrimary text-center bg-gray-100 dark:bg-slate-700 p-1.5 rounded-md shadow-sm">
                                    {p.name} <span className="text-xs text-textSecondary">({p.seed})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};
