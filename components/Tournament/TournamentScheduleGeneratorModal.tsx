import React, { useState, useEffect, useCallback } from 'react';
import { TournamentTeam, TournamentMatch } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ArrowPathIcon, TrophyIcon } from '../icons';

interface TournamentScheduleGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    teams: TournamentTeam[];
    onSave: (schedule: TournamentMatch[]) => Promise<void>;
}

type ScheduleType = 'single-round-robin' | 'double-round-robin' | 'league-playoffs';

export const TournamentScheduleGeneratorModal: React.FC<TournamentScheduleGeneratorModalProps> = ({ isOpen, onClose, teams, onSave }) => {
    const { translate } = useLanguage();
    const [scheduleType, setScheduleType] = useState<ScheduleType>('single-round-robin');
    const [previewSchedule, setPreviewSchedule] = useState<TournamentMatch[] | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const getTeamDisplayInfo = useCallback((teamId: string) => {
        if (teamId.startsWith('TBD-')) {
            return { name: `(${translate('schedule.tbd')})`, color: '#a1a1aa' };
        }
        const team = teams.find(t => t.id === teamId);
        return { name: team?.name || '?', color: team?.color || '#a1a1aa' };
    }, [teams, translate]);


    const resetState = useCallback(() => {
        setScheduleType('single-round-robin');
        setPreviewSchedule(null);
        setIsSaving(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            resetState();
        }
    }, [isOpen, resetState]);

    const handleGeneratePreview = () => {
        let generatedMatches: TournamentMatch[] = [];
        const uniquePairs: { home: TournamentTeam; away: TournamentTeam }[] = [];
        
        // Create all unique pairs of teams
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                uniquePairs.push({ home: teams[i], away: teams[j] });
            }
        }
        
        // Shuffle the pairs to randomize match order within rounds
        const shuffledPairs = [...uniquePairs].sort(() => Math.random() - 0.5);

        const firstLegMatches: TournamentMatch[] = shuffledPairs.map((pair, index) => ({
            id: `preview_leg1_${index}`,
            round: index + 1, // Use round for sorting, display index+1 as match number
            homeTeamId: pair.home.id,
            awayTeamId: pair.away.id,
            status: 'scheduled', homeTeamScore: null, awayTeamScore: null, date: null,
        }));

        if (scheduleType === 'single-round-robin' || scheduleType === 'league-playoffs') {
            generatedMatches = firstLegMatches;
        }

        if (scheduleType === 'double-round-robin') {
            const secondLegMatches: TournamentMatch[] = firstLegMatches.map((match, index) => ({
                ...match,
                id: `preview_leg2_${index}`,
                round: firstLegMatches.length + index + 1,
                homeTeamId: match.awayTeamId,
                awayTeamId: match.homeTeamId,
            }));
            generatedMatches = [...firstLegMatches, ...secondLegMatches];
        }

        if (scheduleType === 'league-playoffs') {
            const lastRound = generatedMatches.length > 0 ? Math.max(...generatedMatches.map(m => m.round)) : 0;
            const thirdPlaceMatch: TournamentMatch = {
                id: 'preview_playoff_3rd',
                round: lastRound + 1,
                matchLabel: translate('tournament.generatorModal.playoffs.thirdPlace'),
                homeTeamId: 'TBD-3P-1',
                awayTeamId: 'TBD-3P-2',
                status: 'scheduled', homeTeamScore: null, awayTeamScore: null, date: null,
            };
            const finalMatch: TournamentMatch = {
                id: 'preview_playoff_final',
                round: lastRound + 2,
                matchLabel: translate('tournament.generatorModal.playoffs.final'),
                homeTeamId: 'TBD-FINAL-1',
                awayTeamId: 'TBD-FINAL-2',
                status: 'scheduled', homeTeamScore: null, awayTeamScore: null, date: null,
            };
            generatedMatches.push(thirdPlaceMatch, finalMatch);
        }

        setPreviewSchedule(generatedMatches.sort((a, b) => a.round - b.round));
    };

    const handleSave = async () => {
        if (!previewSchedule) return;
        setIsSaving(true);
        // Assign new, permanent IDs before saving
        const finalSchedule = previewSchedule.map(match => ({ ...match, id: crypto.randomUUID() }));
        await onSave(finalSchedule);
        setIsSaving(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={translate('tournament.generatorModal.title')} size="xl">
            <div className="space-y-4">
                {/* Schedule Type Selection */}
                <div className="flex flex-wrap gap-2">
                    {(['single-round-robin', 'double-round-robin', 'league-playoffs'] as ScheduleType[]).map(type => (
                        <Button key={type} onClick={() => setScheduleType(type)} variant={scheduleType === type ? 'primary' : 'outline'}>
                            {translate(`tournament.generatorModal.type.${type.replace(/-/g, '')}`)}
                        </Button>
                    ))}
                </div>
                
                <div className="text-center mt-4">
                    <Button onClick={handleGeneratePreview} size="lg">
                        <ArrowPathIcon className="w-5 h-5 mr-2" />
                        {translate('tournament.generatorModal.button.generatePreview')}
                    </Button>
                </div>
                
                {/* Schedule Preview */}
                <div className="mt-4 pt-4 border-t border-border">
                    <h3 className="font-semibold text-textPrimary mb-2 text-center">{translate('tournament.generatorModal.schedulePreview')}</h3>
                    <div className="max-h-[45vh] overflow-y-auto space-y-3 p-2 bg-background dark:bg-slate-800/50 rounded-md">
                        {previewSchedule ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {previewSchedule.map((match, index) => {
                                    const homeInfo = getTeamDisplayInfo(match.homeTeamId);
                                    const awayInfo = getTeamDisplayInfo(match.awayTeamId);
                                    return (
                                        <div key={match.id} className="p-3 bg-surface rounded-lg shadow-sm">
                                            <p className="font-bold text-textSecondary text-xs mb-2">
                                                {match.matchLabel || translate('schedule.match', { matchNumber: index + 1 })}
                                            </p>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="flex items-center gap-2 font-medium text-textPrimary text-right flex-1 justify-end">
                                                    <span>{homeInfo.name}</span>
                                                    <div style={{ backgroundColor: homeInfo.color }} className="w-1.5 h-4 rounded-full flex-shrink-0"/>
                                                </span>
                                                <span className="text-textSecondary text-xs font-bold">VS</span>
                                                <span className="flex items-center gap-2 font-medium text-textPrimary text-left flex-1">
                                                    <div style={{ backgroundColor: awayInfo.color }} className="w-1.5 h-4 rounded-full flex-shrink-0"/>
                                                    <span>{awayInfo.name}</span>
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-textSecondary py-8 italic">{translate('tournament.generatorModal.noPreview')}</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t border-border">
                    <Button onClick={handleSave} disabled={!previewSchedule || isSaving}>
                        {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : <TrophyIcon className="w-5 h-5 mr-2" />}
                        {isSaving ? translate('tournament.drawModal.saving') : translate('tournament.button.saveSchedule')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
