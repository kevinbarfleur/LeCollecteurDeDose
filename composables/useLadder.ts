/**
 * Ladder Composable
 *
 * Fetches and manages ladder/leaderboard data from Supabase
 */

export interface LadderPlayer {
  userId: string
  twitchUsername: string
  displayName: string
  avatarUrl: string | null
  uniqueCards: number
  totalCards: number
  foilCount: number
  t0Count: number
  t1Count: number
  t2Count: number
  t3Count: number
  completionPercent: number
  rank: number
}

export interface LadderGlobalStats {
  totalPlayers: number
  totalCardsDistributed: number
  totalUniqueCards: number
}

export type SortColumn = 'rank' | 'completion' | 'uniqueCards' | 'totalCards' | 'foilCount' | 't0Count' | 't1Count' | 't2Count' | 't3Count'
export type SortDirection = 'asc' | 'desc'

export interface LadderFilters {
  search: string
  minCompletion: number | null
  hasFoils: boolean
  hasT0: boolean
}

export function useLadder() {
  const supabase = useSupabaseClient()

  const rawPlayers = ref<LadderPlayer[]>([])
  const globalStats = ref<LadderGlobalStats | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Sorting state
  const sortBy = ref<SortColumn>('completion')
  const sortDirection = ref<SortDirection>('desc')

  // Filter state
  const filters = ref<LadderFilters>({
    search: '',
    minCompletion: null,
    hasFoils: false,
    hasT0: false,
  })

  /**
   * Fetch ladder data from Supabase
   */
  async function fetchLadder() {
    isLoading.value = true
    error.value = null

    try {
      // Fetch player stats (cast to any to bypass strict RPC type checking)
      const { data: ladderData, error: ladderError } = await (supabase as any)
        .rpc('get_ladder_stats')

      if (ladderError) throw ladderError

      // Fetch global stats
      const { data: globalData, error: globalError } = await (supabase as any)
        .rpc('get_ladder_global_stats')

      if (globalError) throw globalError

      // Process global stats
      if (globalData && globalData.length > 0) {
        globalStats.value = {
          totalPlayers: Number(globalData[0].total_players),
          totalCardsDistributed: Number(globalData[0].total_cards_distributed),
          totalUniqueCards: Number(globalData[0].total_unique_cards),
        }
      }

      // Process player data
      if (ladderData) {
        const totalCards = globalStats.value?.totalUniqueCards || 1

        rawPlayers.value = (ladderData as any[]).map((row: any, index: number) => ({
          userId: row.user_id,
          twitchUsername: row.twitch_username || '',
          displayName: row.display_name || row.twitch_username || 'Unknown',
          avatarUrl: row.avatar_url,
          uniqueCards: Number(row.unique_cards) || 0,
          totalCards: Number(row.total_cards) || 0,
          foilCount: Number(row.foil_count) || 0,
          t0Count: Number(row.t0_count) || 0,
          t1Count: Number(row.t1_count) || 0,
          t2Count: Number(row.t2_count) || 0,
          t3Count: Number(row.t3_count) || 0,
          completionPercent: Math.round((Number(row.unique_cards) / totalCards) * 100),
          rank: index + 1,
        }))
      }
    } catch (e: any) {
      console.error('[useLadder] Error fetching ladder:', e)
      error.value = e.message || 'Failed to fetch ladder'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Sort players by column
   */
  function sortByColumn(column: SortColumn) {
    if (sortBy.value === column) {
      // Toggle direction
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = column
      // Default to desc for most columns, asc for rank
      sortDirection.value = column === 'rank' ? 'asc' : 'desc'
    }
  }

  /**
   * Set sort directly
   */
  function setSort(column: SortColumn, direction: SortDirection = 'desc') {
    sortBy.value = column
    sortDirection.value = direction
  }

  /**
   * Update filters
   */
  function setFilters(newFilters: Partial<LadderFilters>) {
    filters.value = { ...filters.value, ...newFilters }
  }

  /**
   * Reset all filters
   */
  function resetFilters() {
    filters.value = {
      search: '',
      minCompletion: null,
      hasFoils: false,
      hasT0: false,
    }
  }

  /**
   * Filtered players based on current filters
   */
  const filteredPlayers = computed(() => {
    let result = [...rawPlayers.value]

    // Search filter
    if (filters.value.search.trim()) {
      const searchLower = filters.value.search.toLowerCase().trim()
      result = result.filter(player =>
        player.displayName.toLowerCase().includes(searchLower) ||
        player.twitchUsername.toLowerCase().includes(searchLower)
      )
    }

    // Minimum completion filter
    if (filters.value.minCompletion !== null) {
      result = result.filter(player => player.completionPercent >= filters.value.minCompletion!)
    }

    // Has foils filter
    if (filters.value.hasFoils) {
      result = result.filter(player => player.foilCount > 0)
    }

    // Has T0 filter
    if (filters.value.hasT0) {
      result = result.filter(player => player.t0Count > 0)
    }

    return result
  })

  /**
   * Sorted players computed
   */
  const sortedPlayers = computed(() => {
    const sorted = [...filteredPlayers.value]

    sorted.sort((a, b) => {
      let aVal: number
      let bVal: number

      switch (sortBy.value) {
        case 'rank':
          aVal = a.rank
          bVal = b.rank
          break
        case 'completion':
          aVal = a.completionPercent
          bVal = b.completionPercent
          break
        case 'uniqueCards':
          aVal = a.uniqueCards
          bVal = b.uniqueCards
          break
        case 'totalCards':
          aVal = a.totalCards
          bVal = b.totalCards
          break
        case 'foilCount':
          aVal = a.foilCount
          bVal = b.foilCount
          break
        case 't0Count':
          aVal = a.t0Count
          bVal = b.t0Count
          break
        case 't1Count':
          aVal = a.t1Count
          bVal = b.t1Count
          break
        case 't2Count':
          aVal = a.t2Count
          bVal = b.t2Count
          break
        case 't3Count':
          aVal = a.t3Count
          bVal = b.t3Count
          break
        default:
          return 0
      }

      if (sortDirection.value === 'asc') {
        return aVal - bVal
      } else {
        return bVal - aVal
      }
    })

    // Recalculate ranks based on current sort/filter
    sorted.forEach((player, index) => {
      player.rank = index + 1
    })

    return sorted
  })

  /**
   * Check if any filter is active
   */
  const hasActiveFilters = computed(() => {
    return (
      filters.value.search.trim() !== '' ||
      filters.value.minCompletion !== null ||
      filters.value.hasFoils ||
      filters.value.hasT0
    )
  })

  /**
   * Count of active filters
   */
  const activeFilterCount = computed(() => {
    let count = 0
    if (filters.value.search.trim()) count++
    if (filters.value.minCompletion !== null) count++
    if (filters.value.hasFoils) count++
    if (filters.value.hasT0) count++
    return count
  })

  return {
    // State
    players: sortedPlayers,
    globalStats: readonly(globalStats),
    isLoading: readonly(isLoading),
    error: readonly(error),
    sortBy: readonly(sortBy),
    sortDirection: readonly(sortDirection),
    filters: readonly(filters),
    hasActiveFilters,
    activeFilterCount,

    // Actions
    fetchLadder,
    sortByColumn,
    setSort,
    setFilters,
    resetFilters,
  }
}
