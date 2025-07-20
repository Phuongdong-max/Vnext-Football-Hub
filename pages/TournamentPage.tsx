
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { onTournamentUpdate, updateTournament } from '../services/firebaseService';
import { Tournament, TeamStanding, TournamentMatch, TournamentTeam, UserRole } from '../types';
import { TOURNAMENT_DOC_ID } from '../constants';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { Button } from '../components/shared/Button';
import { PencilAltIcon, TrophyIcon, UsersIcon, CalendarIcon, TableCellsIcon, UserCircleIcon, PlusCircleIcon, ArrowPathIcon } from '../components/icons';
import { ManageTournamentModal } from '../components/Tournament/ManageTournamentModal';

export const TournamentPage: React.FC = () => {
    const { translate, language } = useLanguage();
    const { currentUser, isFirebaseReady, addToast } = useAppContext();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [newlyGeneratedSchedule, setNewlyGeneratedSchedule] = useState<TournamentMatch[] | null>(null);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    useEffect(() => {
        if (!isFirebaseReady) return;

        const unsubscribe = onTournamentUpdate(TOURNAMENT_DOC_ID, (data) => {
            setTournament(data);
            // Do not reset the preview here, only when it's saved successfully.
            // setNewlyGeneratedSchedule(null); 
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isFirebaseReady]);

    const handleUpdateScore = async (matchId: string, homeScoreStr: string, awayScoreStr: string) => {
        if (!tournament || !currentUser) return;
        
        const homeScore = homeScoreStr === '' ? undefined : parseInt(homeScoreStr, 10);
        const awayScore = awayScoreStr === '' ? undefined : parseInt(awayScoreStr, 10);

        const newSchedule = tournament.schedule.map(match => {
            if (match.id === matchId) {
                return {
                    ...match,
                    homeTeamScore: homeScore,
                    awayTeamScore: awayScore,
                    status: (homeScore !== undefined && awayScore !== undefined) ? 'finished' : 'scheduled'
                } as TournamentMatch;
            }
            return match;
        });

        const newStandings = calculateStandings(tournament.teams, newSchedule);
        
        try {
            await updateTournament(TOURNAMENT_DOC_ID, { schedule: newSchedule, standings: newStandings }, currentUser);
            addToast('Score updated successfully', 'success');
        } catch (error) {
            addToast(`Error updating score: ${(error as Error).message}`, 'error');
            console.error(error);
        }
    };
    
    const calculateStandings = (teams: TournamentTeam[], schedule: TournamentMatch[]): TeamStanding[] => {
        const standingsMap: { [teamId: string]: TeamStanding } = {};

        teams.forEach(team => {
            standingsMap[team.id] = {
                teamId: team.id,
                teamName: team.name,
                logoUrl: team.logoUrl,
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
            if (match.status !== 'finished' || typeof match.homeTeamScore !== 'number' || typeof match.awayTeamScore !== 'number') return;

            const home = standingsMap[match.homeTeamId];
            const away = standingsMap[match.awayTeamId];

            if (!home || !away) return;

            home.played++;
            away.played++;
            home.goalsFor += match.homeTeamScore;
            away.goalsFor += match.awayTeamScore;
            home.goalsAgainst += match.awayTeamScore;
            away.goalsAgainst += match.homeTeamScore;
            
            if (match.homeTeamScore > match.awayTeamScore) {
                home.wins++;
                away.losses++;
                home.points += 3;
            } else if (match.homeTeamScore < match.awayTeamScore) {
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

        return standingsArray;
    };
    
    const handleGenerateSchedule = () => {
        if (!tournament || !tournament.teams || tournament.teams.length < 2) {
            addToast(translate('manageTournament.error.minTeamsForSchedule'), 'error', true);
            return;
        }

        const teams = [...tournament.teams];
        if (teams.length % 2 !== 0) {
            teams.push({ id: 'bye', name: 'BYE', members: [] });
        }
        
        const numRounds = (teams.length - 1) * 2; // Double round-robin
        const matchesPerRound = teams.length / 2;
        const schedule: TournamentMatch[] = [];

        for (let round = 0; round < numRounds; round++) {
            for (let i = 0; i < matchesPerRound; i++) {
                const home = teams[i];
                const away = teams[teams.length - 1 - i];

                if (home.id === 'bye' || away.id === 'bye') continue;
                
                const isSecondHalf = round >= (numRounds / 2);
                const homeTeamId = (isSecondHalf) ? away.id : home.id;
                const awayTeamId = (isSecondHalf) ? home.id : away.id;

                schedule.push({
                    id: `match_${Date.now()}_${round}_${i}`,
                    round: round + 1,
                    homeTeamId,
                    awayTeamId,
                    status: 'scheduled',
                });
            }
            const lastTeam = teams.pop()!;
            teams.splice(1, 0, lastTeam);
        }
        setNewlyGeneratedSchedule(schedule);
        addToast('Schedule generated for preview!', 'success');
    };

    const handleSaveSchedule = async () => {
        if (!newlyGeneratedSchedule || !tournament || !currentUser) return;
        setIsSavingSchedule(true);
        try {
            const newStandings = calculateStandings(tournament.teams, newlyGeneratedSchedule);
            await updateTournament(TOURNAMENT_DOC_ID, { schedule: newlyGeneratedSchedule, standings: newStandings }, currentUser);
            addToast('New schedule saved successfully!', 'success');
            setNewlyGeneratedSchedule(null);
        } catch(error) {
            addToast(`Error saving schedule: ${(error as Error).message}`, 'error');
        } finally {
            setIsSavingSchedule(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /><p className="ml-4">{translate('tournament.loading')}</p></div>;
    }
    
    const getTeamName = (teamId: string) => tournament?.teams.find(t => t.id === teamId)?.name || 'Unknown Team';

    const renderAdminScheduleGenerator = () => {
        if (currentUser?.role !== UserRole.ADMIN || !tournament) return null;

        return (
            <section className="p-4 bg-surface rounded-lg shadow-md border-t-4 border-primary">
                <h2 className="text-xl font-semibold mb-3">{translate('tournament.generateScheduleSectionTitle')}</h2>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                     <Button type="button" onClick={handleGenerateSchedule} variant="secondary" disabled={isSavingSchedule}>
                        <ArrowPathIcon className="w-5 h-5 mr-2" />
                        {translate('tournament.button.generateSchedule')}
                    </Button>
                    {newlyGeneratedSchedule && (
                        <Button type="button" onClick={handleSaveSchedule} variant="primary" disabled={isSavingSchedule}>
                            {isSavingSchedule ? <LoadingSpinner size="sm" /> : translate('tournament.saveScheduleButton')}
                        </Button>
                    )}
                </div>
                {newlyGeneratedSchedule && (
                    <div className="mt-4">
                        <h3 className="font-semibold text-textPrimary">{translate('tournament.schedulePreviewTitle')}</h3>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">{translate('tournament.scheduleOverwriteWarning')}</p>
                        <div className="space-y-3 max-h-60 overflow-y-auto p-2 bg-background rounded-md">
                             {[...new Set(newlyGeneratedSchedule.map(m => m.round))].sort((a,b) => a-b).map(roundNum => (
                                <div key={`preview-${roundNum}`}>
                                    <h4 className="text-sm font-semibold text-textSecondary mb-1">{translate('schedule.round', { round: roundNum })}</h4>
                                    {newlyGeneratedSchedule.filter(m => m.round === roundNum).map(m => (
                                        <p key={m.id} className="text-xs text-textPrimary pl-2">{getTeamName(m.homeTeamId)} vs {getTeamName(m.awayTeamId)}</p>
                                    ))}
                                </div>
                             ))}
                        </div>
                    </div>
                )}
            </section>
        );
    };

    if (!tournament) {
        return (
            <div className="text-center py-10">
                <p className="text-textSecondary">{translate('tournament.noData')}</p>
                {currentUser?.role === UserRole.ADMIN && (
                     <Button onClick={() => setIsManageModalOpen(true)} className="mt-4">
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        {translate('tournament.createButton')}
                    </Button>
                )}
                {isManageModalOpen && currentUser?.role === UserRole.ADMIN && (
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
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold text-primary flex items-center">
                        <TrophyIcon className="w-10 h-10 mr-3" />
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
                {currentUser?.role === UserRole.ADMIN && (
                    <Button onClick={() => setIsManageModalOpen(true)}>
                        <PencilAltIcon className="w-5 h-5 mr-2" />
                        {translate('tournament.manageButton')}
                    </Button>
                )}
            </header>
            
            {renderAdminScheduleGenerator()}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Standings */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4 flex items-center"><TableCellsIcon className="w-6 h-6 mr-2 text-primary" />{translate('tournament.standings')}</h2>
                        <div className="bg-surface shadow-lg rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
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
                        </div>
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
                                            <div key={match.id} className="bg-surface shadow-md rounded-lg p-3 flex items-center justify-between">
                                                <div className="flex-1 text-right pr-4 font-semibold">{getTeamName(match.homeTeamId)}</div>
                                                <div className="flex items-center space-x-2">
                                                    {currentUser?.role === UserRole.ADMIN ? (
                                                        <>
                                                            <input type="number" min="0" defaultValue={match.homeTeamScore} onChange={(e) => handleUpdateScore(match.id, e.target.value, match.awayTeamScore?.toString() ?? '')} className="w-12 text-center bg-background border border-border rounded-md p-1" />
                                                            <span>-</span>
                                                            <input type="number" min="0" defaultValue={match.awayTeamScore} onChange={(e) => handleUpdateScore(match.id, match.homeTeamScore?.toString() ?? '', e.target.value)} className="w-12 text-center bg-background border border-border rounded-md p-1" />
                                                        </>
                                                    ) : (
                                                         <span className="text-xl font-bold px-2 py-1 bg-background rounded-md">
                                                            {match.status === 'finished' ? `${match.homeTeamScore} - ${match.awayTeamScore}` : '-'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left pl-4 font-semibold">{getTeamName(match.awayTeamId)}</div>
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
                            <h3 className="font-bold text-lg text-primary mb-2">{team.name}</h3>
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

            {isManageModalOpen && currentUser?.role === UserRole.ADMIN && (
                <ManageTournamentModal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    tournament={tournament}
                />
            )}
        </div>
    );
};
