import React, { useState, useEffect, useRef } from 'react';
import { Player, DividedTeam, PlayerSeed } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { Button } from './shared/Button';
import { PlayIcon, ArrowLeftIcon } from './icons';
import { getTeamLogo } from '../constants';

/** A team of the current season, reduced to what the draw needs from it. */
export interface DrawTeam {
    id: string;
    name: string;
    color?: string | null;
    logoUrl?: string | null;
}

interface TeamDivisionSpinnerProps {
    players: Player[];
    numberOfTeams: number;
    /**
     * The season's own teams, in order. When present the wheel draws into
     * these - their names and colours - instead of anonymous "Team 1..N"
     * boxes. Shorter than numberOfTeams is allowed; the extra boxes stay
     * generic.
     */
    seasonTeams?: DrawTeam[];
    onComplete: (teams: DividedTeam[]) => void;
    /** Leave the draw and go back to the squad list. */
    onCancel?: () => void;
}

/**
 * Header colour of a team box. A box standing for a season team falls back to
 * the same slate the Teams tab uses, so an uncoloured team looks identical in
 * both places; a generic "Team N" box keeps the app's orange.
 */
export const teamHeaderColor = (team: Pick<DividedTeam, 'color' | 'sourceTeamId'>): string =>
    team.color || (team.sourceTeamId ? '#64748b' : '#F97316');

/**
 * The empty boxes a draw starts from. Built here rather than in each caller so
 * the wheel and the instant divide always produce the same shape, including the
 * link back to the season's teams.
 */
export const buildEmptyTeams = (count: number, seasonTeams?: DrawTeam[]): DividedTeam[] =>
    Array.from({ length: count }, (_, i) => {
        const source = seasonTeams?.[i];
        return {
            id: i + 1,
            name: source?.name,
            color: source?.color ?? null,
            logoUrl: source?.logoUrl ?? null,
            sourceTeamId: source?.id,
            players: [],
            totalSeedValue: 0,
            playerCount: 0,
        };
    });

export const teamDisplayName = (
    team: Pick<DividedTeam, 'id' | 'name'>,
    translate: (key: string, replacements?: Record<string, string | number>) => string,
): string => team.name?.trim() || translate('teamDivider.teamLabel', { id: team.id });

/**
 * The crest to draw for a team box: what the admin picked, else the one that
 * ships with the team's name, else nothing. Returning null rather than a
 * placeholder matters - see getTeamLogo.
 */
export const teamLogoSrc = (team: Pick<DividedTeam, 'name' | 'logoUrl'>): string | null =>
    team.logoUrl?.trim() || (team.name ? getTeamLogo(team.name) : null);

/** Crest rendered next to a team name. Sized by the caller. */
export const TeamCrest: React.FC<{ src: string | null; name: string; className?: string }> = ({ src, name, className = 'h-6 w-6' }) =>
    src ? (
        <img
            src={src}
            alt=""
            aria-hidden="true"
            title={name}
            // A crest that fails to load must not leave a broken-image icon in
            // the middle of the header.
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            className={`${className} flex-shrink-0 object-contain drop-shadow-sm`}
        />
    ) : null;

const seedValues: Record<PlayerSeed, number> = { GK: 0, A: 5, B: 4, C: 3, D: 2, E: 1 };

// One source of truth for the choreography. The CSS transition, the CSS
// keyframe and the setTimeout that follows each of them have to agree; when
// they were separate literals a change to one silently desynced the others.
const SPIN_MS = 4000;
const SPIN_ALL_MS = 2600;   // one flourish for the whole draw, not one per player
const SETTLE_MS = 100;      // let the wheel come to rest before reading its position
const FLY_MS = 1000;        // must match .player-fly-animation in index.html
const CONFETTI_MS = 2600;   // longest piece lifetime, after which the burst unmounts

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

// The wheel is a ring, so the last slice touches the first one. Plain
// `i % length` gives them the same colour whenever the player count is one more
// than a multiple of the palette (10, 19, 28...), which reads as one fat slice.
const sliceColorAt = (index: number, total: number) => {
  const n = sliceColors.length;
  if (total > 1 && total % n === 1 && index === total - 1) return sliceColors[1 % n];
  return sliceColors[index % n];
};

