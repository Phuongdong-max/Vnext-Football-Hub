import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import {
    onTournamentUpdate,
    updateTournament,
    onAllPlayersUpdate
} from '../services/firebaseService';
import { Tournament, TeamStanding, TournamentMatch, TournamentTeam, UserRole, Goal, TournamentPlayer } from '../types';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { PencilAltIcon, TrophyIcon, UsersIcon, CalendarIcon, TableCellsIcon, UserCircleIcon, PlusCircleIcon, ArrowPathIcon, TShirtIcon, StarIcon, PencilIcon, XIcon } from '../components/icons';
import { ManageTournamentModal } from '../components/Tournament/ManageTournamentModal';
import { TournamentScheduleGeneratorModal } from '../components/Tournament/TournamentScheduleGeneratorModal';
import { TournamentJerseyDrawModal } from '../components/Tournament/TournamentJerseyDrawModal';
import { GoalscorerModal } from '../components/Tournament/GoalscorerModal';
import { TopScorersList } from '../components/Tournament/TopScorersList';
import { PlayerDetailModal } from '../components/Tournament/PlayerDetailModal';
import { TeamAnalysisModal } from '../components/Tournament/TeamAnalysisModal';
import { TournamentMatchAnalysisModal } from '../components/Tournament/TournamentMatchAnalysisModal';

// --- Edit Match Modal (defined inside TournamentPage) ---
interface EditMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: TournamentMatch;
    teams: TournamentTeam[];
    onSave: (updatedMatch: TournamentMatch) => Promise<void>;
}

const EditMatchModal: React.FC<EditMatchModalProps> = ({ isOpen, onClose, match, teams, onSave }) => {
    const { translate } = useLanguage();
    const [editedMatch, setEditedMatch] = useState<TournamentMatch>(match);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setEditedMatch(match);
            setError('');
        }
    }, [isOpen, match]);

    const handleSave = async () => {
        if (editedMatch.homeTeamId === editedMatch.awayTeamId && editedMatch.homeTeamId !== '' && !editedMatch.homeTeamId.startsWith('TBD-')) {
            setError(translate('schedule.error.teamsCannotBeSame'));
            return;
        }
        setError('');
        setIsSaving(true);
        await onSave(editedMatch);
        setIsSaving(false);
        onClose();
    };
    
    const inputClasses = "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={translate('schedule.editMatchTitle')}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="homeTeam" className="block text-sm font-medium text-textPrimary mb-1">{teams.find(t => t.id === match.homeTeamId)?.name || match.homeTeamId}</label>
                    <select id="homeTeam" value={editedMatch.homeTeamId} onChange={e => setEditedMatch(m => ({ ...m, homeTeamId: e.target.value }))} className={inputClasses}>
                        <option value={match.homeTeamId.startsWith('TBD-') ? match.homeTeamId : ''}>{translate('schedule.tbd')}</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="awayTeam" className="block text-sm font-medium text-textPrimary mb-1">{teams.find(t => t.id === match.awayTeamId)?.name || match.awayTeamId}</label>
                     <select id="awayTeam" value={editedMatch.awayTeamId} onChange={e => setEditedMatch(m => ({ ...m, awayTeamId: e.target.value }))} className={inputClasses}>
                        <option value={match.awayTeamId.startsWith('TBD-') ? match.awayTeamId : ''}>{translate('schedule.tbd')}</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                    <Button onClick={onClose} variant="secondary">{translate('common.button.cancel')}</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <LoadingSpinner size="sm" /> : translate('common.button.save')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};


const TeamDisplay = ({ teamId, alignment = 'start', teams }: { teamId: string, alignment?: 'start' | 'end', teams: TournamentTeam[] }) => {
    const { translate } = useLanguage();
    if (teamId.startsWith('TBD-')) {
         return <div className="w-full md:w-2/5 text-center font-semibold text-textSecondary italic">{translate('schedule.tbd')}</div>;
    }
    const team = teams.find(t => t.id === teamId);
    if (!team) return <div className="w-full md:w-2/5 text-center font-semibold text-textPrimary">Unknown Team</div>;

    const teamColor = team.color || '#a1a1aa'; // default slate-400
    const alignClass = alignment === 'end' ? 'md:flex-row-reverse' : 'md:flex-row';
    const textAlign = alignment === 'end' ? 'md:text-right' : 'md:text-left';

    return (
        <div className={`flex items-center justify-center ${textAlign} w-full md:w-2/5 font-semibold text-textPrimary ${alignClass} gap-3`}>
            <div style={{ backgroundColor: teamColor }} className={`w-1 h-4 rounded-full flex-shrink-0`}></div>
            <span>{team.name}</span>
        </div>
    );
};

