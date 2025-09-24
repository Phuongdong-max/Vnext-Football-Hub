import React, { useState, useEffect } from 'react';
import { TournamentMatch, TournamentTeam, TournamentPlayer, TournamentMatchAnalysis } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTournamentMatchAnalysisFromAI } from '../../services/aiAnalysisService';
import { Modal } from '../shared/Modal';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { TrophyIcon, ShieldCheckIcon, UsersIcon } from '../icons';

interface TournamentMatchAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: TournamentMatch | null;
    teams: TournamentTeam[];
    allPlayersForLookup: TournamentPlayer[];
}

const ProbabilityBar: React.FC<{ home: number, away: number, draw: number }> = ({ home, away, draw }) => (
    <div className="w-full flex rounded-full h-3 bg-gray-200 dark:bg-slate-700 overflow-hidden">
        <div className="bg-blue-500 transition-all duration-500" style={{ width: `${home}%` }} title={`Home: ${home}%`}></div>
        <div className="bg-gray-400 dark:bg-slate-500 transition-all duration-500" style={{ width: `${draw}%` }} title={`Draw: ${draw}%`}></div>
        <div className="bg-red-500 transition-all duration-500" style={{ width: `${away}%` }} title={`Away: ${away}%`}></div>
    </div>
);


export const TournamentMatchAnalysisModal: React.FC<TournamentMatchAnalysisModalProps> = ({ isOpen, onClose, match, teams, allPlayersForLookup }) => {
    const { translate } = useLanguage();
    const [analysis, setAnalysis] = useState<TournamentMatchAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && match) {
            const fetchAnalysis = async () => {
                setIsLoading(true);
                setError(null);
                setAnalysis(null);
                try {
                    const homeTeam = teams.find(t => t.id === match.homeTeamId);
                    const awayTeam = teams.find(t => t.id === match.awayTeamId);
                    if (!homeTeam || !awayTeam) {
                        throw new Error("Team data is missing for analysis.");
                    }
                    const homePlayers = allPlayersForLookup.filter(p => homeTeam.members.some(m => m.playerId === p.id));
                    const awayPlayers = allPlayersForLookup.filter(p => awayTeam.members.some(m => m.playerId === p.id));
                    const result = await getTournamentMatchAnalysisFromAI(homeTeam, awayTeam, homePlayers, awayPlayers);
                    setAnalysis(result);
                } catch (err) {
                     let errorMessageKey = 'error.aiCannotGetMatchAnalysis';
                     if ((err as Error).message.includes("quota")) errorMessageKey = 'error.aiQuotaExceeded';
                    setError(translate(errorMessageKey, { errorMessage: (err as Error).message }));
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAnalysis();
        }
    }, [isOpen, match, teams, allPlayersForLookup, translate]);

    const homeTeam = teams.find(t => t.id === match?.homeTeamId);
    const awayTeam = teams.find(t => t.id === match?.awayTeamId);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-12 min-h-[400px]">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-textSecondary text-center">{translate('tournament.matchAnalysis.loading')}</p>
                </div>
            );
        }
        if (error) {
            return <p className="text-danger text-center py-12">{error}</p>;
        }
        if (!analysis || !homeTeam || !awayTeam) return null;

        const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
            <div className="p-4 bg-background dark:bg-slate-800/50 rounded-lg">
                <h4 className="font-bold text-lg text-primary mb-2">{title}</h4>
                <div className="text-sm text-textSecondary space-y-2">{children}</div>
            </div>
        );

        return (
            <div className="space-y-4">
                <div className="text-center p-4 bg-surface dark:bg-slate-700/50 rounded-lg">
                    <h3 className="text-xl font-bold text-textPrimary">{translate('tournament.matchAnalysis.prediction')}</h3>
                    <p className="text-3xl font-black text-primary my-2">{analysis.predictedScore}</p>
                    <p className="font-semibold text-textSecondary">{analysis.matchSummary}</p>
                </div>

                <Section title={translate('tournament.matchAnalysis.probabilities')}>
                    <ProbabilityBar home={analysis.winProbability.home} away={analysis.winProbability.away} draw={analysis.winProbability.draw} />
                    <div className="flex justify-between text-xs font-medium mt-1">
                        <span className="text-blue-500">{homeTeam.name}: {analysis.winProbability.home}%</span>
                        <span className="text-gray-500">{translate('matchResult.draw')}: {analysis.winProbability.draw}%</span>
                        <span className="text-red-500">{awayTeam.name}: {analysis.winProbability.away}%</span>
                    </div>
                </Section>
                
                <Section title={translate('tournament.matchAnalysis.keyMatchups')}>
                    <div className="space-y-3">
                        {analysis.keyMatchups.map((mu, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <UsersIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-textPrimary">{mu.player1} vs {mu.player2}</p>
                                    <p className="text-xs">{mu.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Section title={translate('tournament.matchAnalysis.teamAnalysis', { teamName: homeTeam.name })}>
                         <h5 className="font-semibold text-textPrimary">{translate('tournament.matchAnalysis.strengths')}</h5>
                         <ul className="list-disc list-inside text-xs">{analysis.homeTeamAnalysis.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul>
                         <h5 className="font-semibold text-textPrimary mt-2">{translate('tournament.matchAnalysis.weaknesses')}</h5>
                         <ul className="list-disc list-inside text-xs">{analysis.homeTeamAnalysis.weaknesses.map((w,i) => <li key={i}>{w}</li>)}</ul>
                         <h5 className="font-semibold text-textPrimary mt-2">{translate('tournament.matchAnalysis.tactics')}</h5>
                         <p className="text-xs">{analysis.homeTeamAnalysis.suggestedTactics}</p>
                     </Section>
                      <Section title={translate('tournament.matchAnalysis.teamAnalysis', { teamName: awayTeam.name })}>
                         <h5 className="font-semibold text-textPrimary">{translate('tournament.matchAnalysis.strengths')}</h5>
                         <ul className="list-disc list-inside text-xs">{analysis.awayTeamAnalysis.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul>
                         <h5 className="font-semibold text-textPrimary mt-2">{translate('tournament.matchAnalysis.weaknesses')}</h5>
                         <ul className="list-disc list-inside text-xs">{analysis.awayTeamAnalysis.weaknesses.map((w,i) => <li key={i}>{w}</li>)}</ul>
                         <h5 className="font-semibold text-textPrimary mt-2">{translate('tournament.matchAnalysis.tactics')}</h5>
                         <p className="text-xs">{analysis.awayTeamAnalysis.suggestedTactics}</p>
                     </Section>
                </div>
                
                 <Section title={translate('tournament.matchAnalysis.funnyCommentary')}>
                    <p className="font-serif italic text-base">"{analysis.funnyCommentary}"</p>
                </Section>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${translate('tournament.matchAnalysis.title')}: ${homeTeam?.name || '?'} vs ${awayTeam?.name || '?'}`}
            size="xl"
        >
            <div className="p-1 min-h-[400px]">
                {renderContent()}
            </div>
        </Modal>
    );
};
