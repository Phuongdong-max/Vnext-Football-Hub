
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { onTournamentUpdate, updateTournament } from '../services/firebaseService';
import { Tournament, TeamStanding, TournamentMatch, TournamentTeam, UserRole, Goal } from '../types';
import { TOURNAMENT_DOC_ID } from '../constants';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Button } from '../components/shared/Button';
import { PencilAltIcon, TrophyIcon, UsersIcon, CalendarIcon, TableCellsIcon, UserCircleIcon, PlusCircleIcon, ArrowPathIcon, TShirtIcon, StarIcon } from '../components/icons';
import { ManageTournamentModal } from '../components/Tournament/ManageTournamentModal';
import { TournamentScheduleGeneratorModal } from '../components/Tournament/TournamentScheduleGeneratorModal';
import { TournamentJerseyDrawModal } from '../components/Tournament/TournamentJerseyDrawModal';
import { GoalscorerModal } from '../components/Tournament/GoalscorerModal';
import { TopScorersList } from '../components/Tournament/TopScorersList';

export const TournamentPage: React.FC = () => {
    const { translate, language } = useLanguage();
    const { currentUser, isFirebaseReady, addToast } = useAppContext();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
    const [isJerseyDrawModalOpen, setIsJerseyDrawModalOpen] = useState(false);

    // State for the new Goalscorer modal
    const [isGoalscorerModalOpen, setIsGoalscorerModalOpen] = useState(false);
    const [editingMatchInfo, setEditingMatchInfo] = useState<{ match: TournamentMatch; teamType: 'home' | 'away' } | null>(null);

    useEffect(() => {
        if (!isFirebaseReady) return;
        console.log("[TournamentPage] Subscribing to tournament updates...");
        const unsubscribe = onTournamentUpdate(TOURNAMENT_DOC_ID, (data) => {
            console.log("[TournamentPage] Received data from Firestore listener:", data);
            setTournament(data);
            setIsLoading(false);
        });
        return () => {
            console.log("[TournamentPage] Unsubscribing from tournament updates.");
            unsubscribe();
        };
    }, [isFirebaseReady]);
    
    const calculateStandings = (teams: TournamentTeam[], schedule: TournamentMatch[]): TeamStanding[] => {
        console.log("[TournamentPage] Starting standings calculation...");
        const standingsMap: { [teamId: string]: TeamStanding } = {};

        teams.forEach(team => {
            standingsMap[team.id] = {
                teamId: team.id,
                teamName: team.name,
                logoUrl: team.logoUrl ?? null,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0,
                points: 0,
            };
        });

        schedule.forEach(match => {
            const homeScore = match.homeTeamGoals?.length ?? match.homeTeamScore;
            const awayScore = match.awayTeamGoals?.length ?? match.awayTeamScore;

            if (match.status !== 'finished' || typeof homeScore !== 'number' || typeof awayScore !== 'number') {
                 console.log(`[TournamentPage] Skipping match ${match.id} from standings (not finished).`);
                return;
            }

            const home = standingsMap[match.homeTeamId];
            const away = standingsMap[match.awayTeamId];

            if (!home || !away) {
                console.warn(`[TournamentPage] Skipping match ${match.id}: could not find one or both teams in standings map.`);
                return;
            }

            home.played++;
            away.played++;
            home.goalsFor += homeScore;
            away.goalsFor += awayScore;
            home.goalsAgainst += awayScore;
            away.goalsAgainst += homeScore;
            
            if (homeScore > awayScore) {
                home.wins++;
                away.losses++;
                home.points += 3;
            } else if (homeScore < awayScore) {
                away.wins++;
                home.losses++;
                away.points += 3;
            } else {
                home.draws++;
                away.draws++;
                home.points += 1;
                away.points += 1;
            }
        });
        
        const standingsArray = Object.values(standingsMap).map(s => ({...s, goalDifference: s.goalsFor - s.goalsAgainst}));

        standingsArray.sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
            if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
            return a.teamName.localeCompare(b.teamName);
        });
        
        console.log("[TournamentPage] Standings calculation finished.", standingsArray);
        return standingsArray;
    };
    
    const topScorers = useMemo(() => {
        if (!tournament?.schedule || !tournament?.teams) return [];

        const scorerStats: Record<string, {
            name: string;
            goals: number;
            teamId: string;
            isGuest: boolean;
        }> = {};

        tournament.schedule.forEach(match => {
            const processGoals = (goals: Goal[] = [], teamId: string) => {
                goals.forEach(goal => {
                    const key = goal.scorerId ? goal.scorerId : `guest_${goal.scorerName}`;
                    if (!scorerStats[key]) {
                        scorerStats[key] = { name: goal.scorerName, goals: 0, teamId: teamId, isGuest: !goal.scorerId };
                    }
                    scorerStats[key].goals++;
                    scorerStats[key].teamId = teamId;
                });
            };

            processGoals(match.homeTeamGoals, match.homeTeamId);
            processGoals(match.awayTeamGoals, match.awayTeamId);
        });

        const topScorersList = Object.values(scorerStats).map(stats => ({
            ...stats,
            teamName: tournament.teams.find(t => t.id === stats.teamId)?.name || '?',
        }));

        topScorersList.sort((a, b) => {
            if (b.goals !== a.goals) {
                return b.goals - a.goals;
            }
            return a.name.localeCompare(b.name);
        });

        return topScorersList;
    }, [tournament]);

    const handleOpenGoalscorerModal = (match: TournamentMatch, teamType: 'home' | 'away') => {
        if (!currentUser) return;
        setEditingMatchInfo({ match, teamType });
        setIsGoalscorerModalOpen(true);
    };

    const handleSaveGoals = async (matchId: string, teamType: 'home' | 'away', goals: Goal[]) => {
        if (!currentUser || !tournament) return;
        setIsLoading(true);

        const newSchedule = tournament.schedule.map(match => {
            if (match.id === matchId) {
                const newScore = goals.length;
                const updatedMatch = { ...match };

                if (teamType === 'home') {
                    updatedMatch.homeTeamGoals = goals;
                    updatedMatch.homeTeamScore = newScore;
                } else {
                    updatedMatch.awayTeamGoals = goals;
                    updatedMatch.awayTeamScore = newScore;
                }
                
                const homeScore = updatedMatch.homeTeamScore;
                const awayScore = updatedMatch.awayTeamScore;
                updatedMatch.status = (homeScore !== null && awayScore !== null) ? 'finished' : 'scheduled';
                return updatedMatch;
            }
            return match;
        });

        const newStandings = calculateStandings(tournament.teams, newSchedule);
        
        try {
            await updateTournament(TOURNAMENT_DOC_ID, { schedule: newSchedule, standings: newStandings }, currentUser);
            addToast('tournament.success.updateMatch', 'success');
            setIsGoalscorerModalOpen(false);
            setEditingMatchInfo(null);
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
            await updateTournament(TOURNAMENT_DOC_ID, { schedule, standings: newStandings }, currentUser);
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
            await updateTournament(TOURNAMENT_DOC_ID, { teams: updatedTeams }, currentUser);
            addToast('manageTournament.saveSuccess', 'success');
            setIsJerseyDrawModalOpen(false);
        } catch(error) {
            addToast('manageTournament.saveError', 'error', { error: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };


    if (isLoading) {
        return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /><p className="ml-4">{translate('tournament.loading')}</p></div>;
    }
    
    const getTeamName = (teamId: string) => tournament?.teams.find(t => t.id === teamId)?.name || 'Unknown Team';

    const renderScheduleManagement = () => {
        if (!currentUser || !tournament) return null;

        return (
            <div className="p-4 bg-surface rounded-lg shadow-md border-t-4 border-primary">
                <h2 className="text-xl font-semibold mb-3">{translate('tournament.generateScheduleSectionTitle')}</h2>
                 <div className="flex flex-wrap gap-2">
                    <Button 
                      type="button" 
                      onClick={() => setIsGeneratorModalOpen(true)}
                      disabled={!tournament || tournament.teams.length < 2}
                    >
                        <ArrowPathIcon className="w-5 h-5 mr-2" />
                        {translate('tournament.button.generateSchedule')}
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => setIsJerseyDrawModalOpen(true)}
                      disabled={!tournament || tournament.teams.length < 2}
                      variant="secondary"
                    >
                        <TShirtIcon className="w-5 h-5 mr-2" />
                        {translate('tournament.button.drawJerseys')}
                    </Button>
                 </div>
                {(!tournament || tournament.teams.length < 2) && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">{translate('manageTournament.error.minTeamsForSchedule')}</p>
                )}
            </div>
        );
    };

    if (!tournament) {
        return (
            <div className="text-center py-10">
                <p className="text-textSecondary">{translate('tournament.noData')}</p>
                {currentUser && (
                     <Button onClick={() => setIsManageModalOpen(true)} className="mt-4">
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        {translate('tournament.createButton')}
                    </Button>
                )}
                {isManageModalOpen && currentUser && (
                    <ManageTournamentModal
                        isOpen={isManageModalOpen}
                        onClose={() => setIsManageModalOpen(false)}
                        tournament={tournament}
                    />
                )}
            </div>
        );
    }
    
    const { name, teams, schedule, standings, lastUpdated, updatedBy } = tournament;
    
    return (
        <div className="space-y-12">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-primary flex items-center">
                        <TrophyIcon className="w-8 h-8 sm:w-10 sm:h-10 mr-3" />
                        {name || translate('tournament.title')}
                    </h1>
                    {lastUpdated && updatedBy && (
                        <p className="text-xs text-textSecondary mt-1">
                            {translate('tournament.lastUpdated', {
                                name: updatedBy.name,
                                date: new Date(lastUpdated).toLocaleString(language)
                            })}
                        </p>
                    )}
                </div>
                {currentUser && (
                    <Button onClick={() => setIsManageModalOpen(true)}>
                        <PencilAltIcon className="w-5 h-5 mr-2" />
                        {translate('tournament.manageButton')}
                    </Button>
                )}
            </header>
            
            {renderScheduleManagement()}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Standings */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4 flex items-center"><TableCellsIcon className="w-6 h-6 mr-2 text-primary" />{translate('tournament.standings')}</h2>
                        <div className="bg-surface shadow-lg rounded-lg overflow-hidden">
                             {/* Desktop Table View */}
                            <div className="overflow-x-auto hidden md:block">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-primary uppercase tracking-wider">{translate('standingsTable.team')}</th>
                                            <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.played')}>{translate('standingsTable.played')}</th>
                                            <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.wins')}>{translate('standingsTable.wins')}</th>
                                            <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.draws')}>{translate('standingsTable.draws')}</th>
                                            <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.losses')}>{translate('standingsTable.losses')}</th>
                                            <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.gf')}>{translate('standingsTable.gf')}</th>
                                            <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.ga')}>{translate('standingsTable.ga')}</th>
                                            <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.gd')}>{translate('standingsTable.gd')}</th>
                                            <th className="px-2 py-3 text-center text-xs font-bold text-primary uppercase tracking-wider" title={translate('standingsTable.points')}>{translate('standingsTable.points')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-border">
                                        {standings?.map((s, index) => (
                                            <tr key={s.teamId} className="hover:bg-primary/5 transition-colors">
                                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap"><div className="flex items-center"><span className="w-6 text-center mr-2 font-semibold text-textSecondary">{index + 1}</span> {s.teamName}</div></td>
                                                <td className="px-2 py-4 text-center">{s.played}</td>
                                                <td className="px-2 py-4 text-center text-green-600">{s.wins}</td>
                                                <td className="px-2 py-4 text-center text-yellow-600">{s.draws}</td>
                                                <td className="px-2 py-4 text-center text-red-600">{s.losses}</td>
                                                <td className="px-2 py-4 text-center">{s.goalsFor}</td>
                                                <td className="px-2 py-4 text-center">{s.goalsAgainst}</td>
                                                <td className="px-2 py-4 text-center font-semibold">{s.goalDifference}</td>
                                                <td className="px-2 py-4 text-center font-bold text-primary">{s.points}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Card View */}
                            <div className="block md:hidden">
                                <ul className="divide-y divide-border">
                                    {standings?.map((s, index) => (
                                        <li key={s.teamId} className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <span className="w-8 font-bold text-lg text-textSecondary">{index + 1}</span>
                                                    <span className="font-semibold text-textPrimary">{s.teamName}</span>
                                                </div>
                                                <div className="font-bold text-lg text-primary">{s.points} {translate('standingsTable.points')}</div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                                                <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-md"><p className="font-semibold text-textPrimary">{s.played}</p><p className="text-textSecondary">{translate('standingsTable.played')}</p></div>
                                                <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-md"><p className="font-semibold text-textPrimary">{s.wins}</p><p className="text-textSecondary">{translate('standingsTable.wins')}</p></div>
                                                <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-md"><p className="font-semibold text-textPrimary">{s.draws}</p><p className="text-textSecondary">{translate('standingsTable.draws')}</p></div>
                                                <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-md"><p className="font-semibold text-textPrimary">{s.losses}</p><p className="text-textSecondary">{translate('standingsTable.losses')}</p></div>
                                                <div className="col-span-2 bg-gray-100 dark:bg-slate-700 p-2 rounded-md"><p className="font-semibold text-textPrimary">{s.goalsFor}-{s.goalsAgainst}</p><p className="text-textSecondary">GF-GA</p></div>
                                                <div className="col-span-2 bg-gray-100 dark:bg-slate-700 p-2 rounded-md"><p className="font-semibold text-textPrimary">{s.goalDifference}</p><p className="text-textSecondary">{translate('standingsTable.gd')}</p></div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>
                    
                    {/* Top Scorers */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4 flex items-center">
                            <StarIcon className="w-6 h-6 mr-2 text-primary" />
                            {translate('tournament.topScorers')}
                        </h2>
                        <TopScorersList scorers={topScorers} />
                    </section>

                     {/* Schedule */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4 flex items-center"><CalendarIcon className="w-6 h-6 mr-2 text-primary" />{translate('tournament.schedule')}</h2>
                        <div className="space-y-6">
                            {schedule?.length > 0 ? [...new Set(schedule.map(m => m.round))].sort((a,b) => a-b).map(roundNum => (
                                <div key={roundNum}>
                                    <h3 className="text-lg font-semibold text-textSecondary mb-2">{translate('schedule.round', { round: roundNum })}</h3>
                                    <div className="space-y-3">
                                        {schedule.filter(m => m.round === roundNum).map(match => (
                                            <div key={match.id} className="bg-surface shadow-md rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
                                                <div className="w-full md:w-2/5 text-center md:text-right font-semibold">{getTeamName(match.homeTeamId)}</div>
                                                
                                                <div className="flex flex-col items-center justify-center my-2 md:my-0">
                                                    {currentUser ? (
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => handleOpenGoalscorerModal(match, 'home')}
                                                                className="flex items-center justify-center w-24 text-lg font-bold text-center bg-background dark:bg-slate-700 border border-border rounded-lg p-2 cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors shadow-sm"
                                                                aria-label={`Update score for ${getTeamName(match.homeTeamId)}`}
                                                                title={translate('schedule.updateScoreTitle')}
                                                            >
                                                                <span>{match.homeTeamScore ?? '0'}</span>
                                                            </button>
                                                            <span className="font-bold text-lg">-</span>
                                                             <button
                                                                onClick={() => handleOpenGoalscorerModal(match, 'away')}
                                                                className="flex items-center justify-center w-24 text-lg font-bold text-center bg-background dark:bg-slate-700 border border-border rounded-lg p-2 cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors shadow-sm"
                                                                aria-label={`Update score for ${getTeamName(match.awayTeamId)}`}
                                                                title={translate('schedule.updateScoreTitle')}
                                                            >
                                                                <span>{match.awayTeamScore ?? '0'}</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xl font-bold px-2 py-1 bg-background rounded-md">
                                                            {match.status === 'finished' ? `${match.homeTeamScore ?? '-'} - ${match.awayTeamScore ?? '-'}` : 'vs'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="w-full md:w-2/5 text-center md:text-left font-semibold">{getTeamName(match.awayTeamId)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )) : <p className="text-textSecondary text-center py-4">{translate('schedule.noMatches')}</p>}
                        </div>
                    </section>
                </div>
                {/* Teams */}
                <aside className="lg:col-span-1 space-y-6">
                     <h2 className="text-2xl font-semibold flex items-center"><UsersIcon className="w-6 h-6 mr-2 text-primary" />{translate('tournament.teams')}</h2>
                     {teams?.map(team => (
                        <div key={team.id} className="bg-surface shadow-lg rounded-lg p-4">
                            <h3 className="font-bold text-lg text-primary mb-2">
                                {team.name}
                                {team.jersey && <span className="text-sm font-normal text-textSecondary ml-2">({team.jersey})</span>}
                            </h3>
                            <h4 className="font-semibold text-sm text-textSecondary mb-1">{translate('teamList.members')}</h4>
                            <ul className="space-y-1">
                                {team.members?.map(member => (
                                    <li key={member.id} className="flex items-center text-sm p-1 rounded hover:bg-primary/5">
                                        {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="w-6 h-6 rounded-full mr-2"/> : <UserCircleIcon className="w-6 h-6 text-gray-400 mr-2"/>}
                                        {member.name}
                                    </li>
                                ))}
                                {(!team.members || team.members.length === 0) && <p className="text-xs text-textSecondary italic">{translate('teamList.noMembers')}</p>}
                            </ul>
                        </div>
                     ))}
                </aside>
            </div>

            {isManageModalOpen && currentUser && (
                <ManageTournamentModal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    tournament={tournament}
                />
            )}
             {isGeneratorModalOpen && tournament && (
                <TournamentScheduleGeneratorModal
                    isOpen={isGeneratorModalOpen}
                    onClose={() => setIsGeneratorModalOpen(false)}
                    teams={tournament.teams}
                    onSave={handleSaveGeneratedSchedule}
                />
            )}
             {isJerseyDrawModalOpen && tournament && (
                <TournamentJerseyDrawModal
                    isOpen={isJerseyDrawModalOpen}
                    onClose={() => setIsJerseyDrawModalOpen(false)}
                    teams={tournament.teams}
                    onSave={handleSaveJerseys}
                />
            )}
             {isGoalscorerModalOpen && editingMatchInfo && tournament && (
                <GoalscorerModal
                    isOpen={isGoalscorerModalOpen}
                    onClose={() => setIsGoalscorerModalOpen(false)}
                    match={editingMatchInfo.match}
                    teamType={editingMatchInfo.teamType}
                    allTeams={tournament.teams}
                    onSave={handleSaveGoals}
                />
            )}
        </div>
    );
};
