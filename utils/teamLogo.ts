/**
 * Turning a file the admin picked into a crest we can store.
 *
 * There is no Cloud Storage bucket on this project, so a crest is kept as a
 * data URI on the team itself. That is only safe because it is squeezed first:
 * the tournament document is capped at 1 MiB by Firestore and every visitor
 * downloads it on page load, so an untouched phone photo in there would be a
 * real cost to everyone.
 */

/** Longest side of a stored crest, in pixels. */
const LOGO_SIZE = 128;

/** A player photo is looked at, not glanced at, so it gets more pixels. */
export const AVATAR_SIZE = 256;

/** Ceiling for one stored crest. Four teams at the cap is still under 250 KB. */
export const MAX_LOGO_BYTES = 60 * 1024;

/**
 * Ceiling for one player photo. Players live in their own documents rather than
 * all inside the tournament doc, so this can be looser than a crest.
 */
export const MAX_AVATAR_BYTES = 120 * 1024;

/** Refused before decoding: a huge source would be decoded into memory first. */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export type LogoErrorCode = 'notImage' | 'sourceTooBig' | 'decodeFailed' | 'tooBig';

export class TeamLogoError extends Error {
    constructor(public code: LogoErrorCode) {
        super(code);
        this.name = 'TeamLogoError';
    }
}

/** Byte size of a data URI's payload, without materialising it. */
export const dataUriBytes = (uri: string): number => {
    const comma = uri.indexOf(',');
    if (comma < 0) return uri.length;
    const payload = uri.slice(comma + 1);
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    return Math.floor((payload.length * 3) / 4) - padding;
};

/** A crest the admin uploaded, as opposed to one of the shipped assets. */
export const isUploadedLogo = (url?: string | null): boolean => !!url?.startsWith('data:');

const loadImage = (file: File): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new TeamLogoError('decodeFailed')); };
        img.src = url;
    });

// Tried in order until one fits. Rejecting a photo outright would be unhelpful
// when dropping the quality a notch makes it fit comfortably.
const ENCODINGS: { type: string; quality?: number }[] = [
    { type: 'image/webp', quality: 0.85 },
    { type: 'image/webp', quality: 0.7 },
    { type: 'image/webp', quality: 0.5 },
    { type: 'image/png' },
];

/**
 * Reads an image file and returns a data URI small enough to store on a team.
 * Throws TeamLogoError, whose `code` the caller maps to a message.
 */
export const fileToTeamLogo = async (
    file: File,
    { size = LOGO_SIZE, maxBytes = MAX_LOGO_BYTES }: { size?: number; maxBytes?: number } = {},
): Promise<string> => {
    if (!file.type.startsWith('image/')) throw new TeamLogoError('notImage');
    if (file.size > MAX_SOURCE_BYTES) throw new TeamLogoError('sourceTooBig');

    const img = await loadImage(file);
    if (!img.width || !img.height) throw new TeamLogoError('decodeFailed');

    // Contain, never enlarge: a 40px logo should stay crisp at 40px rather than
    // be blown up to 128 and go soft.
    const scale = Math.min(size / img.width, size / img.height, 1);
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new TeamLogoError('decodeFailed');
    // Nothing is painted underneath, so a transparent PNG keeps its
    // transparency and the crest sits on the team's colour, not a white square.
    ctx.drawImage(img, 0, 0, width, height);

    for (const { type, quality } of ENCODINGS) {
        // toDataURL falls back to PNG when the type is unsupported, which is
        // fine here - it just means an early attempt costs the same as the last.
        const uri = canvas.toDataURL(type, quality);
        if (dataUriBytes(uri) <= maxBytes) return uri;
    }

    throw new TeamLogoError('tooBig');
};
