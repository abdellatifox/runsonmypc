/**
 * Single source of truth for the site's identity.
 *
 * Page titles, schema, the footer, feeds, API user agents and the build
 * scripts all read from here. Never type the domain or brand anywhere else,
 * so that changing either stays a one-line edit.
 */
export const SITE_DOMAIN = 'runsonmypc.com';
export const SITE_URL = `https://${SITE_DOMAIN}`;

/** Brand, one word — used in titles, schema and the footer. */
export const SITE_NAME = 'RunsOnMyPC';
/** Brand, spaced — used in running prose. */
export const SITE_NAME_SPACED = 'Runs On My PC';

/** The logo renders the first segment in bold. */
export const SITE_NAME_PARTS = { bold: 'RunsOn', rest: 'MyPC' } as const;

export const CONTACT_EMAIL = `hello@${SITE_DOMAIN}`;

/** Identifies our fetchers to Steam, SteamSpy and SteamGridDB. */
export const USER_AGENT = `${SITE_NAME}/1.0 (+${SITE_URL})`;

/** Absolute URL for a site-relative path, for canonicals and schema. */
export const absUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Origin that serves game art, with no trailing slash.
 *
 * Empty means "this origin" — the files ship as Pages static assets, which is
 * the default and needs no extra DNS. Set it to an R2 bucket's custom domain
 * (e.g. https://cdn.runsonmypc.com, once it exists and has an edge Cache Rule)
 * to serve the same /art/<slug>-<width>.<ext> paths from R2 instead. Flip it
 * back to '' at any time to fall back to Pages.
 */
export const ART_BASE = '';
