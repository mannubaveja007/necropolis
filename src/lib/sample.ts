/**
 * The sample package.json the landing page loads with "Load sample".
 * Chosen to cover every tombstone outcome: a deprecated husk (request),
 * a dead heavyweight (node-sass), a long-resting curio (left-pad),
 * a restless incumbent (moment, express) and a living one (react).
 */
export const SAMPLE_PACKAGE_JSON = `{
  "name": "hollow-cathedral",
  "version": "0.0.1",
  "private": true,
  "dependencies": {
    "request": "^2.88.2",
    "moment": "^2.30.1",
    "node-sass": "^9.0.0",
    "left-pad": "^1.3.0",
    "express": "^4.19.2",
    "react": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
`;

export const MAX_PACKAGES = 40;