/** One side of a fixture row. Highlights the winner and fades the loser so a
 *  result is readable at a glance instead of having to compare two numbers. */
const ScheduleTeam = ({ teamId, teams, align, isWinner, dimmed }: {
    teamId: string; teams: TournamentTeam[]; align: 'start' | 'end'; isWinner: boolean; dimmed: boolean;
}) => {
    const { translate } = useLanguage();
    const team = teams.find(t => t.id === teamId);
    const justify = align === 'end' ? 'justify-end text-right' : 'justify-start text-left';

    if (teamId.startsWith('TBD-')) {
        return <div className={`flex items-center gap-2 ${justify} min-w-0`}>
            <span className="truncate text-sm italic text-textSecondary">{translate('schedule.tbd')}</span>
        </div>;
    }

    const content = (
        <>
            <span style={{ backgroundColor: team?.color || '#a1a1aa' }} className="h-5 w-1 flex-shrink-0 rounded-full" />
            <span className={`truncate text-sm sm:text-base ${isWinner ? 'font-bold text-textPrimary' : dimmed ? 'font-medium text-textSecondary' : 'font-semibold text-textPrimary'}`}>
                {team?.name || teamId}
            </span>
        </>
    );

    return (
        <div className={`flex min-w-0 items-center gap-2 ${justify}`}>
            {align === 'end' ? <>{content}</> : <>{content}</>}
        </div>
    );
};

type TournamentTabId = 'standings' | 'schedule' | 'teams' | 'topScorers';

interface TournamentPageProps {
    // When SeasonPage hosts this as one panel of the season shell it owns the
    // season picker and the tab bar, so both are suppressed here and the active
    // tab is driven from outside.
    embeddedTab?: TournamentTabId;
}

