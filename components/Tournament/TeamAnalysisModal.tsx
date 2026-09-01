import React, { useState, useEffect } from 'react';
import { TournamentTeam, TournamentPlayer, TeamAnalysis } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTeamAnalysisFromAI } from '../../services/aiAnalysisService';
import { Modal } from '../shared/Modal';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { StarIcon } from '../icons';

interface TeamAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TournamentTeam | null;
  allPlayersForLookup: TournamentPlayer[];
}

export const TeamAnalysisModal: React.FC<TeamAnalysisModalProps> = ({ isOpen, onClose, team, allPlayersForLookup }) => {
  const { translate } = useLanguage();
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && team) {
      const fetchAnalysis = async () => {
        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        try {
          const teamPlayers = allPlayersForLookup.filter((p) => team.members.some((m) => m.playerId === p.id));
          const result = await getTeamAnalysisFromAI(team, teamPlayers);
          setAnalysis(result);
        } catch (err) {
          setError((err as Error).message || translate('teamAnalysis.error'));
        } finally {
          setIsLoading(false);
        }
      };
      fetchAnalysis();
    }
  }, [isOpen, team, allPlayersForLookup, translate]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 min-h-[300px]">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground text-center">{translate('teamAnalysis.loading')}</p>
        </div>
      );
    }
    if (error) {
      return <p className="text-danger-text text-center py-12">{error}</p>;
    }
    if (!analysis) return null;

    const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
      <div>
        <h4 className="font-bold text-lg text-primary mb-2">{title}</h4>
        <div className="text-sm text-muted-foreground space-y-2">{children}</div>
      </div>
    );

    return (
      <div className="space-y-6">
        <Section title={translate('teamAnalysis.summary')}>
          <p className="italic">{analysis.summary}</p>
        </Section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Section title={translate('teamAnalysis.strengths')}>
            <ul className="list-disc list-inside space-y-1">
              {analysis.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Section>
          <Section title={translate('teamAnalysis.weaknesses')}>
            <ul className="list-disc list-inside space-y-1">
              {analysis.weaknesses.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Section>
        </div>
        <Section title={translate('teamAnalysis.keyPlayers')}>
          <div className="space-y-3">
            {analysis.keyPlayers.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <StarIcon className="w-5 h-5 text-vnext-amber mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs">{p.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section title={translate('teamAnalysis.tacticalStyle')}>
          <p>{analysis.tacticalStyle}</p>
        </Section>
        <Section title={translate('teamAnalysis.funnyPrediction')}>
          <p className="font-serif italic text-base">"{analysis.funnyPrediction}"</p>
        </Section>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={translate('teamAnalysis.title', { teamName: team?.name || '' })}
      size="xl"
    >
      <div className="p-1 min-h-[400px]">{renderContent()}</div>
    </Modal>
  );
};
