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
    onSubmit: (name: string) => Promise<void>;
}

export const CreateEditTournamentModal: React.FC<CreateEditTournamentModalProps> = ({ isOpen, onClose, mode, initialName = '', onSubmit }) => {
    const { translate } = useLanguage();
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(mode === 'edit' ? initialName : '');
            setIsLoading(false);
        }
    }, [isOpen, mode, initialName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsLoading(true);
        await onSubmit(name.trim());
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
                <div className="flex justify-end space-x-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        {translate('common.button.cancel')}
                    </Button>
                    <Button type="submit" disabled={isLoading || !name.trim()}>
                        {isLoading ? <LoadingSpinner size="sm" /> : <Icon className="w-5 h-5 mr-2" />}
                        {buttonText}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};