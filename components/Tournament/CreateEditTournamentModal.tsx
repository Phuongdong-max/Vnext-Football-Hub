import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { PlusCircleIcon, PencilAltIcon } from '../icons';

interface CreateEditTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    initialName?: string;
    initialSeason?: number;
    initialStartDate?: Date | null;
    initialEndDate?: Date | null;
    onSubmit: (name: string, season: number, startDate: Date, endDate: Date | null) => Promise<void>;
}

// datetime-local speaks local wall-clock time; building the string by hand
// avoids the UTC shift that toISOString() introduces.
const toLocalInput = (d?: Date | null): string => {
    if (!d) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const CreateEditTournamentModal: React.FC<CreateEditTournamentModalProps> = ({ isOpen, onClose, mode, initialName = '', initialSeason, initialStartDate, initialEndDate, onSubmit }) => {
    const { translate } = useLanguage();
    const [name, setName] = useState('');
    const [season, setSeason] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(mode === 'edit' ? initialName : '');
            // A new season almost always means the current calendar year, so it
            // is prefilled rather than left blank.
            setSeason(String(mode === 'edit' ? (initialSeason ?? new Date().getFullYear()) : new Date().getFullYear()));
            setStartDate(toLocalInput(mode === 'edit' ? initialStartDate : null));
            setEndDate(toLocalInput(mode === 'edit' ? initialEndDate : null));
            setIsLoading(false);
        }
    }, [isOpen, mode, initialName, initialSeason, initialStartDate, initialEndDate]);

    const hasStart = startDate.trim() !== '';
    const areDatesValid = hasStart && (!endDate || new Date(endDate) > new Date(startDate));
    const seasonNumber = Number(season);
    const isSeasonValid = Number.isInteger(seasonNumber) && seasonNumber >= 1970 && seasonNumber <= 2200;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !isSeasonValid || !areDatesValid) return;
        setIsLoading(true);
        await onSubmit(
            name.trim(),
            seasonNumber,
            new Date(startDate),
            endDate ? new Date(endDate) : null,
        );
        setIsLoading(false);
    };

    const modalTitle = mode === 'create'
        ? translate('tournament.createModal.title')
        : translate('tournament.editModal.title');
        
    const buttonText = mode === 'create'
        ? translate('tournament.button.create')
        : translate('common.button.save');

    const Icon = mode === 'create' ? PlusCircleIcon : PencilAltIcon;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="tournament-name" className="block text-sm font-medium text-textPrimary mb-1">
                        {translate('tournament.nameLabel')}
                    </label>
                    <input
                        id="tournament-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400"
                        placeholder={translate('tournament.namePlaceholder')}
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <label htmlFor="tournament-season" className="block text-sm font-medium text-textPrimary mb-1">
                        {translate('tournament.seasonLabel')}
                    </label>
                    <input
                        id="tournament-season"
                        type="number"
                        min="1970"
                        max="2200"
                        value={season}
                        onChange={(e) => setSeason(e.target.value)}
                        className="w-32 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary placeholder-gray-400"
                        required
                    />
                    <p className="mt-1 text-xs text-textSecondary">{translate('tournament.seasonHelp')}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="tournament-start" className="block text-sm font-medium text-textPrimary mb-1">
                            {translate('tournament.startDateLabel')} <span className="text-danger">*</span>
                        </label>
                        <input
                            id="tournament-start"
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="tournament-end" className="block text-sm font-medium text-textPrimary mb-1">
                            {translate('tournament.endDateLabel')} <span className="text-textSecondary font-normal">({translate('common.optional')})</span>
                        </label>
                        <input
                            id="tournament-end"
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-surface dark:bg-slate-700 text-textPrimary"
                        />
                    </div>
                </div>
                <p className="text-xs text-textSecondary">{translate('tournament.datesHelp')}</p>
                {startDate && endDate && new Date(endDate) <= new Date(startDate) && (
                    <p className="text-sm text-danger">{translate('tournament.error.endBeforeStart')}</p>
                )}
                <div className="flex justify-end space-x-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        {translate('common.button.cancel')}
                    </Button>
                    <Button type="submit" disabled={isLoading || !name.trim() || !isSeasonValid || !areDatesValid}>
                        {isLoading ? <LoadingSpinner size="sm" /> : <Icon className="w-5 h-5 mr-2" />}
                        {buttonText}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};