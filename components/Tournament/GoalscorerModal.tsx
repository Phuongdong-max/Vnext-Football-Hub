import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { TournamentMatch, Goal, TournamentTeam, TournamentPlayer } from '../../types';
import { PlusIcon, XIcon } from '../icons';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface GoalscorerModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: TournamentMatch;
    teamType: 'home' | 'away';
    allTeams: TournamentTeam[];
    allPlayers: TournamentPlayer[];
    onSave: (matchId: string, teamType: 'home' | 'away', goals: Goal[]) => Promise<void>;
}

export const GoalscorerModal: React.FC<GoalscorerModalProps> = ({ isOpen, onClose, match, teamType, allTeams, allPlayers, onSave }) => {
    const { translate } = useLanguage();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [guestScorerName, setGuestScorerName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const teamId = teamType === 'home' ? match.homeTeamId : match.awayTeamId;
    const team = allTeams.find(t => t.id === teamId);
    const teamName = team?.name || 'Unknown Team';
    
    // Correctly find team members by mapping player IDs to the global players list
    const teamMemberIds = team?.members.map(m => m.playerId) || [];
    const teamPlayers = allPlayers.filter(p => teamMemberIds.includes(p.id));

    useEffect(() => {
        if (isOpen) {
            const initialGoals = teamType === 'home' ? (match.homeTeamGoals || []) : (match.awayTeamGoals || []);
            setGoals(JSON.parse(JSON.stringify(initialGoals))); // Deep copy to avoid mutation issues
            setGuestScorerName('');
        }
    }, [isOpen, match, teamType]);

    const addGoal = (scorerName: string, scorerId: string | null = null) => {
        const newGoal: Goal = {
            goalId: crypto.randomUUID(),
            scorerName,
            scorerId,
        };
        setGoals(prev => [...prev, newGoal]);
    };

    const handleAddGuestGoal = () => {
        if (guestScorerName.trim()) {
            addGoal(guestScorerName.trim(), null);
            setGuestScorerName('');
        }
    };
    
    const removeGoal = (goalId: string) => {
        setGoals(prev => prev.filter(g => g.goalId !== goalId));
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(match.id, teamType, goals);
        setIsSaving(false);
    };

    const modalTitle = translate('goalscorerModal.title', { teamName });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md">
            <div className="space-y-4">
                {/* Current Scorers */}
                <div>
                    <h3 className="text-lg font-semibold text-textPrimary mb-2">{translate('goalscorerModal.currentScore')}: {goals.length}</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 bg-background dark:bg-slate-800 p-2 rounded-md">
                        {goals.length > 0 ? goals.map((goal) => (
                            <div key={goal.goalId} className="flex items-center justify-between p-2 bg-surface dark:bg-slate-700 rounded-md shadow-sm">
                                <span className="text-textPrimary">{goal.scorerName}</span>
                                <Button onClick={() => removeGoal(goal.goalId)} size="sm" variant="ghost" className="!p-1">
                                    <XIcon className="w-4 h-4 text-danger" />
                                </Button>
                            </div>
                        )) : (
                            <p className="text-textSecondary italic text-center py-4">{translate('goalscorerModal.noGoals')}</p>
                        )}
                    </div>
                </div>

                {/* Team Members List */}
                <div>
                    <h4 className="font-semibold text-textPrimary mb-2">{translate('goalscorerModal.addGoalFromTeam')}</h4>
                    <div className="flex flex-wrap gap-2">
                        {teamPlayers.map(player => (
                            <Button key={player.id} variant="outline" size="sm" onClick={() => addGoal(player.name, player.id)}>
                                {player.name}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Guest Scorer */}
                <div>
                    <h4 className="font-semibold text-textPrimary mb-2">{translate('goalscorerModal.addGuestScorer')}</h4>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={guestScorerName}
                            onChange={(e) => setGuestScorerName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddGuestGoal(); }}
                            placeholder={translate('goalscorerModal.guestNamePlaceholder')}
                            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400"
                        />
                        <Button onClick={handleAddGuestGoal} disabled={!guestScorerName.trim()}>
                            <PlusIcon className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
                    <Button type="button" onClick={onClose} variant="secondary">{translate('common.button.cancel')}</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <LoadingSpinner size="sm" /> : translate('common.button.save')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};