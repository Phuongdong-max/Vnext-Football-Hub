import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TournamentTeam, TournamentMatch } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ArrowPathIcon, PlayIcon, CheckCircleIcon, TrophyIcon } from '../icons';

interface TournamentScheduleGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    teams: TournamentTeam[];
    onSave: (schedule: TournamentMatch[]) => Promise<void>;
}

export const TournamentScheduleGeneratorModal: React.FC<TournamentScheduleGeneratorModalProps> = ({ isOpen, onClose, teams, onSave }) => {
    const { translate, language } = useLanguage();
    const [drawState, setDrawState] = useState<'idle' | 'drawing' | 'placing' | 'complete'>('idle');
    const [fullSchedule, setFullSchedule] = useState<TournamentMatch[]>([]);
    const [revealedMatches, setRevealedMatches] = useState<TournamentMatch[]>([]);
    const [announcement, setAnnouncement] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [flyingMatch, setFlyingMatch] = useState<{ text: string; startRef: React.RefObject<HTMLDivElement>; endRef: React.RefObject<HTMLDivElement>; } | null>(null);

    const matchRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
    const drawButtonRef = useRef<HTMLDivElement>(null);

    const getTeamName = useCallback((teamId: string) => teams.find(t => t.id === teamId)?.name || 'Unknown', [teams]);

    const generateSchedule = useCallback(() => {
        if (teams.length < 2) {
            setFullSchedule([]);
            return;
        }

        const uniquePairs: { home: TournamentTeam; away: TournamentTeam }[] = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                uniquePairs.push({ home: teams[i], away: teams[j] });
            }
        }

        // Lượt đi (First Leg) - Round 1
        const firstLegMatches: TournamentMatch[] = uniquePairs.map((pair, index) => {
            const isReversed = Math.random() > 0.5;
            return {
                id: `leg1_${index}`,
                round: 1,
                homeTeamId: isReversed ? pair.away.id : pair.home.id,
                awayTeamId: isReversed ? pair.home.id : pair.away.id,
                status: 'scheduled', homeTeamScore: null, awayTeamScore: null, date: null,
            };
        });

        // Lượt về (Second Leg) - Round 2
        const secondLegMatches: TournamentMatch[] = firstLegMatches.map((match, index) => {
            return {
                id: `leg2_${index}`,
                round: 2,
                homeTeamId: match.awayTeamId,
                awayTeamId: match.homeTeamId,
                status: 'scheduled', homeTeamScore: null, awayTeamScore: null, date: null,
            };
        });
        
        // Shuffle each leg independently to randomize draw order within the leg
        const shuffledFirstLeg = firstLegMatches.sort(() => Math.random() - 0.5);
        const shuffledSecondLeg = secondLegMatches.sort(() => Math.random() - 0.5);
        
        // Combine them, ensuring first leg is drawn completely before second leg
        const combinedSchedule = [...shuffledFirstLeg, ...shuffledSecondLeg];
        
        // Assign final temporary IDs
        const finalSchedule = combinedSchedule.map((match, index) => ({ ...match, id: `match_${index}` }));

        // Create refs for animation
        finalSchedule.forEach(match => {
            if (!matchRefs.current[match.id]) {
                matchRefs.current[match.id] = React.createRef<HTMLDivElement>();
            }
        });

        setFullSchedule(finalSchedule);
    }, [teams]);


    const resetDraw = useCallback(() => {
        generateSchedule();
        setRevealedMatches([]);
        setDrawState('idle');
        setAnnouncement(translate('tournament.drawModal.waiting'));
    }, [generateSchedule, translate]);

    useEffect(() => {
        if (isOpen) {
            resetDraw();
        }
    }, [isOpen, resetDraw]);

    const handleDraw = () => {
        if (drawState !== 'idle') return;

        const nextMatchToReveal = fullSchedule[revealedMatches.length];
        if (!nextMatchToReveal) return;

        setDrawState('drawing');
        setAnnouncement(translate('tournament.drawModal.drawing'));

        const matchText = `${getTeamName(nextMatchToReveal.homeTeamId)} vs ${getTeamName(nextMatchToReveal.awayTeamId)}`;

        setTimeout(() => {
            setDrawState('placing');
            setAnnouncement(matchText);
            const destinationRef = matchRefs.current[nextMatchToReveal.id];

            if (drawButtonRef.current && destinationRef?.current) {
                setFlyingMatch({
                    text: matchText,
                    startRef: drawButtonRef,
                    endRef: destinationRef,
                });
            }
            
            setTimeout(() => {
                setRevealedMatches(prev => [...prev, nextMatchToReveal]);
                setFlyingMatch(null);

                if (revealedMatches.length + 1 === fullSchedule.length) {
                    setDrawState('complete');
                    setAnnouncement(translate('tournament.drawModal.drawComplete'));
                } else {
                    setDrawState('idle');
                    setAnnouncement(translate('tournament.drawModal.waiting'));
                }
            }, 1200);

        }, 2000); // Drawing animation time
    };

    const handleSave = async () => {
        setIsSaving(true);
        const finalSchedule = fullSchedule.map(match => ({ ...match, id: crypto.randomUUID() }));
        await onSave(finalSchedule);
        setIsSaving(false);
    };

    const renderSchedule = () => {
        const rounds = [...new Set(fullSchedule.map(m => m.round))].sort((a,b) => a - b);
        
        const getRoundTitle = (roundNum: number) => {
            if (roundNum === 1) return language === 'vi' ? 'Lượt đi' : 'First Leg';
            if (roundNum === 2) return language === 'vi' ? 'Lượt về' : 'Second Leg';
            return translate('schedule.round', { round: roundNum }); // Fallback
        };

        return rounds.map(roundNum => (
            <div key={roundNum}>
                <h4 className="font-semibold text-textSecondary mt-4 mb-2">{getRoundTitle(roundNum)}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {fullSchedule.filter(m => m.round === roundNum).map(match => {
                        const isRevealed = revealedMatches.some(r => r.id === match.id);
                        return (
                            <div
                                key={match.id}
                                ref={matchRefs.current[match.id]}
                                className={`p-2 rounded-md text-center text-sm transition-all duration-500 ${
                                    isRevealed ? 'bg-surface shadow-sm' : 'bg-background dark:bg-slate-700/50'
                                }`}
                            >
                                {isRevealed ? (
                                    <span className="font-semibold text-textPrimary">{getTeamName(match.homeTeamId)} vs {getTeamName(match.awayTeamId)}</span>
                                ) : (
                                    <span className="text-textSecondary italic">{translate('tournament.drawModal.placeholderMatch')}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ));
    };

    const flyingElement = flyingMatch?.startRef.current && flyingMatch?.endRef.current ? (
        <div
            className="match-fly-animation"
            style={{
                '--start-x': `${flyingMatch.startRef.current.getBoundingClientRect().left + flyingMatch.startRef.current.getBoundingClientRect().width / 2}px`,
                '--start-y': `${flyingMatch.startRef.current.getBoundingClientRect().top + flyingMatch.startRef.current.getBoundingClientRect().height / 2}px`,
                '--end-x': `${flyingMatch.endRef.current.getBoundingClientRect().left + flyingMatch.endRef.current.getBoundingClientRect().width / 2}px`,
                '--end-y': `${flyingMatch.endRef.current.getBoundingClientRect().top + flyingMatch.endRef.current.getBoundingClientRect().height / 2}px`,
            } as React.CSSProperties}
        >
            {flyingMatch.text}
        </div>
    ) : null;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={translate('tournament.drawModal.title')} size="4xl">
            {flyingElement}
            <div className="flex flex-col h-[80vh]">
                <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-lg">
                    <h3 className="text-lg font-bold text-textPrimary mb-2">{translate('tournament.drawModal.teamPool')}</h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {teams.map(team => (
                            <span key={team.id} className="py-1 px-3 bg-secondary text-white text-sm rounded-full shadow-sm">{team.name}</span>
                        ))}
                    </div>
                </div>

                <div ref={drawButtonRef} className="flex flex-col items-center justify-center my-4 text-center">
                     <Button onClick={handleDraw} disabled={drawState !== 'idle'} size="lg" className="w-52 h-20">
                        {drawState === 'idle' && <PlayIcon className="w-6 h-6 mr-2" />}
                        {drawState === 'drawing' && <LoadingSpinner size="md" color="text-white" />}
                        {drawState === 'complete' && <CheckCircleIcon className="w-6 h-6 mr-2" />}
                        
                        {
                          drawState === 'idle' ? translate('tournament.drawModal.drawButton') : 
                          drawState === 'drawing' ? translate('tournament.drawModal.drawing') : 
                          drawState === 'complete' ? translate('tournament.drawModal.drawComplete') :
                          <span className="font-bold text-base bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-white">{announcement}</span>
                        }
                    </Button>
                    <p className="h-6 mt-2 text-textSecondary">{drawState !== 'placing' && announcement}</p>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2">{renderSchedule()}</div>

                <div className="flex justify-between items-center pt-4 mt-auto border-t border-border">
                    <Button onClick={resetDraw} variant="outline" disabled={isSaving}>
                        <ArrowPathIcon className="w-5 h-5 mr-2" />
                        {translate('tournament.drawModal.reset')}
                    </Button>
                    <Button onClick={handleSave} disabled={drawState !== 'complete' || isSaving}>
                        {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : <TrophyIcon className="w-5 h-5 mr-2" />}
                        {isSaving ? translate('tournament.drawModal.saving') : translate('tournament.button.saveSchedule')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};