// Picking a team is pure so that the one-at-a-time spin and the spin-all draw
// run the exact same rule; spin-all folds it over a local working copy of the
// teams instead of waiting for a state update between players.
export const pickTargetTeam = (player: Player, teams: DividedTeam[]): { team: DividedTeam; usedFallback: boolean } => {
    // Ideal candidates are teams that DO NOT have this player's seed yet.
    const idealCandidates = teams.filter(t => !t.players.some(p => p.seed === player.seed));
    const usedFallback = idealCandidates.length === 0;
    const candidates = usedFallback ? [...teams] : idealCandidates;

    candidates.sort((a, b) => {
        // 1. Primary sort: fewest players
        const playerCountDiff = a.playerCount - b.playerCount;
        if (playerCountDiff !== 0) return playerCountDiff;

        // 2. Secondary sort: lowest total seed value
        const seedValueDiff = a.totalSeedValue - b.totalSeedValue;
        if (seedValueDiff !== 0) return seedValueDiff;

        // 3. Tertiary sort: random tie-breaker
        return Math.random() - 0.5;
    });

    return { team: candidates[0], usedFallback };
};

export const assignToTeams = (teams: DividedTeam[], player: Player, teamId: number): DividedTeam[] =>
    teams.map(team => team.id !== teamId ? team : {
        ...team,
        players: [...team.players, player].sort((a, b) => seedValues[b.seed] - seedValues[a.seed]),
        // Keepers are deliberately worth 0, so they never skew the strength balance.
        totalSeedValue: team.totalSeedValue + seedValues[player.seed],
        playerCount: team.playerCount + 1,
    });

export const shuffled = <T,>(items: T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

interface ConfettiPiece {
    left: number; delay: number; duration: number;
    drift: number; fall: number; spin: number;
    color: string; size: number;
}

const makeConfetti = (count: number): ConfettiPiece[] =>
    Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 260,
        duration: 1500 + Math.random() * 900,
        drift: (Math.random() - 0.5) * 220,
        fall: 320 + Math.random() * 220,
        spin: 180 + Math.random() * 540,
        color: sliceColors[Math.floor(Math.random() * sliceColors.length)],
        size: 6 + Math.random() * 7,
    }));


