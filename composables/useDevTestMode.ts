/**
 * Composable to manage dev/test mode
 * 
 * Now integrated with useDataSource - test mode means using Supabase test data
 * This allows testing without affecting production data, regardless of environment
 */

import { useDataSource } from './useDataSource'

export function useDevTestMode() {
  const { dataSource, isTestData, isApiData, setDataSource } = useDataSource()

  /**
   * Set the dev/test mode (now just sets data source)
   */
  const setDevTestMode = (mode: 'real' | 'test') => {
    // 'real' means API, 'test' means test data
    const newDataSource: 'api' | 'test' = mode === 'real' ? 'api' : 'test'
    setDataSource(newDataSource, undefined) // userId not needed for client-side change
  }

  /**
   * Get current dev/test mode from data source
   */
  const devTestMode = computed<'real' | 'test'>(() => {
    return dataSource.value === 'api' ? 'real' : 'test'
  })

  /**
   * Check if we're using test mode (Supabase test data)
   */
  const isTestMode = computed(() => {
    return isTestData.value
  })

  /**
   * Check if we're using real mode (production API)
   */
  const isRealMode = computed(() => {
    return isApiData.value
  })

  return {
    devTestMode,
    isTestMode,
    isRealMode,
    setDevTestMode,
  }
}