export const TournamentPage: React.FC<TournamentPageProps> = ({ embeddedTab }) => {
    const { translate, language } = useLanguage();
    const {
        currentUser, isFirebaseReady, addToast, canEdit: canEditRaw, isAdmin,
        selectedTournamentId, isSelectedTournamentArchived,
    } = useAppContext();

    // An archived season is a historical record: readable by everyone, editable
    // by nobody, so every edit affordance folds away rather than failing on save.
    const canEdit = canEditRaw && !isSelectedTournamentArchived;

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [allPlayers, setAllPlayers] = useState<TournamentPlayer[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSwitchingTournament, setIsSwitchingTournament] = useState(false);
    const [ownActiveTab, setActiveTab] = useState<TournamentTabId>('standings');
    const activeTab: TournamentTabId = embeddedTab ?? ownActiveTab;
    const isEmbedded = embeddedTab !== undefined;
    
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
    const [isJerseyDrawModalOpen, setIsJerseyDrawModalOpen] = useState(false);
    const [isGoalscorerModalOpen, setIsGoalscorerModalOpen] = useState(false);
    const [isPlayerDetailModalOpen, setIsPlayerDetailModalOpen] = useState(false);
    const [isEditMatchModalOpen, setIsEditMatchModalOpen] = useState(false);
    
    const [editingMatchInfo, setEditingMatchInfo] = useState<{ match: TournamentMatch; teamType: 'home' | 'away' } | null>(null);
    const [matchToEdit, setMatchToEdit] = useState<TournamentMatch | null>(null);
    const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<TournamentPlayer | null>(null);
    const [teamForAnalysis, setTeamForAnalysis] = useState<TournamentTeam | null>(null);
    const [matchForAnalysis, setMatchForAnalysis] = useState<TournamentMatch | null>(null);

    // The tournament list and the current selection now live in AppContext, so
    // Player Info and Team Divider read the same season. This page only
    // subscribes to whichever one is selected.
    useEffect(() => {
        if (!isFirebaseReady || !selectedTournamentId) {
            setTournament(null);
            setIsLoading(false);
            return;
        }

        setIsSwitchingTournament(true);
        const unsubscribe = onTournamentUpdate(selectedTournamentId, (data) => {
            setTournament(data);
            setIsLoading(false);
            setIsSwitchingTournament(false);
        });

        return () => unsubscribe();
    }, [isFirebaseReady, selectedTournamentId]);

    // Squads are per season now, so this follows the selected tournament.
    useEffect(() => {
        if (!isFirebaseReady || !selectedTournamentId) {
            setAllPlayers([]);
            return;
        }
        const unsubscribe = onAllPlayersUpdate(selectedTournamentId, setAllPlayers);
        return () => unsubscribe();
    }, [isFirebaseReady, selectedTournamentId]);

    const availablePlayersForTournament = useMemo(() => {
        const legacyPlayers = tournament?.players ?? [];
        const combinedPlayers = new Map<string, TournamentPlayer>();

        // Add legacy players first
        for (const player of legacyPlayers) {
            if (player && player.id) {
                combinedPlayers.set(player.id, player);
            }
        }

        // Overwrite with global players, ensuring they take precedence
        for (const player of allPlayers) {
            if (player && player.id) {
                combinedPlayers.set(player.id, player);
            }
        }
        
        return Array.from(combinedPlayers.values());
    }, [tournament, allPlayers]);
    
    const calculateStandings = (teams: TournamentTeam[], schedule: TournamentMatch[]): TeamStanding[] => {
        const standingsMap: { [teamId: string]: TeamStanding } = {};

        teams.forEach(team => {
            standingsMap[team.id] = { teamId: team.id, teamName: team.name, logoUrl: team.logoUrl ?? null, teamColor: team.color ?? null, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
        });

        schedule.forEach(match => {
            const homeScore = match.homeTeamGoals?.length ?? match.homeTeamScore;
            const awayScore = match.awayTeamGoals?.length ?? match.awayTeamScore;

            if (match.status !== 'finished' || typeof homeScore !== 'number' || typeof awayScore !== 'number') return;

            const home = standingsMap[match.homeTeamId];
            const away = standingsMap[match.awayTeamId];

            if (!home || !away) return;

            home.played++; away.played++;
            home.goalsFor += homeScore; away.goalsFor += awayScore;
            home.goalsAgainst += awayScore; away.goalsAgainst += homeScore;
            
            if (homeScore > awayScore) { home.wins++; away.losses++; home.points += 3;
            } else if (homeScore < awayScore) { away.wins++; home.losses++; away.points += 3;
            } else { home.draws++; away.draws++; home.points += 1; away.points += 1; }
        });
        
        const standingsArray = Object.values(standingsMap).map(s => ({...s, goalDifference: s.goalsFor - s.goalsAgainst}));

        standingsArray.sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
            if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
            return a.teamName.localeCompare(b.teamName);
        });
        
        return standingsArray;
    };
    
    // --- Editing squads -----------------------------------------------------
    //
    // Members are picked from this season's squad, never typed, so a team can
    // only ever contain real players. Drafts hold ids; a player already on some
    // team is not offered again, which makes double-assignment impossible.
    const [isEditingTeams, setIsEditingTeams] = useState(false);
    const [teamDrafts, setTeamDrafts] = useState<Record<string, string[]>>({});
    const [isSavingTeams, setIsSavingTeams] = useState(false);

    const startEditingTeams = () => {
        const drafts: Record<string, string[]> = {};
        (tournament?.teams ?? []).forEach(team => {
            drafts[team.id] = (team.members ?? []).map(m => m.playerId);
        });
        setTeamDrafts(drafts);
        setIsEditingTeams(true);
    };

    const assignedIds = new Set(Object.values(teamDrafts).flat());
    const unassignedPlayers = availablePlayersForTournament
        .filter(p => !assignedIds.has(p.id))
        .sort((a, b) => (a.jerseyNumber || 0) - (b.jerseyNumber || 0));

    const addMember = (teamId: string, playerId: string) => {
        if (!playerId) return;
        setTeamDrafts(prev => ({ ...prev, [teamId]: [...(prev[teamId] ?? []), playerId] }));
    };
    const removeMember = (teamId: string, playerId: string) => {
        setTeamDrafts(prev => ({ ...prev, [teamId]: (prev[teamId] ?? []).filter(id => id !== playerId) }));
    };

    const handleSaveTeams = async () => {
        if (!currentUser || !tournament || !selectedTournamentId) return;
        setIsSavingTeams(true);
        try {
            const teams: TournamentTeam[] = (tournament.teams ?? []).map(team => ({
                ...team,
                members: (teamDrafts[team.id] ?? []).map(playerId => ({ playerId })),
            }));
            await updateTournament(selectedTournamentId, { teams }, currentUser);
            addToast('teamList.saved', 'success');
            setIsEditingTeams(false);
        } catch (error) {
            addToast('teamList.saveError', 'error', { message: (error as Error).message });
        } finally {
            setIsSavingTeams(false);
        }
    };

    const topScorers = useMemo(() => {
        if (!tournament?.schedule || !tournament?.teams || !availablePlayersForTournament) return [];
        const scorerStats: Record<string, { name: string; goals: number; teamId: string; isGuest: boolean; jerseyNumber?: number; }> = {};

        tournament.schedule.forEach(match => {
            const processGoals = (goals: Goal[] = [], teamId: string) => {
                goals.forEach(goal => {
                    const key = goal.scorerId ? goal.scorerId : `guest_${goal.scorerName}`;
                    if (!scorerStats[key]) {
                        const player = goal.scorerId ? availablePlayersForTournament.find(p => p.id === goal.scorerId) : undefined;
                        scorerStats[key] = { name: goal.scorerName, goals: 0, teamId: teamId, isGuest: !goal.scorerId, jerseyNumber: player?.jerseyNumber };
                    }
                    scorerStats[key].goals++;
                    scorerStats[key].teamId = teamId;
                });
            };
            processGoals(match.homeTeamGoals, match.homeTeamId);
            processGoals(match.awayTeamGoals, match.awayTeamId);
        });

        return Object.values(scorerStats).map(stats => ({ ...stats, teamName: tournament.teams.find(t => t.id === stats.teamId)?.name || '?' }))
            .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
    }, [tournament, availablePlayersForTournament]);



    // Replaces deletion. Past seasons have to stay readable, so the worst an
    // admin can do here is lock one - and that is reversible.

    const handleOpenGoalscorerModal = (match: TournamentMatch, teamType: 'home' | 'away') => {
        if (!canEdit) return;
        setEditingMatchInfo({ match, teamType });
        setIsGoalscorerModalOpen(true);
    };

    const handleOpenPlayerDetailModal = (player: TournamentPlayer) => {
        setSelectedPlayerForDetail(player);
        setIsPlayerDetailModalOpen(true);
    };

    const handleOpenEditMatchModal = (match: TournamentMatch) => {
        setMatchToEdit(match);
        setIsEditMatchModalOpen(true);
    };

    const handleSaveEditedMatch = async (updatedMatch: TournamentMatch) => {
        if (!currentUser || !tournament) return;
        const newSchedule = tournament.schedule.map(m => m.id === updatedMatch.id ? updatedMatch : m);
        await updateTournament(tournament.id, { schedule: newSchedule }, currentUser);
        addToast('tournament.success.updateMatch', 'success');
    };

    const handleSaveGoals = async (matchId: string, teamType: 'home' | 'away', goals: Goal[]) => {
        if (!currentUser || !tournament) return;
        setIsLoading(true);

        const newSchedule = tournament.schedule.map(match => {
            if (match.id === matchId) {
                const updatedMatch = { ...match };
                if (teamType === 'home') { updatedMatch.homeTeamGoals = goals; updatedMatch.homeTeamScore = goals.length; } 
                else { updatedMatch.awayTeamGoals = goals; updatedMatch.awayTeamScore = goals.length; }
                updatedMatch.status = (updatedMatch.homeTeamScore !== null && updatedMatch.awayTeamScore !== null) ? 'finished' : 'scheduled';
                return updatedMatch;
            }
            return match;
        });

        const newStandings = calculateStandings(tournament.teams, newSchedule);
        
        try {
            await updateTournament(tournament.id, { schedule: newSchedule, standings: newStandings }, currentUser);
            addToast('tournament.success.updateMatch', 'success');
            setIsGoalscorerModalOpen(false);
        } catch (error) {
            addToast('tournament.error.updateMatchGeneric', 'error', { message: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveGeneratedSchedule = async (schedule: TournamentMatch[]) => {
        if (!tournament || !currentUser) return;
        setIsLoading(true);
        try {
            const newStandings = calculateStandings(tournament.teams, schedule);
            await updateTournament(tournament.id, { schedule, standings: newStandings }, currentUser);
            addToast('tournament.success.saveSchedule', 'success');
            setIsGeneratorModalOpen(false);
        } catch(error) {
            addToast('tournament.error.saveScheduleGeneric', 'error', { message: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveJerseys = async (updatedTeams: TournamentTeam[]) => {
        if (!tournament || !currentUser) return;
        setIsLoading(true);
        try {
            await updateTournament(tournament.id, { teams: updatedTeams }, currentUser);
            addToast('manageTournament.saveSuccess', 'success');
            setIsJerseyDrawModalOpen(false);
        } catch(error) {
            addToast('manageTournament.saveError', 'error', { error: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !tournament) {
        return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /><p className="ml-4 text-textPrimary">{translate('tournament.loading')}</p></div>;
    }

    const panelClasses = "bg-surface shadow-lg rounded-lg";

    const renderContent = () => {
        if (isSwitchingTournament) {
             return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /><p className="ml-4 text-textPrimary">{translate('tournament.loading')}</p></div>;
        }

        if (!tournament) {
            return (
                <div className="text-center py-10">
                    <p className="text-textSecondary">{translate('tournament.noData')}</p>
                    {/* Seasons are created on the admin page now, so point there
                        instead of opening a form this page no longer owns. */}
                    {isAdmin && (
                        <Link to="/admin" className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-opacity-90">
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            {translate('admin.season.createButton')}
                        </Link>
                    )}
                </div>
            );
        }
        
        const { name, teams, schedule, standings, lastUpdated, updatedBy } = tournament;
        
        const tabs = [
            { id: 'standings', label: 'tournament.tab.standings', icon: <TableCellsIcon className="w-5 h-5" /> },
            { id: 'schedule', label: 'tournament.tab.schedule', icon: <CalendarIcon className="w-5 h-5" /> },
            { id: 'teams', label: 'tournament.tab.teams', icon: <UsersIcon className="w-5 h-5" /> },
            { id: 'topScorers', label: 'tournament.tab.topScorers', icon: <StarIcon className="w-5 h-5" /> },
        ] as const;


        return (
            <div className="space-y-6 animate-fadeIn">
                {/* The season shell already shows the name and the last-updated
                    line in its hero, so this header would be a duplicate there. */}
                {!isEmbedded && (
                    <header className="relative text-center">
                        <div className="bg-surface backdrop-blur-sm p-4 rounded-xl shadow-lg inline-block border border-border">
                            <h1 className="text-3xl sm:text-4xl font-bold text-textPrimary tracking-tight">{name}</h1>
                            {lastUpdated && updatedBy && (
                                <p className="text-xs text-textSecondary mt-2">{translate('tournament.lastUpdated', { name: updatedBy.name, date: new Date(lastUpdated).toLocaleString(language) })}</p>
                            )}
                        </div>
                    </header>
                )}
                {/* Tab Navigation - hidden when the season shell provides it */}
                {!isEmbedded && <div className="border-b border-border">
                    <nav className="-mb-px flex flex-wrap gap-x-2 sm:gap-x-4" aria-label="Tabs">
                        {tabs.map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 whitespace-nowrap py-3 px-2 sm:px-4 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-textSecondary hover:border-gray-300 dark:hover:border-slate-600 hover:text-textPrimary'
                                }`}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{translate(tab.label)}</span>
                            </button>
                        ))}
                    </nav>
                </div>}

                {/* Tab Content */}
                <div className="mt-4">
                    {activeTab === 'standings' && (
                        <section>
                            <div className={`${panelClasses} overflow-hidden`}>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-slate-100 dark:bg-slate-800">
                                            <tr>
                                                <th scope="col" className="w-1/3 pl-4 pr-3 py-3.5 text-left text-sm font-semibold text-textPrimary sm:pl-6">{translate('standingsTable.team')}</th>
                                                <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.played')}>{translate('standingsTable.played')}</th>
                                                <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.wins')}>{translate('standingsTable.wins')}</th>
                                                <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.draws')}>{translate('standingsTable.draws')}</th>
                                                <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.losses')}>{translate('standingsTable.losses')}</th>
                                                <th scope="col" className="hidden lg:table-cell px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.gf')}>{translate('standingsTable.gf')}</th>
                                                <th scope="col" className="hidden lg:table-cell px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.ga')}>{translate('standingsTable.ga')}</th>
                                                <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.gd')}>{translate('standingsTable.gd')}</th>
                                                <th scope="col" className="px-4 py-3.5 text-center text-sm font-semibold text-textPrimary" title={translate('standingsTable.points')}>{translate('standingsTable.points')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border bg-surface">
                                            {standings?.map((s, index) => (
                                                <tr key={s.teamId} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors duration-200">
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                        <div className="flex items-center">
                                                            <span className="w-6 text-center mr-3 font-bold text-lg text-textSecondary">{index + 1}</span>
                                                            <div style={{ backgroundColor: s.teamColor || '#a1a1aa' }} className="w-1.5 h-6 rounded-full mr-4 flex-shrink-0 shadow-sm"></div>
                                                            <div className="font-semibold text-base text-textPrimary">{s.teamName}</div>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-2 py-4 text-center text-base font-medium text-textSecondary">{s.played}</td>
                                                    <td className="whitespace-nowrap px-2 py-4 text-center text-base font-semibold text-green-600 dark:text-green-500">{s.wins}</td>
                                                    <td className="whitespace-nowrap px-2 py-4 text-center text-base font-semibold text-yellow-600 dark:text-yellow-500">{s.draws}</td>
                                                    <td className="whitespace-nowrap px-2 py-4 text-center text-base font-semibold text-red-600 dark:text-red-500">{s.losses}</td>
                                                    <td className="whitespace-nowrap hidden lg:table-cell px-2 py-4 text-center text-sm text-textSecondary">{s.goalsFor}</td>
                                                    <td className="whitespace-nowrap hidden lg:table-cell px-2 py-4 text-center text-sm text-textSecondary">{s.goalsAgainst}</td>
                                                    <td className="whitespace-nowrap px-2 py-4 text-center text-base font-bold text-textPrimary">{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
                                                    <td className="whitespace-nowrap px-4 py-4 text-center"><span className="inline-block bg-primary text-white text-base font-bold px-3 py-1 rounded-md shadow-md">{s.points}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    )}
                    {activeTab === 'schedule' && (
                        <section className="space-y-6">
                            {/* Generating fixtures and drawing jerseys used to sit
                                above every tab. They belong with the schedule. */}
                            {canEdit && (
                                <div className="flex flex-wrap justify-end gap-2">
                                    <Button onClick={() => setIsGeneratorModalOpen(true)} disabled={!tournament || tournament.teams.length < 2} size="sm">
                                        <ArrowPathIcon className="mr-2 h-4 w-4" />
                                        {translate('tournament.button.generateSchedule')}
                                    </Button>
                                    <Button onClick={() => setIsJerseyDrawModalOpen(true)} disabled={!tournament || tournament.teams.length < 2} variant="secondary" size="sm">
                                        <TShirtIcon className="mr-2 h-4 w-4" />
                                        {translate('tournament.button.drawJerseys')}
                                    </Button>
                                </div>
                            )}
                            {schedule?.length > 0 ? (() => {
                                // Group by round so a league phase reads as rounds and
                                // knockout ties keep their own heading. The flat list
                                // buried the final among the group games.
                                const ordered = [...schedule].sort((a, b) => a.round - b.round);
                                const groups = new Map<number, TournamentMatch[]>();
                                ordered.forEach(m => {
                                    if (!groups.has(m.round)) groups.set(m.round, []);
                                    groups.get(m.round)!.push(m);
                                });
                                let runningIndex = 0;

                                return [...groups.entries()].map(([round, matches]) => (
                                    <div key={round}>
                                        <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-textSecondary">
                                            {matches[0].matchLabel || translate('schedule.round', { round })}
                                        </h3>
                                        <div className={`${panelClasses} divide-y divide-border !p-0`}>
                                            {matches.map(match => {
                                                runningIndex += 1;
                                                const isPlayed = match.status === 'finished'
                                                    && match.homeTeamScore !== null && match.awayTeamScore !== null;
                                                const homeWon = isPlayed && (match.homeTeamScore! > match.awayTeamScore!);
                                                const awayWon = isPlayed && (match.awayTeamScore! > match.homeTeamScore!);
                                                const isTbd = match.homeTeamId.startsWith('TBD-') || match.awayTeamId.startsWith('TBD-');

                                                return (
                                                    <div key={match.id} className="px-3 py-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] sm:px-4">
                                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-[11px] text-textSecondary">
                                                                    {match.matchLabel || translate('schedule.match', { matchNumber: runningIndex })}
                                                                </span>
                                                                {/* Fixtures carry no kickoff time yet, so say so
                                                                    rather than leave a silent gap. */}
                                                                <span className="text-[11px] text-textSecondary">
                                                                    {match.date
                                                                        ? new Date(match.date).toLocaleString(language, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                                        : translate('schedule.dateTBD')}
                                                                </span>
                                                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                                    isPlayed
                                                                        ? 'bg-success/15 text-success'
                                                                        : 'bg-black/5 text-textSecondary dark:bg-white/10'
                                                                }`}>
                                                                    {translate(isPlayed ? 'schedule.status.finished' : 'schedule.status.scheduled')}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {!isTbd && (
                                                                    <Button size="sm" variant="ghost" className="!p-1.5 h-7" onClick={() => setMatchForAnalysis(match)} title={translate('tournament.aiAnalysisTitle')}>
                                                                        <span className="bg-gradient-to-r from-fuchsia-500 to-orange-500 bg-clip-text text-xs font-bold text-transparent">
                                                                            AI
                                                                        </span>
                                                                    </Button>
                                                                )}
                                                                {canEdit && (
                                                                    <Button size="sm" variant="ghost" className="!p-1.5 h-7 w-7" onClick={() => handleOpenEditMatchModal(match)} title={translate('schedule.editMatchTitle')}>
                                                                        <PencilIcon className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* One row, three columns: the old layout gave each
                                                            match a tall card that fit barely one line of
                                                            content. */}
                                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                                                            <ScheduleTeam teamId={match.homeTeamId} teams={teams} align="end" isWinner={homeWon} dimmed={isPlayed && !homeWon && !awayWon ? false : isPlayed && !homeWon} />
                                                            {canEdit ? (
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => handleOpenGoalscorerModal(match, 'home')} title={translate('schedule.updateScoreTitle')}
                                                                        className="w-11 rounded-md border border-border bg-background py-1.5 text-lg font-bold text-textPrimary transition-colors hover:border-primary/50 hover:bg-black/5 dark:hover:bg-slate-700 sm:w-14">
                                                                        {match.homeTeamScore ?? '-'}
                                                                    </button>
                                                                    <span className="text-textSecondary">:</span>
                                                                    <button onClick={() => handleOpenGoalscorerModal(match, 'away')} title={translate('schedule.updateScoreTitle')}
                                                                        className="w-11 rounded-md border border-border bg-background py-1.5 text-lg font-bold text-textPrimary transition-colors hover:border-primary/50 hover:bg-black/5 dark:hover:bg-slate-700 sm:w-14">
                                                                        {match.awayTeamScore ?? '-'}
                                                                    </button>
                                                                </div>
                                                            ) : isPlayed ? (
                                                                <span className="rounded-md bg-background px-3 py-1 font-mono text-xl font-bold text-textPrimary dark:bg-slate-800">
                                                                    {match.homeTeamScore} : {match.awayTeamScore}
                                                                </span>
                                                            ) : (
                                                                <span className="px-3 text-sm font-semibold text-textSecondary">vs</span>
                                                            )}
                                                            <ScheduleTeam teamId={match.awayTeamId} teams={teams} align="start" isWinner={awayWon} dimmed={isPlayed && !awayWon && !homeWon ? false : isPlayed && !awayWon} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })() : <div className={`${panelClasses} p-4`}><p className="text-textSecondary text-center py-4">{translate('schedule.noMatches')}</p></div>}
                        </section>
                    )}
                    {activeTab === 'teams' && (
                      <div className="space-y-4">
                        {/* Managing teams and rosters is season content, not season
                            lifecycle, so it stays here rather than moving to /admin. */}
                        {canEdit && (
                            <div className="flex flex-wrap justify-end gap-2">
                                {isEditingTeams ? (
                                    <>
                                        <Button onClick={handleSaveTeams} disabled={isSavingTeams} size="sm">
                                            {isSavingTeams ? <LoadingSpinner size="sm" /> : translate('teamList.saveButton')}
                                        </Button>
                                        <Button onClick={() => setIsEditingTeams(false)} disabled={isSavingTeams} variant="secondary" size="sm">
                                            {translate('common.button.cancel')}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button onClick={startEditingTeams} disabled={!tournament?.teams?.length} variant="outline" size="sm">
                                            <PencilIcon className="mr-2 h-4 w-4" />
                                            {translate('teamList.editButton')}
                                        </Button>
                                        <Button onClick={() => setIsManageModalOpen(true)} size="sm">
                                            <PencilAltIcon className="w-4 h-4 mr-2" />
                                            {translate('tournament.manageButton')}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                        {/* Four to a row: a season is usually three or four teams,
                            so they should all be comparable at a glance instead of
                            wrapping onto a second line. */}
                        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {teams?.map(team => (
                                <div key={team.id} className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-md">
                                    <div
                                        className="flex items-center justify-between gap-2 px-3 py-2"
                                        style={{ backgroundColor: team.color || '#64748b' }}
                                    >
                                        <h3 className="truncate font-bold text-white">{team.name}</h3>
                                        <div className="flex flex-shrink-0 items-center gap-1">
                                            <span className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[11px] text-white">
                                                {team.members?.length ?? 0}
                                            </span>
                                            <button
                                                onClick={() => setTeamForAnalysis(team)}
                                                title={translate('teamAnalysis.aiButton')}
                                                className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-bold text-transparent transition-colors hover:bg-white"
                                                style={{ backgroundImage: 'linear-gradient(90deg,#d946ef,#f97316)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}
                                            >
                                                AI
                                            </button>
                                        </div>
                                    </div>

                                    {isEditingTeams && canEdit ? (
                                        <div className="flex flex-grow flex-col">
                                            <ul className="flex-grow divide-y divide-border">
                                                {(teamDrafts[team.id] ?? []).map(playerId => {
                                                    const player = availablePlayersForTournament.find(p => p.id === playerId);
                                                    return (
                                                        <li key={playerId} className="flex items-center gap-2 px-3 py-1.5">
                                                            <span className="w-6 flex-shrink-0 text-center font-mono text-xs text-textSecondary">
                                                                {player?.jerseyNumber ?? '-'}
                                                            </span>
                                                            <span className="flex-1 truncate text-sm text-textPrimary">
                                                                {player?.name ?? translate('tournament.playerDeleted')}
                                                            </span>
                                                            <button
                                                                onClick={() => removeMember(team.id, playerId)}
                                                                aria-label={translate('teamList.removeMember')}
                                                                title={translate('teamList.removeMember')}
                                                                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-textSecondary transition-colors hover:bg-danger/10 hover:text-danger"
                                                            >
                                                                <XIcon className="h-4 w-4" />
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                                {(teamDrafts[team.id] ?? []).length === 0 && (
                                                    <li className="px-3 py-4 text-center text-xs italic text-textSecondary">
                                                        {translate('teamList.noMembers')}
                                                    </li>
                                                )}
                                            </ul>
                                            {/* Only players not already on a team are offered. */}
                                            <div className="border-t border-border p-2">
                                                <select
                                                    value=""
                                                    onChange={e => addMember(team.id, e.target.value)}
                                                    disabled={unassignedPlayers.length === 0}
                                                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-textPrimary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 dark:bg-slate-800"
                                                >
                                                    <option value="">
                                                        {unassignedPlayers.length === 0
                                                            ? translate('teamList.allAssigned')
                                                            : translate('teamList.addMember', { count: unassignedPlayers.length })}
                                                    </option>
                                                    {unassignedPlayers.map(p => (
                                                        <option key={p.id} value={p.id}>#{p.jerseyNumber} {p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                    <ul className="flex-grow divide-y divide-border">
                                        {team.members?.map(memberRef => {
                                            const player = availablePlayersForTournament.find(p => p.id === memberRef.playerId);
                                            return (
                                                <li key={memberRef.playerId}>
                                                    {player ? (
                                                        <button
                                                            onClick={() => handleOpenPlayerDetailModal(player)}
                                                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5"
                                                        >
                                                            <span className="w-6 flex-shrink-0 text-center font-mono text-xs text-textSecondary">
                                                                {player.jerseyNumber}
                                                            </span>
                                                            <span className="truncate text-sm font-medium text-textPrimary">{player.name}</span>
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-3 py-1.5">
                                                            <UserCircleIcon className="h-4 w-4 flex-shrink-0 text-textSecondary/50" />
                                                            <span className="truncate text-xs italic text-textSecondary">
                                                                {translate('tournament.playerDeleted')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                        {(!team.members || team.members.length === 0) && (
                                            <li className="px-3 py-6 text-center text-xs italic text-textSecondary">
                                                {translate('teamList.noMembers')}
                                            </li>
                                        )}
                                    </ul>
                                    )}
                                </div>
                            ))}
                        </section>
                      </div>
                    )}
                    {activeTab === 'topScorers' && (
                        <section><div className={panelClasses}><TopScorersList scorers={topScorers} teams={teams} /></div></section>
                    )}
                </div>
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
                `}</style>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">

            {renderContent()}

            {isManageModalOpen && canEdit && tournament && (
                <ManageTournamentModal 
                    isOpen={isManageModalOpen} 
                    onClose={() => setIsManageModalOpen(false)} 
                    tournament={tournament}
                    allPlayers={allPlayers}
                    availablePlayersForLookup={availablePlayersForTournament}
                />
            )}
            {isGeneratorModalOpen && tournament && (
                <TournamentScheduleGeneratorModal isOpen={isGeneratorModalOpen} onClose={() => setIsGeneratorModalOpen(false)} teams={tournament.teams} onSave={handleSaveGeneratedSchedule} />
            )}
            {isJerseyDrawModalOpen && tournament && (
                <TournamentJerseyDrawModal isOpen={isJerseyDrawModalOpen} onClose={() => setIsJerseyDrawModalOpen(false)} teams={tournament.teams} onSave={handleSaveJerseys} />
            )}
            {isGoalscorerModalOpen && editingMatchInfo && tournament && canEdit && (
                <GoalscorerModal isOpen={isGoalscorerModalOpen} onClose={() => setIsGoalscorerModalOpen(false)} match={editingMatchInfo.match} teamType={editingMatchInfo.teamType} allTeams={tournament.teams} allPlayers={availablePlayersForTournament} onSave={handleSaveGoals} />
            )}
            {isPlayerDetailModalOpen && (
                <PlayerDetailModal 
                    isOpen={isPlayerDetailModalOpen}
                    onClose={() => setIsPlayerDetailModalOpen(false)}
                    player={selectedPlayerForDetail}
                />
            )}
            {isEditMatchModalOpen && matchToEdit && tournament && canEdit && (
                 <EditMatchModal isOpen={isEditMatchModalOpen} onClose={() => setIsEditMatchModalOpen(false)} match={matchToEdit} teams={tournament.teams} onSave={handleSaveEditedMatch} />
            )}
            {matchForAnalysis && tournament && (
                <TournamentMatchAnalysisModal
                    isOpen={!!matchForAnalysis}
                    onClose={() => setMatchForAnalysis(null)}
                    match={matchForAnalysis}
                    teams={tournament.teams}
                    allPlayersForLookup={availablePlayersForTournament}
                />
            )}
            {teamForAnalysis && (
                <TeamAnalysisModal
                    isOpen={!!teamForAnalysis}
                    onClose={() => setTeamForAnalysis(null)}
                    team={teamForAnalysis}
                    allPlayersForLookup={availablePlayersForTournament}
                />
            )}
        </div>
    );
};
