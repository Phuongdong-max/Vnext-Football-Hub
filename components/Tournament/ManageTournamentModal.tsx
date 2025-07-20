

import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';
import { Tournament, TournamentTeam, TournamentMember, TournamentMatch, PlayerSeed } from '../../types';
import { updateTournament, onTeamDivisionUpdate } from '../../services/firebaseService';
import { TOURNAMENT_DOC_ID } from '../../constants';
import { PlusIcon, XIcon, UsersIcon } from '../icons';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface ManageTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament | null;
}

type Tab = 'teams' | 'schedule';

export const ManageTournamentModal: React.FC<ManageTournamentModalProps> = ({ isOpen, onClose, tournament: initialTournament }) => {
    const { translate } = useLanguage();
    const { currentUser, addToast } = useAppContext();

    const [activeTab, setActiveTab] = useState<Tab>('teams');
    const [tournamentData, setTournamentData] = useState<Partial<Tournament>>({});
    const [teamDividerNames, setTeamDividerNames] = useState<string[]>([]);
    const [memberInputs, setMemberInputs] = useState<Record<string, string>>({});
    const [newTeamName, setNewTeamName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTournamentData(initialTournament ? JSON.parse(JSON.stringify(initialTournament)) : { name: 'V-League Season 1', teams: [], schedule: [], standings: [] });
            
            const unsubscribe = onTeamDivisionUpdate((data) => {
                if (data && data.seedPlayers) {
                    const allNames = Object.values(data.seedPlayers)
                        .flatMap(namesStr => namesStr.split('\n'))
                        .map(name => name.trim())
                        .filter(name => name);
                    const uniqueNames = [...new Set(allNames)];
                    setTeamDividerNames(uniqueNames);
                }
            });
            
            return () => unsubscribe();
        }
    }, [isOpen, initialTournament]);

    const handleAddTeam = () => {
        if (!newTeamName.trim()) {
            addToast(translate('manageTournament.error.teamNameRequired'), 'error', true);
            return;
        }
        if (tournamentData.teams?.some(t => t.name.toLowerCase() === newTeamName.trim().toLowerCase())) {
            addToast(translate('manageTournament.error.teamNameExists'), 'error', true);
            return;
        }
        const newTeam: TournamentTeam = {
            id: `team_${Date.now()}`,
            name: newTeamName.trim(),
            members: [],
        };
        setTournamentData(prev => ({ ...prev, teams: [...(prev.teams || []), newTeam] }));
        setNewTeamName('');
    };
    
    const handleRemoveTeam = (teamId: string) => {
        setTournamentData(prev => ({ ...prev, teams: prev.teams?.filter(t => t.id !== teamId) }));
    };

    const handleAddMember = (teamId: string) => {
        const name = memberInputs[teamId]?.trim();
        if (!name) return;

        const team = tournamentData.teams?.find(t => t.id === teamId);
        if (team && team.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
            addToast(translate('manageTournament.error.memberNameExists'), 'error', true);
            return;
        }
        
        const newMember: TournamentMember = {
            id: `member_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            name: name,
        };
        
        setTournamentData(prev => ({
            ...prev,
            teams: prev.teams?.map(t => {
                if (t.id === teamId) {
                    return { ...t, members: [...t.members, newMember] };
                }
                return t;
            })
        }));
        
        // Clear input for this team
        setMemberInputs(prev => ({...prev, [teamId]: ''}));
    };
    
    const handleRemoveMember = (teamId: string, memberId: string) => {
        setTournamentData(prev => ({
            ...prev,
            teams: prev.teams?.map(t => {
                if (t.id === teamId) {
                    return { ...t, members: t.members.filter(m => m.id !== memberId) };
                }
                return t;
            })
        }));
    };
    
    const handleMemberInputChange = (teamId: string, value: string) => {
        setMemberInputs(prev => ({...prev, [teamId]: value}));
    };

    const handleGenerateSchedule = () => {
        if (!tournamentData.teams || tournamentData.teams.length < 2) {
            addToast(translate('manageTournament.error.minTeamsForSchedule'), 'error', true);
            return;
        }

        const teams = [...tournamentData.teams];
        if (teams.length % 2 !== 0) {
            teams.push({ id: 'bye', name: 'BYE', members: [] });
        }
        
        const numRounds = (teams.length - 1) * 2; // Double round-robin
        const matchesPerRound = teams.length / 2;
        const newSchedule: TournamentMatch[] = [];

        for (let round = 0; round < numRounds; round++) {
            for (let i = 0; i < matchesPerRound; i++) {
                const home = teams[i];
                const away = teams[teams.length - 1 - i];

                if (home.id === 'bye' || away.id === 'bye') continue;
                
                // Alternate home/away for the second half of the season
                const isSecondHalf = round >= (numRounds / 2);
                const homeTeamId = (isSecondHalf) ? away.id : home.id;
                const awayTeamId = (isSecondHalf) ? home.id : away.id;

                newSchedule.push({
                    id: `match_${Date.now()}_${round}_${i}`,
                    round: round + 1,
                    homeTeamId,
                    awayTeamId,
                    status: 'scheduled',
                });
            }
             // Rotate teams, keeping the first team fixed
            const lastTeam = teams.pop()!;
            teams.splice(1, 0, lastTeam);
        }
        setTournamentData(prev => ({ ...prev, schedule: newSchedule }));
        addToast('Schedule generated!', 'success');
    };

    const handleSaveChanges = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            await updateTournament(TOURNAMENT_DOC_ID, tournamentData, currentUser);
            addToast(translate('manageTournament.saveSuccess'), 'success', true);
            onClose();
        } catch (error) {
            addToast(translate('manageTournament.saveError', { error: (error as Error).message }), 'error', true);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const getTeamName = (teamId: string) => tournamentData.teams?.find(t => t.id === teamId)?.name || 'Unknown Team';
    
    const modalTitle = initialTournament ? translate('manageTournament.title') : translate('manageTournament.createTitle');
    const inputClasses = "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400";
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
            <form onSubmit={(e) => e.preventDefault()}>
                <datalist id="player-suggestions">
                    {teamDividerNames.map(name => <option key={name} value={name} />)}
                </datalist>
                <div className="flex flex-col space-y-4">
                    <div className="border-b border-border flex">
                        <button type="button" onClick={() => setActiveTab('teams')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'teams' ? 'border-b-2 border-primary text-primary' : 'text-textSecondary hover:bg-primary/10'}`}>{translate('manageTournament.tab.teams')}</button>
                        <button type="button" onClick={() => setActiveTab('schedule')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'schedule' ? 'border-b-2 border-primary text-primary' : 'text-textSecondary hover:bg-primary/10'}`}>{translate('manageTournament.tab.schedule')}</button>
                    </div>
                    
                    {activeTab === 'teams' && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder={translate('manageTournament.teamName.placeholder')} className={inputClasses} />
                                <Button type="button" onClick={handleAddTeam}><PlusIcon className="w-5 h-5 mr-1"/>{translate('manageTournament.button.addTeam')}</Button>
                            </div>
                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                                {tournamentData.teams?.map(team => (
                                    <div key={team.id} className="p-3 bg-background dark:bg-slate-800 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold">{team.name}</h4>
                                            <Button type="button" onClick={() => handleRemoveTeam(team.id)} variant="danger" size="sm"><XIcon className="w-4 h-4"/>{translate('manageTournament.button.removeTeam')}</Button>
                                        </div>
                                        <div className="space-y-2">
                                            {team.members.map(member => (
                                                <div key={member.id} className="flex items-center justify-between text-sm bg-surface dark:bg-slate-700 p-2 rounded">
                                                    <span>{member.name}</span>
                                                    <Button type="button" onClick={() => handleRemoveMember(team.id, member.id)} variant="ghost" size="sm" className="!p-1"><XIcon className="w-4 h-4 text-danger"/></Button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center space-x-2 mt-2">
                                            <input
                                                type="text"
                                                list="player-suggestions"
                                                value={memberInputs[team.id] || ''}
                                                onChange={(e) => handleMemberInputChange(team.id, e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { handleAddMember(team.id); } }}
                                                placeholder={translate('manageTournament.addMemberPlaceholder')}
                                                className={`${inputClasses} text-sm`}
                                            />
                                            <Button type="button" onClick={() => handleAddMember(team.id)} size="sm">{translate('manageTournament.button.addMember')}</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2">
                            <div className="text-center space-y-2 mb-4 p-4 bg-background dark:bg-slate-800 rounded-lg sticky top-0 z-10">
                                <p className="text-sm text-textSecondary">{translate('manageTournament.scheduleInfo')}</p>
                                <Button type="button" onClick={handleGenerateSchedule} variant="secondary">
                                    <UsersIcon className="w-5 h-5 mr-2" />
                                    {translate('manageTournament.button.generateSchedule')}
                                </Button>
                            </div>

                            {tournamentData.schedule && tournamentData.schedule.length > 0 ? (
                                <div className="space-y-4">
                                    {[...new Set(tournamentData.schedule.map(m => m.round))].sort((a,b) => a-b).map(roundNum => (
                                        <div key={roundNum}>
                                            <h4 className="text-md font-semibold text-textSecondary mb-2">
                                                {translate('schedule.round', { round: roundNum })}
                                            </h4>
                                            <div className="space-y-2">
                                                {tournamentData.schedule?.filter(m => m.round === roundNum).map(match => (
                                                    <div key={match.id} className="flex items-center justify-center text-sm p-2 bg-surface dark:bg-slate-700 rounded-md">
                                                        <span className="font-medium text-right w-2/5 truncate pr-2">{getTeamName(match.homeTeamId)}</span>
                                                        <span className="text-textSecondary font-bold mx-2">vs</span>
                                                        <span className="font-medium text-left w-2/5 truncate pl-2">{getTeamName(match.awayTeamId)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-textSecondary italic py-4">{translate('schedule.noMatches')}</p>
                            )}
                        </div>
                    )}
                    
                    <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
                        <Button type="button" onClick={onClose} variant="secondary">{translate('common.button.cancel')}</Button>
                        <Button type="button" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? <LoadingSpinner size="sm" /> : translate('manageTournament.button.saveChanges')}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};