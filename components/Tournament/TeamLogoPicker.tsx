import React, { useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../contexts/AppContext';
import { TEAM_LOGO_CHOICES, getTeamLogo } from '../../constants';
import { fileToTeamLogo, isUploadedLogo, TeamLogoError, LogoErrorCode } from '../../utils/teamLogo';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { PlusIcon } from '../icons';

const ERROR_KEY: Record<LogoErrorCode, string> = {
    notImage: 'teamLogo.error.notImage',
    sourceTooBig: 'teamLogo.error.sourceTooBig',
    decodeFailed: 'teamLogo.error.decodeFailed',
    tooBig: 'teamLogo.error.tooBig',
};

interface TeamLogoPickerProps {
    /** Used for the automatic match, and as the alt text. */
    teamName: string;
    value?: string | null;
    onChange: (logoUrl: string | null) => void;
}

/**
 * Choose a crest for a team: one of the shipped ones, or an image from the
 * admin's machine. Leaving it unset is a real choice - a team whose name we
 * ship art for still gets that art automatically.
 */
export const TeamLogoPicker: React.FC<TeamLogoPickerProps> = ({ teamName, value, onChange }) => {
    const { translate } = useLanguage();
    const { addToast } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isReading, setIsReading] = useState(false);

    const uploaded = isUploadedLogo(value);
    const autoLogo = getTeamLogo(teamName);

    const handleFile = async (file?: File | null) => {
        if (!file) return;
        setIsReading(true);
        try {
            onChange(await fileToTeamLogo(file));
        } catch (error) {
            const code = error instanceof TeamLogoError ? error.code : 'decodeFailed';
            addToast(ERROR_KEY[code], 'error');
        } finally {
            setIsReading(false);
            // Let the same file be picked again after a failure.
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const tileBase = 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border bg-surface p-0.5 transition-all dark:bg-slate-700';

    return (
        <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-textSecondary">{translate('manageTournament.team.logo')}</span>

            {TEAM_LOGO_CHOICES.map(choice => {
                const isPicked = value === choice.src;
                return (
                    <button
                        key={choice.id}
                        type="button"
                        title={choice.id}
                        onClick={() => onChange(isPicked ? null : choice.src)}
                        className={`${tileBase} ${isPicked ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/50'}`}
                    >
                        <img src={choice.src} alt={choice.id} className="max-h-full max-w-full object-contain" />
                    </button>
                );
            })}

            {/* The uploaded crest gets its own tile so it is picked, not hidden
                behind the presets. */}
            {uploaded && (
                <span className={`${tileBase} border-primary ring-2 ring-primary/40`} title={translate('manageTournament.team.logoUploaded')}>
                    <img src={value!} alt={teamName} className="max-h-full max-w-full object-contain" />
                </span>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0])}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReading}
                title={translate('manageTournament.team.logoUpload')}
                className={`${tileBase} border-dashed border-border text-textSecondary hover:border-primary hover:text-primary disabled:opacity-50`}
            >
                {isReading ? <LoadingSpinner size="sm" /> : <PlusIcon className="h-5 w-5" />}
            </button>

            {value ? (
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="text-xs font-medium text-textSecondary underline hover:text-danger"
                >
                    {translate('manageTournament.team.logoClear')}
                </button>
            ) : (
                <span className="text-xs italic text-textSecondary">
                    {translate(autoLogo ? 'manageTournament.team.logoAuto' : 'manageTournament.team.logoNone')}
                </span>
            )}
        </div>
    );
};
