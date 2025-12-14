/**
 * Composable to manage dev/test mode
 * 
 * Now integrated with useDataSource - mock mode means using local mock data
 * This allows testing without affecting production data
 */

import { useDataSource } from './useDataSource'

export function useDevTestMode() {
  const { dataSource, isMockData, isSupabaseData, setDataSource } = useDataSource()

  /**
   * Set the dev/test mode (now just sets data source)
   */
  const setDevTestMode = async (mode: 'real' | 'test') => {
    // 'real' means Supabase, 'test' means mock data
    const newDataSource: 'supabase' | 'mock' = mode === 'real' ? 'supabase' : 'mock'
    await setDataSource(newDataSource)
  }

  /**
   * Get current dev/test mode from data source
   */
  const devTestMode = computed<'real' | 'test'>(() => {
    const source = (dataSource as any).value ?? dataSource
    return source === 'supabase' ? 'real' : 'test'
  })

  /**
   * Check if we're using test mode (mock data)
   */
  const isTestMode = computed(() => {
    return isMockData
  })

  /**
   * Check if we're using real mode (production Supabase)
   */
  const isRealMode = computed(() => {
    return isSupabaseData
  })

  return {
    devTestMode,
    isTestMode,
    isRealMode,
    setDevTestMode,
  }
}

