/**
 * Example demonstrating direct usage of GitHub raw URLs
 * This can be used for testing or understanding how the data fetching works
 */

import { getDataFileUrl, METADATA_FILE_URL, GITHUB_CONFIG } from '../lib/constants'

// Example: Test fetching a specific file
export async function testDataFetch() {
  try {
    console.log('🔍 Testing GitHub data fetch...')
    console.log('📊 Repository:', `${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`)
    console.log('🌿 Branch:', GITHUB_CONFIG.branch)
    console.log('📁 Data path:', GITHUB_CONFIG.dataPath)
    
    // Test fetching metadata file
    console.log('📋 Fetching metadata...')
    const metadataResponse = await fetch(METADATA_FILE_URL)
    
    if (metadataResponse.ok) {
      const metadataText = await metadataResponse.text()
      const lines = metadataText.split('\n')
      console.log('✅ Metadata loaded:', `${lines.length} lines`)
      console.log('📄 First few lines:', lines.slice(0, 3))
    } else {
      console.error('❌ Failed to fetch metadata:', metadataResponse.statusText)
    }
    
    // Test fetching a specific data file (using the first file from your directory)
    const testFile = 'abw-agconfertzs.csv'
    const testUrl = getDataFileUrl(testFile)
    console.log('📈 Testing data file fetch:', testUrl)
    
    const dataResponse = await fetch(testUrl)
    if (dataResponse.ok) {
      const dataText = await dataResponse.text()
      const lines = dataText.split('\n')
      console.log('✅ Data file loaded:', `${lines.length} lines`)
      console.log('📊 Headers:', lines[0])
      console.log('📄 Sample data:', lines.slice(1, 3))
    } else {
      console.error('❌ Failed to fetch data file:', dataResponse.statusText)
    }
    
  } catch (error) {
    console.error('💥 Error during test:', error)
  }
}

// Example: Get all available files from metadata
export async function getAvailableFiles(): Promise<string[]> {
  try {
    const response = await fetch(METADATA_FILE_URL)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const csvText = await response.text()
    const lines = csvText.trim().split('\n')
    
    // Assuming first column contains filenames
    return lines.slice(1).map(line => {
      const values = line.split(',')
      return values[0].replace(/"/g, '')
    })
  } catch (error) {
    console.error('Failed to load available files:', error)
    return []
  }
}

// Uncomment to run the test (useful for debugging)
// testDataFetch()
