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
  const setDevTestMode = async (mode: 'real' | 'test') => {
    // 'real' means API, 'test' means test data
    const newDataSource: 'api' | 'test' = mode === 'real' ? 'api' : 'test'
    await setDataSource(newDataSource) // userId not needed for client-side change
  }

  /**
   * Get current dev/test mode from data source
   */
  const devTestMode = computed<'real' | 'test'>(() => {
    const source = (dataSource as any).value ?? dataSource
    return source === 'api' ? 'real' : 'test'
  })

  /**
   * Check if we're using test mode (Supabase test data)
   */
  const isTestMode = computed(() => {
    return isTestData
  })

  /**
   * Check if we're using real mode (production API)
   */
  const isRealMode = computed(() => {
    return isApiData
  })

  return {
    devTestMode,
    isTestMode,
    isRealMode,
    setDevTestMode,
  }
}

