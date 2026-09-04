/**
 * Comparing player names typed by different people at different times.
 *
 * The same person is written "NGUYỄN PHI HÙNG" in one season and
 * "NGUYEN PHI HUNG" in another, and the team-draw list is retyped freehand on
 * the night. A plain string compare matches none of those to each other, so
 * every name comparison in the app goes through here: tone marks stripped, đ
 * folded to d, case flattened, runs of whitespace collapsed.
 */
export const normaliseName = (name: string): string =>
    String(name || '')
        .normalize('NFD')
        // Escaped rather than written literally: a range of bare combining
        // marks in source is invisible and easily mangled by tooling.
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
