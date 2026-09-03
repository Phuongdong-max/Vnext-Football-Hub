import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TournamentTeam } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ArrowPathIcon, PlayIcon, CheckCircleIcon, TShirtIcon } from '../icons';

interface TournamentJerseyDrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    teams: TournamentTeam[];
    onSave: (teams: TournamentTeam[]) => Promise<void>;
}

const JERSEYS = ['jerseys.vnextPink', 'jerseys.vnextNew', 'jerseys.pitch'];

const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
};

export const TournamentJerseyDrawModal: React.FC<TournamentJerseyDrawModalProps> = ({ isOpen, onClose, teams, onSave }) => {
    const { translate } = useLanguage();
    const [drawState, setDrawState] = useState<'idle' | 'drawing' | 'complete'>('idle');
    const [assignedJerseys, setAssignedJerseys] = useState<Record<string, string>>({}); // teamId: jerseyKey
    const [shuffledTeams, setShuffledTeams] = useState<TournamentTeam[]>([]);
    const [shuffledJerseys, setShuffledJerseys] = useState<string[]>([]);
    const [drawIndex, setDrawIndex] = useState(0);
    const [diceDisplayText, setDiceDisplayText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const diceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const resetDraw = useCallback(() => {
        // Clear all jersey assignments to ensure a fresh start for the draw session.
        setAssignedJerseys({});
        setShuffledTeams(shuffleArray(teams));
        setShuffledJerseys(shuffleArray(JERSEYS));
        setDrawIndex(0);
        setDiceDisplayText('');
        setDrawState('idle');
    }, [teams]);

    useEffect(() => {
        if (isOpen) {
            resetDraw();
        } else {
            if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
        }
    }, [isOpen, resetDraw]);

    const handleDraw = () => {
        const unassignedTeams = shuffledTeams.filter(t => !assignedJerseys[t.id]);
        const availableJerseys = shuffledJerseys.filter(jKey => !Object.values(assignedJerseys).includes(jKey));

        if (drawState !== 'idle' || unassignedTeams.length === 0 || availableJerseys.length === 0) return;
        
        setDrawState('drawing');
        const teamToAssign = unassignedTeams[0];
        const jerseyToAssignKey = availableJerseys[0];

        // Dice roll animation
        let i = 0;
        diceIntervalRef.current = setInterval(() => {
            setDiceDisplayText(translate(availableJerseys[i % availableJerseys.length]));
            i++;
        }, 100);

        setTimeout(() => {
            if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
            setDiceDisplayText(translate(jerseyToAssignKey));
            setAssignedJerseys(prev => ({ ...prev, [teamToAssign.id]: jerseyToAssignKey }));
            
            const nextUnassigned = unassignedTeams.length - 1;
            const nextAvailable = availableJerseys.length - 1;
            
            if (nextUnassigned === 0 || nextAvailable === 0) {
                 setDrawState('complete');
            } else {
                setDrawState('idle');
            }
        }, 2000);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const updatedTeams = teams.map(team => ({
            ...team,
            jersey: translate(assignedJerseys[team.id]) || team.jersey,
        }));
        await onSave(updatedTeams);
        setIsSaving(false);
    };

    const getTeamBoxClass = (teamId: string) => {
        const jerseyKey = assignedJerseys[teamId];
        if (!jerseyKey) return 'bg-black/5 dark:bg-white/5';
        if (jerseyKey === 'jerseys.vnextPink') return 'bg-pink-100 dark:bg-pink-900/50 border-pink-400';
        if (jerseyKey === 'jerseys.vnextNew') return 'bg-blue-100 dark:bg-blue-900/50 border-blue-400';
        if (jerseyKey === 'jerseys.pitch') return 'bg-green-100 dark:bg-green-900/50 border-green-400';
        return 'bg-black/5 dark:bg-white/5';
    };
    
    const unassignedTeams = shuffledTeams.filter(t => !assignedJerseys[t.id]);
    const canDraw = drawState === 'idle' && unassignedTeams.length > 0 && JERSEYS.length > Object.keys(assignedJerseys).length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={translate('jerseyDrawModal.title')} size="xl">
            <div className="flex flex-col h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {shuffledTeams.map(team => (
                         <div key={team.id} className={`p-4 rounded-2xl text-center border-b-4 transition-all duration-500 ${getTeamBoxClass(team.id)}`}>
                            <h4 className="font-bold text-lg text-textPrimary">{team.name}</h4>
                            <div className="h-8 mt-2 flex items-center justify-center">
                               {assignedJerseys[team.id] ? (
                                    <span className="font-semibold text-primary text-md">{translate(assignedJerseys[team.id])}</span>
                               ) : (
                                    <span className="text-textSecondary text-2xl">?</span>
                               )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center justify-center my-6 text-center flex-grow">
                     <div className="w-64 h-24 bg-surface dark:bg-white/5 rounded-2xl flex items-center justify-center shadow-inner">
                        <span className="text-xl font-bold text-primary transition-all duration-100">
                           {drawState === 'drawing' ? diceDisplayText : (assignedJerseys[unassignedTeams[0]?.id] || diceDisplayText || '🎲')}
                        </span>
                     </div>
                     <Button onClick={handleDraw} disabled={!canDraw} size="lg" className="mt-4">
                        {drawState === 'drawing' && <LoadingSpinner size="sm" color="text-white" className="mr-2" />}
                        {translate('jerseyDrawModal.drawButton')}
                    </Button>
                </div>

                <div className="flex justify-between items-center pt-4 mt-4 border-t border-border">
                    <Button onClick={resetDraw} variant="outline" disabled={isSaving || drawState === 'drawing'}>
                        <ArrowPathIcon className="w-5 h-5 mr-2" />
                        {translate('jerseyDrawModal.reset')}
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || drawState === 'drawing'}>
                        {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : <TShirtIcon className="w-5 h-5 mr-2" />}
                        {isSaving ? translate('jerseyDrawModal.saving') : translate('jerseyDrawModal.saveButton')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};