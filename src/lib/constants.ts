/**
 * GitHub repository configuration for fetching World Bank data
 * 
 * Uses GitHub's raw content URLs to access processed CSV files
 * without bundling them into the application, keeping the app size small.
 */
export const GITHUB_CONFIG = {
  owner: 'drikusroor',
  repo: 'ainab-indata',
  branch: 'main',
  dataPath: 'data/split',
} as const

/**
 * Base URL for fetching World Bank CSV files from GitHub
 */
export const GITHUB_RAW_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/refs/heads/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.dataPath}` as const

/**
 * Construct a GitHub raw content URL for a specific CSV file
 * 
 * @param filename - The CSV filename in the data/split directory
 * @returns Complete GitHub raw content URL
 */
export function getDataFileUrl(filename: string): string {
  return `${GITHUB_RAW_BASE_URL}/${filename}`
}

/**
 * URL for the metadata file that lists all available datasets
 */
export const METADATA_FILE_URL = getDataFileUrl('_metadata.csv')