export const TeamDivisionSpinner: React.FC<TeamDivisionSpinnerProps> = ({ players, numberOfTeams, seasonTeams, onComplete, onCancel }) => {
    const { translate } = useLanguage();
    const { addToast } = useAppContext();

    const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>(players);
    const [teams, setTeams] = useState<DividedTeam[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [wheelRotation, setWheelRotation] = useState(0);
    const [spinDuration, setSpinDuration] = useState(SPIN_MS);
    const [announcement, setAnnouncement] = useState(translate('teamDivider.spinner.waiting'));
    const [flyingPlayer, setFlyingPlayer] = useState<{ player: Player; startPos: DOMRect; endPos: DOMRect; } | null>(null);
    const [lastWinner, setLastWinner] = useState<{ player: Player; teamId: number } | null>(null);
    const [confetti, setConfetti] = useState<{ id: number; pieces: ConfettiPiece[] } | null>(null);

    const wheelRef = useRef<HTMLDivElement>(null);
    const teamsRef = useRef(teams);
    // onComplete is a fresh closure on every parent render, so it is a changing
    // effect dependency. Without this latch the completion effect can re-run and
    // schedule a second onComplete, saving the division twice.
    const hasCompletedRef = useRef(false);
    const confettiIdRef = useRef(0);
    const confettiTimerRef = useRef<number | null>(null);

    // The wheel is sized off the viewport. Reading window.innerWidth straight in
    // the render body froze that size at mount, so rotating a phone left the
    // wheel at its portrait width until some other state change forced a redraw.
    const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
    useEffect(() => {
        const onResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => () => {
        if (confettiTimerRef.current !== null) window.clearTimeout(confettiTimerRef.current);
    }, []);

    const fireConfetti = (count = 46) => {
        confettiIdRef.current += 1;
        setConfetti({ id: confettiIdRef.current, pieces: makeConfetti(count) });
        if (confettiTimerRef.current !== null) window.clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = window.setTimeout(() => setConfetti(null), CONFETTI_MS);
    };

    const createConicGradient = (playersList: Player[]) => {
        if (playersList.length <= 0) return 'transparent';
        const angleStep = 360 / playersList.length;
        const gradientParts = playersList.map((_, i) => {
            const color = sliceColorAt(i, playersList.length);
            const startAngle = i * angleStep;
            const endAngle = (i + 1) * angleStep;
            return `${color} ${startAngle}deg ${endAngle}deg`;
        });
        return `conic-gradient(${gradientParts.join(', ')})`;
    };

    // Depend on the contents, not the array identity: seasonTeams is rebuilt on
    // every parent render, and resetting the boxes mid-draw would throw away
    // every player already placed.
    const seasonTeamsKey = (seasonTeams ?? []).map(t => `${t.id}:${t.name}:${t.color ?? ''}:${t.logoUrl ?? ''}`).join('|');

    useEffect(() => {
        const initialTeams = buildEmptyTeams(numberOfTeams, seasonTeams);
        setTeams(initialTeams);
        teamsRef.current = initialTeams;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numberOfTeams, seasonTeamsKey]);

    useEffect(() => {
        teamsRef.current = teams;
    }, [teams]);

     useEffect(() => {
        if (!isSpinning && unassignedPlayers.length === 0 && teams.length > 0) {
            const totalAssigned = teams.reduce((acc, team) => acc + team.playerCount, 0);
            if (totalAssigned === players.length && !hasCompletedRef.current) {
                hasCompletedRef.current = true;
                setAnnouncement(translate('teamDivider.spinner.completed'));
                setTimeout(() => onComplete(teamsRef.current), 1500);
            }
        }
     }, [isSpinning, unassignedPlayers.length, teams, players.length, onComplete, translate]);

    // Spin one player at a time - the default, driven by the hub button.
    const handleSpin = () => {
        if (isSpinning || unassignedPlayers.length === 0) return;

        setIsSpinning(true);
        setSpinDuration(SPIN_MS);
        setLastWinner(null);
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

            const { team: targetTeam, usedFallback } = pickTargetTeam(selectedPlayer, teamsRef.current);
            if (usedFallback && selectedPlayer.seed !== 'GK') {
                addToast('teamDivider.spinner.unbalancedWarning', 'warning', { playerName: selectedPlayer.name });
            }

            setLastWinner({ player: selectedPlayer, teamId: targetTeam.id });
            fireConfetti();

            // Keyed by slice index, not by name: two players called the same
            // thing produced one id, so getElementById returned the first slice
            // and the name flew out of the wrong wedge.
            const wheelItemElement = document.getElementById(`wheel-player-wrapper-${selectedPlayerIndex}`);
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
                    const newTeams = assignToTeams(prevTeams, selectedPlayer, targetTeam.id);
                    teamsRef.current = newTeams;
                    return newTeams;
                });

                setFlyingPlayer(null);

                const remainingPlayers = unassignedPlayers.filter((_, index) => index !== selectedPlayerIndex);
                setUnassignedPlayers(remainingPlayers);

                if (remainingPlayers.length > 0) {
                    setAnnouncement(translate('teamDivider.spinner.waiting'));
                }
                // Must run for the final player too. The completion effect is
                // gated on !isSpinning, so leaving this set strands the result
                // and the division is never persisted.
                setIsSpinning(false);
            }, FLY_MS);

        }, SPIN_MS + SETTLE_MS);
    };

    // Draw everyone in a single spin. Same placement rule as handleSpin, just
    // folded over every remaining player at once instead of one per click.
    const handleSpinAll = () => {
        if (isSpinning || unassignedPlayers.length === 0) return;

        setIsSpinning(true);
        setSpinDuration(SPIN_ALL_MS);
        setLastWinner(null);
        setAnnouncement(translate('teamDivider.spinner.spinningAll'));

        const turns = 4 + Math.floor(Math.random() * 2);
        setWheelRotation(prev => (prev - (prev % 360)) + turns * 360);

        setTimeout(() => {
            let workingTeams = teamsRef.current;
            let fallbackCount = 0;

            // Random draw order, so spin-all is not just "input order".
            shuffled(unassignedPlayers).forEach(player => {
                const { team, usedFallback } = pickTargetTeam(player, workingTeams);
                if (usedFallback && player.seed !== 'GK') fallbackCount += 1;
                workingTeams = assignToTeams(workingTeams, player, team.id);
            });

            teamsRef.current = workingTeams;
            setTeams(workingTeams);
            setUnassignedPlayers([]);
            setAnnouncement(translate('teamDivider.spinner.allAssigned'));
            fireConfetti(90);

            // One summary instead of one toast per forced duplicate seed.
            if (fallbackCount > 0) {
                addToast('teamDivider.spinner.unbalancedSummary', 'warning', { count: fallbackCount });
            }

            setIsSpinning(false);
        }, SPIN_ALL_MS + SETTLE_MS);
    };

    const wheelSize = Math.min(viewportWidth * 0.9, 500);
    const wheelRadius = wheelSize / 2;
    const sliceCount = unassignedPlayers.length;
    const sliceAngle = sliceCount > 0 ? 360 / sliceCount : 360;
    const hubSize = Math.max(96, Math.round(wheelSize * 0.26));
    // The hub plate is hubSize + 16; labels must stay outside it.
    const hubRadius = (hubSize + 16) / 2;
    const labelBand = Math.max(40, wheelRadius - hubRadius - 10);

    return (
        <div className="relative min-h-[80vh] rounded-lg bg-background p-4 dark:bg-slate-900/50">
            <style>{`
              @keyframes tds-confetti-fall {
                0%   { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 1; }
                100% { transform: translate3d(var(--tds-drift), var(--tds-fall), 0) rotate(var(--tds-spin)); opacity: 0; }
              }
              @keyframes tds-winner-pop {
                0%   { transform: scale(0.7); opacity: 0; }
                60%  { transform: scale(1.06); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes tds-pointer-tick {
                0%, 100% { transform: translateX(-50%) rotate(0deg); }
                50%      { transform: translateX(-50%) rotate(-9deg); }
              }
              .tds-confetti-piece { position: absolute; top: 0; border-radius: 2px; animation-name: tds-confetti-fall; animation-timing-function: cubic-bezier(0.25, 0.6, 0.4, 1); animation-fill-mode: forwards; }
              .tds-winner-card { animation: tds-winner-pop 420ms cubic-bezier(0.2, 1.3, 0.4, 1) both; }
              .tds-pointer-ticking { animation: tds-pointer-tick 260ms ease-in-out infinite; }
            `}</style>

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

            {/* The draw takes over the whole page, so this arrow is the only way
                back to the squad list. Disabled mid-spin to avoid abandoning a
                draw halfway through an animation. */}
            {onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSpinning}
                    aria-label={translate('teamDivider.spinner.backButton')}
                    title={translate('teamDivider.spinner.backButton')}
                    className="absolute left-2 top-2 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-textPrimary shadow-md transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10 sm:left-4 sm:top-4"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
            )}

            {/* Wheel on the left, teams on the right, so a room watching the draw
                can follow both at once instead of scrolling between them. */}
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_34rem]">
            <div className="flex flex-col items-center lg:pr-8">
            <p role="status" aria-live="polite" className="h-8 text-center text-lg text-textSecondary transition-all duration-300">{announcement}</p>

            {/* Winner reveal - fixed height so the wheel never jumps when it
                appears, and enough bottom margin to clear the wheel's pointer. */}
            <div className="h-[72px] mb-9 flex items-center justify-center">
                {lastWinner && (
                    <div className="tds-winner-card flex items-center gap-3 rounded-xl border border-primary/40 bg-surface px-5 py-2.5 shadow-lg">
                        <span className="text-xs uppercase tracking-wider text-textSecondary">{translate('teamDivider.spinner.winnerLabel')}</span>
                        <span className="text-2xl font-extrabold text-primary">{lastWinner.player.name}</span>
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{lastWinner.player.seed}</span>
                        {(() => {
                            const winnerTeam: Pick<DividedTeam, 'id' | 'name' | 'logoUrl'> =
                                teams.find(t => t.id === lastWinner.teamId) ?? { id: lastWinner.teamId };
                            const name = teamDisplayName(winnerTeam, translate);
                            return (
                                <span className="flex items-center gap-1.5 text-sm font-semibold text-textPrimary">
                                    → <TeamCrest src={teamLogoSrc(winnerTeam)} name={name} className="h-6 w-6" />
                                    {name}
                                </span>
                            );
                        })()}
                    </div>
                )}
            </div>

            <div className="relative flex items-center justify-center" style={{ height: `${wheelSize}px`, width: `${wheelSize}px`}}>
                {/* Decorative rim behind the wheel. */}
                <div
                    aria-hidden="true"
                    className="absolute rounded-full"
                    style={{
                        height: `${wheelSize + 20}px`,
                        width: `${wheelSize + 20}px`,
                        background: 'conic-gradient(from 0deg, #fbbf24, #F97316, #fb923c, #F97316, #fbbf24)',
                        boxShadow: '0 12px 34px rgba(0,0,0,0.28)',
                    }}
                />

                {confetti && (
                    <div key={confetti.id} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-visible">
                        {confetti.pieces.map((p, i) => (
                            <span
                                key={i}
                                className="tds-confetti-piece"
                                style={{
                                    left: `${p.left}%`,
                                    width: `${p.size}px`,
                                    height: `${p.size * 1.6}px`,
                                    backgroundColor: p.color,
                                    animationDuration: `${p.duration}ms`,
                                    animationDelay: `${p.delay}ms`,
                                    '--tds-drift': `${p.drift}px`,
                                    '--tds-fall': `${p.fall}px`,
                                    '--tds-spin': `${p.spin}deg`,
                                } as React.CSSProperties}
                            />
                        ))}
                    </div>
                )}

                <div
                    className={`absolute top-[-22px] left-1/2 z-20 ${isSpinning ? 'tds-pointer-ticking' : ''}`}
                    style={{ transform: 'translateX(-50%)', transformOrigin: '50% 15%' }}
                >
                    <div
                        style={{
                            clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                            width: '34px',
                            height: '46px',
                            background: 'linear-gradient(180deg, #fff 0%, #F97316 55%)',
                            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.45))',
                        }}
                    />
                </div>

                <div
                    ref={wheelRef}
                    className="relative rounded-full list-none m-0 p-0 overflow-hidden"
                    style={{
                        transform: `rotate(${wheelRotation}deg)`,
                        height: `${wheelSize}px`,
                        width: `${wheelSize}px`,
                        border: `6px solid rgba(255,255,255,0.85)`,
                        boxShadow: `0 0 24px rgba(0,0,0,0.32), inset 0 0 26px rgba(0,0,0,0.28)`,
                        transition: `transform ${spinDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
                        background: createConicGradient(unassignedPlayers),
                    }}
                >
                   {/* Slice separators: the conic gradient alone leaves flat colour
                       boundaries that are hard to read as distinct wedges. */}
                   {sliceCount > 1 && sliceCount <= 40 && unassignedPlayers.map((_, index) => (
                        <div
                            key={`separator-${index}`}
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: 0,
                                height: `${wheelRadius}px`,
                                width: sliceCount > 24 ? '1px' : '2px',
                                background: 'rgba(255,255,255,0.45)',
                                transform: `translateX(-50%) rotate(${index * sliceAngle}deg)`,
                                transformOrigin: 'bottom center',
                                pointerEvents: 'none',
                            }}
                        />
                   ))}

                   {unassignedPlayers.map((player, index) => {
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

                        // The spoke runs rim (top: 0) to centre (top: wheelRadius),
                        // so the label is placed by its distance from the rim.
                        // Centre it in the band between the hub plate and the rim -
                        // at half the radius a long name ran inwards and vanished
                        // under the hub.
                        const textPositionerStyle: React.CSSProperties = {
                            position: 'absolute',
                            top: `${wheelRadius - (hubRadius + labelBand / 2)}px`,
                            left: '0.5px', // Center on the 1px spoke
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                        };

                        // The label's total rotation on screen is textAngle plus this,
                        // and it reads correctly only while that total stays within
                        // -90..90. The old boundaries (90/270) left the lower-right
                        // and upper-left quadrants printing upside down.
                        const textRotation = textAngle <= 180 ? -90 : 90;

                        // Slice count sets the ceiling, then the name is shrunk
                        // further until it actually fits the band. Guessing from
                        // name length alone still let long names overflow.
                        let fontSize = 13;
                        if (sliceCount > 35) fontSize = 9;
                        else if (sliceCount > 25) fontSize = 11;
                        else if (sliceCount > 15) fontSize = 12;
                        // ~0.55em average glyph width for this typeface.
                        const fitted = labelBand / (Math.max(player.name.length, 1) * 0.55);
                        fontSize = Math.max(8, Math.floor(Math.min(fontSize, fitted)));

                        const textSpanStyle: React.CSSProperties = {
                            display: 'block',
                            transform: `rotate(${textRotation}deg)`,
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: `${fontSize}px`,
                            textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                            whiteSpace: 'nowrap',
                        };

                        return (
                            <div key={`${player.name}-${index}`} id={`wheel-player-wrapper-${index}`} style={spokeStyle}>
                                <div style={textPositionerStyle}>
                                    <span style={textSpanStyle}>
                                        {player.name}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Hub plate sitting under the spin button. */}
                <div
                    aria-hidden="true"
                    className="absolute z-[5] rounded-full"
                    style={{
                        height: `${hubSize + 16}px`,
                        width: `${hubSize + 16}px`,
                        background: 'radial-gradient(circle at 32% 28%, #ffffff 0%, #e2e8f0 55%, #94a3b8 100%)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.38)',
                    }}
                />

                <Button
                    onClick={handleSpin}
                    disabled={isSpinning || unassignedPlayers.length === 0}
                    // borderRadius inline: Button's base class carries rounded-md,
                    // and a rounded-full in className does not reliably beat it -
                    // equal specificity means stylesheet order decides, not class order.
                    style={{ height: `${hubSize}px`, width: `${hubSize}px`, borderRadius: '50%' }}
                    className="absolute z-10 !p-0 flex items-center justify-center flex-col text-white shadow-lg bg-secondary hover:bg-opacity-90 transition-transform duration-200 active:scale-95 border-4 border-white/80"
                >
                    <PlayIcon className="w-7 h-7" />
                    <span className="font-bold text-base uppercase tracking-wider">{translate('teamDivider.spinner.spinButton')}</span>
                </Button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-2">
                <Button
                    onClick={handleSpinAll}
                    disabled={isSpinning || unassignedPlayers.length === 0}
                    variant="outline"
                    size="lg"
                >
                    {translate('teamDivider.spinner.spinAllButton')}
                </Button>
                <span className="text-xs text-textSecondary">
                    {translate('teamDivider.spinner.remaining', { count: unassignedPlayers.length })}
                </span>
            </div>
            </div>

            {/* Teams fill up as the draw runs. Empty slots are drawn in so the
                boxes do not start as three blank rectangles and the target size
                of each team is obvious. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:h-full lg:grid-rows-2">
                {teams.map(team => {
                    const target = Math.ceil(players.length / Math.max(teams.length, 1));
                    const emptySlots = Math.max(0, target - team.players.length);
                    const isTarget = lastWinner?.teamId === team.id;
                    return (
                        <div
                            key={team.id}
                            id={`team-box-${team.id}`}
                            className={`flex flex-col overflow-hidden rounded-xl bg-surface shadow-md transition-all duration-300 ${isTarget ? 'ring-2 ring-primary' : ''}`}
                        >
                            {/* Coloured by the season team this box stands for, so the
                                room can match the wheel to the shirts. */}
                            <div
                                className="flex items-center justify-between gap-2 px-3 py-1.5"
                                style={{ backgroundColor: teamHeaderColor(team) }}
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <TeamCrest src={teamLogoSrc(team)} name={teamDisplayName(team, translate)} className="h-7 w-7" />
                                    <h3 className="truncate text-sm font-bold text-white" title={teamDisplayName(team, translate)}>
                                        {teamDisplayName(team, translate)}
                                    </h3>
                                </div>
                                <span className="flex-shrink-0 font-mono text-xs text-white/80">{team.playerCount}</span>
                            </div>
                            <ul className="flex flex-grow flex-col gap-1 p-2">
                                {team.players.map((p, i) => (
                                    <li key={`${p.name}-${team.id}-${i}`} className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1 dark:bg-slate-700/60">
                                        <span className="break-words text-[13px] font-medium leading-tight text-textPrimary">{p.name}</span>
                                        <span className="flex-shrink-0 font-mono text-[10px] text-textSecondary">{p.seed}</span>
                                    </li>
                                ))}
                                {Array.from({ length: emptySlots }).map((_, i) => (
                                    <li key={`slot-${team.id}-${i}`} className="min-h-[26px] flex-1 rounded border border-dashed border-border" />
                                ))}
                            </ul>
                            <div className="border-t border-border px-2 py-1 text-center text-[10px] text-textSecondary">
                                {translate('teamDivider.totalSeedValue')}:{' '}
                                <span className="font-semibold text-primary">{team.totalSeedValue}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            </div>
        </div>
    );
};
