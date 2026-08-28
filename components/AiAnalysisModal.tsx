


import React, { useState, useEffect } from 'react';
import { FootballMatch, MatchAnalysis } from '../types';
import { Modal } from './shared/Modal';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { getMatchAnalysisFromAI } from '../services/aiAnalysisService';
import { LightBulbIcon } from './icons'; 
import { useLanguage } from '../contexts/LanguageContext';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchDetails: FootballMatch;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({ isOpen, onClose, matchDetails }) => {
  const { translate } = useLanguage();
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && matchDetails) {
      const fetchAnalysis = async () => {
        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        try {
          const result = await getMatchAnalysisFromAI(matchDetails);
          setAnalysis(result);
        } catch (err: any) {
            let errorMessageKey = 'error.aiCannotGetAnalysis';
            if (err.message?.includes("AI Service is not available")) errorMessageKey = 'error.aiServiceUnavailable';
            else if (err.message?.includes("Match details are required")) errorMessageKey = 'error.aiMatchDetailsRequired';
            else if (err.message?.includes("Phản hồi phân tích AI thiếu")) errorMessageKey = 'error.aiResponseMissingFields';
            else if (err.message?.includes("AI trả về định dạng phân tích không hợp lệ")) errorMessageKey = 'error.aiInvalidFormat';
            else if (err.message?.includes("Khóa API của AI không hợp lệ")) errorMessageKey = 'error.aiInvalidApiKey';
          
            setError(translate(errorMessageKey, { errorMessage: err.message || translate('aiAnalysisModal.defaultError') }));
            setAnalysis(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAnalysis();
    } else if (!isOpen) {
        setAnalysis(null);
        setIsLoading(false);
        setError(null);
    }
  }, [isOpen, matchDetails, translate]);

  const renderConfidence = (confidence?: MatchAnalysis['confidence']) => {
    if (!confidence) return null;
    const { homeWinPercentage, awayWinPercentage, drawPercentage } = confidence;
    const hasData = homeWinPercentage !== undefined || awayWinPercentage !== undefined || drawPercentage !== undefined;
    if (!hasData) return null;

    return (
      <div>
        <strong>{translate('aiAnalysisModal.confidence.title')}:</strong>
        <ul className="list-disc list-inside ml-4 text-xs">
          {homeWinPercentage !== undefined && homeWinPercentage !== null && <li>{translate('aiAnalysisModal.confidence.homeWin', { teamName: matchDetails.homeTeam, percentage: homeWinPercentage })}</li>}
          {awayWinPercentage !== undefined && awayWinPercentage !== null && <li>{translate('aiAnalysisModal.confidence.awayWin', { teamName: matchDetails.awayTeam, percentage: awayWinPercentage })}</li>}
          {drawPercentage !== undefined && drawPercentage !== null && <li>{translate('aiAnalysisModal.confidence.draw', { percentage: drawPercentage })}</li>}
        </ul>
      </div>
    );
  };
  
  const renderKeyFactors = (keyFactors?: string[]) => {
    if (!keyFactors || keyFactors.length === 0) return null;
    return (
      <div>
        <strong>{translate('aiAnalysisModal.keyFactors.title')}:</strong>
        <ul className="list-disc list-inside ml-4 text-xs">
          {keyFactors.map((factor, index) => <li key={index}>{factor}</li>)}
        </ul>
      </div>
    );
  };

  const getPredictedWinnerText = () => {
    if (!analysis) return '';
    switch (analysis.predictedWinner) {
      case 'home':
        return translate('aiAnalysisModal.predictedWinner.home', { teamName: matchDetails.homeTeam });
      case 'away':
        return translate('aiAnalysisModal.predictedWinner.away', { teamName: matchDetails.awayTeam });
      case 'draw':
        return translate('aiAnalysisModal.predictedWinner.draw');
      default:
        return translate('aiAnalysisModal.predictedWinner.uncertain');
    }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={translate('aiAnalysisModal.title', { homeTeam: matchDetails.homeTeam, awayTeam: matchDetails.awayTeam })}
        size="lg"
    >
      <div className="p-1 bg-black/5 dark:bg-white/5 rounded-2xl space-y-2 text-sm min-h-[200px]">
        <h4 className="text-md font-semibold text-textPrimary flex items-center mb-3 p-2 border-b border-border">
            <LightBulbIcon className="w-6 h-6 mr-2 text-yellow-400" />
            {translate('aiAnalysisModal.subTitle')}
        </h4>
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner size="md" />
            <span className="ml-2 mt-3 text-textSecondary">{translate('aiAnalysisModal.loading')}</span>
          </div>
        )}
        {error && !isLoading && (
          <p className="text-danger text-center py-8 px-2">{error}</p>
        )}
        {analysis && !isLoading && (
          <div className="space-y-3 px-2 pb-2 text-textSecondary">
            <p>
              <strong>{translate('aiAnalysisModal.predictedWinner.label')}:</strong> 
              <span className={`ml-1 font-semibold ${
                analysis.predictedWinner === 'home' ? 'text-blue-500 dark:text-blue-400' : 
                analysis.predictedWinner === 'away' ? 'text-red-500 dark:text-red-400' : 
                analysis.predictedWinner === 'draw' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-textSecondary'
              }`}>
                {getPredictedWinnerText()}
              </span>
            </p>
            {analysis.predictionReasoning && <p><strong>{translate('aiAnalysisModal.predictionReasoning.label')}:</strong> {analysis.predictionReasoning}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              {analysis.homeTeamForm && <p><strong>{translate('aiAnalysisModal.teamForm.specificTeam', { teamName: matchDetails.homeTeam })}:</strong> {analysis.homeTeamForm}</p>}
              {analysis.awayTeamForm && <p><strong>{translate('aiAnalysisModal.teamForm.specificTeam', { teamName: matchDetails.awayTeam })}:</strong> {analysis.awayTeamForm}</p>}
            </div>

            {renderConfidence(analysis.confidence)}
            {renderKeyFactors(analysis.keyFactors)}
            
            {analysis.summary && <p className="italic mt-2"><strong>{translate('aiAnalysisModal.summary.label')}:</strong> {analysis.summary}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
};