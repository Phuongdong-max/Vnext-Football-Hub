
import React, { useState, useEffect } from 'react';
import { FootballMatch, MatchAnalysis } from '../types';
import { Modal } from './shared/Modal';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { getMatchAnalysisFromAI } from '../services/aiAnalysisService';
import { ChartBarIcon, LightBulbIcon } from './icons'; // Using LightBulb as main icon

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchDetails: FootballMatch;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({ isOpen, onClose, matchDetails }) => {
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
          setError(err.message || "Không thể tải phân tích trận đấu.");
          setAnalysis(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAnalysis();
    } else if (!isOpen) {
        // Reset state when modal is closed
        setAnalysis(null);
        setIsLoading(false);
        setError(null);
    }
  }, [isOpen, matchDetails]);

  const renderConfidence = (confidence?: MatchAnalysis['confidence']) => {
    if (!confidence) return null;
    const { homeWinPercentage, awayWinPercentage, drawPercentage } = confidence;
    const hasData = homeWinPercentage !== undefined || awayWinPercentage !== undefined || drawPercentage !== undefined;
    if (!hasData) return null;

    return (
      <div>
        <strong>Tỷ lệ dự đoán:</strong>
        <ul className="list-disc list-inside ml-4 text-xs">
          {homeWinPercentage !== undefined && homeWinPercentage !== null && <li>{matchDetails.homeTeam} thắng: {homeWinPercentage}%</li>}
          {awayWinPercentage !== undefined && awayWinPercentage !== null && <li>{matchDetails.awayTeam} thắng: {awayWinPercentage}%</li>}
          {drawPercentage !== undefined && drawPercentage !== null && <li>Hòa: {drawPercentage}%</li>}
        </ul>
      </div>
    );
  };
  
  const renderKeyFactors = (keyFactors?: string[]) => {
    if (!keyFactors || keyFactors.length === 0) return null;
    return (
      <div>
        <strong>Yếu tố chính:</strong>
        <ul className="list-disc list-inside ml-4 text-xs">
          {keyFactors.map((factor, index) => <li key={index}>{factor}</li>)}
        </ul>
      </div>
    );
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={`Phân tích AI: ${matchDetails.homeTeam} vs ${matchDetails.awayTeam}`}
        size="lg"
    >
      <div className="p-1 bg-slate-50 dark:bg-slate-800/70 rounded-md space-y-2 text-sm min-h-[200px]">
        <h4 className="text-md font-semibold text-textPrimary flex items-center mb-3 p-2 border-b border-border">
            <LightBulbIcon className="w-6 h-6 mr-2 text-yellow-400" />
            Thông tin từ chuyên gia AI Dơ mi nai
        </h4>
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner size="md" />s
            <span className="ml-2 mt-3 text-textSecondary">Đang tải phân tích AI...</span>
          </div>
        )}
        {error && !isLoading && (
          <p className="text-danger text-center py-8 px-2">{error}</p>
        )}
        {analysis && !isLoading && (
          <div className="space-y-3 px-2 pb-2 text-textSecondary">
            <p>
              <strong>Dự đoán kết quả:</strong> 
              <span className={`ml-1 font-semibold ${
                analysis.predictedWinner === 'home' ? 'text-blue-500 dark:text-blue-400' : 
                analysis.predictedWinner === 'away' ? 'text-red-500 dark:text-red-400' : 
                analysis.predictedWinner === 'draw' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-textSecondary'
              }`}>
                {analysis.predictedWinner === 'home' ? matchDetails.homeTeam + " thắng" : 
                 analysis.predictedWinner === 'away' ? matchDetails.awayTeam + " thắng" : 
                 analysis.predictedWinner === 'draw' ? "Hòa" :
                 "Không chắc chắn"}
              </span>
            </p>
            {analysis.predictionReasoning && <p><strong>Lý do dự đoán:</strong> {analysis.predictionReasoning}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              {analysis.homeTeamForm && <p><strong>Phong độ {matchDetails.homeTeam}:</strong> {analysis.homeTeamForm}</p>}
              {analysis.awayTeamForm && <p><strong>Phong độ {matchDetails.awayTeam}:</strong> {analysis.awayTeamForm}</p>}
            </div>

            {renderConfidence(analysis.confidence)}
            {renderKeyFactors(analysis.keyFactors)}
            
            {analysis.summary && <p className="italic mt-2"><strong>Tóm tắt:</strong> {analysis.summary}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
};
    