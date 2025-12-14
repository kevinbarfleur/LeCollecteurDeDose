/**
 * Test Runner for automated testing of Vaal Orb outcomes and API synchronization
 * Can be executed from browser console
 * 
 * Usage:
 *   const runner = useTestRunner()
 *   await runner.runScenario('foil-transformation')
 *   await runner.runAllScenarios()
 */

import { ref, computed } from 'vue'
import type { Card } from '~/types/card'
import type { VaalOutcome } from '~/types/vaalOutcome'

export interface TestScenario {
  name: string
  description: string
  setup?: () => Promise<void> | void
  execute: () => Promise<void>
  assertions: Array<{
    name: string
    check: () => boolean | Promise<boolean>
    expected?: string
  }>
  cleanup?: () => Promise<void> | void
}

export interface TestResult {
  scenario: string
  passed: boolean
  duration: number
  errors: string[]
  assertions: Array<{
    name: string
    passed: boolean
    error?: string
  }>
}

export function useTestRunner() {
  const isRunning = ref(false)
  const currentScenario = ref<string | null>(null)
  const results = ref<TestResult[]>([])

  /**
   * Wait for animations to complete
   */
  const waitForAnimations = async (duration: number = 2000) => {
    await new Promise(resolve => setTimeout(resolve, duration))
  }

  /**
   * Wait for sync to complete
   */
  const waitForSync = async (maxWait: number = 20000) => {
    const startTime = Date.now()
    
    // Check sync queue status
    const checkSyncQueue = () => {
      if (typeof window !== 'undefined') {
        const queueStatus = (window as any).__syncQueueStatus
        if (queueStatus) {
          return !queueStatus.isProcessing && queueStatus.size === 0
        }
      }
      return false
    }
    
    // Check if collection is being reloaded
    const checkReloading = () => {
      if (typeof window !== 'undefined') {
        return (window as any).__isReloadingCollection === true
      }
      return false
    }
    
    // Wait for sync queue to be empty (check every 500ms)
    let queueEmpty = false
    while (Date.now() - startTime < maxWait) {
      if (checkSyncQueue()) {
        queueEmpty = true
        break
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    if (!queueEmpty) {
    }
    
    // Wait for collection reload to complete
    // The onSuccess callback in handleSyncRequired waits 2s then reloads
    let reloadComplete = false
    const reloadStartTime = Date.now()
    while (Date.now() - reloadStartTime < maxWait) {
      if (!checkReloading()) {
        reloadComplete = true
        break
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    if (!reloadComplete) {
    }
    
    // Additional wait to ensure everything is settled
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /**
   * Get current collection state (for assertions)
   */
  const getCollectionState = (): {
    cards: Card[]
    vaalOrbs: number
    cardCounts: Map<number, { normal: number; foil: number }>
  } => {
    // This will need to be injected from the component
    // For now, return a placeholder
    return {
      cards: [],
      vaalOrbs: 0,
      cardCounts: new Map(),
    }
  }

  /**
   * Run a single test scenario
   */
  const runScenario = async (scenario: TestScenario): Promise<TestResult> => {
    const startTime = Date.now()
    const result: TestResult = {
      scenario: scenario.name,
      passed: false,
      duration: 0,
      errors: [],
      assertions: [],
    }

    currentScenario.value = scenario.name
    try {
      // Setup
      if (scenario.setup) {
        await scenario.setup()
      }

      // Execute
      await scenario.execute()

      // Wait for animations
      await waitForAnimations()
      
      // Wait for sync to complete (longer wait for API sync + reload)
      await waitForSync(15000) // 15 seconds max wait
      
      // Additional wait for collection reload after sync
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Run assertions
      for (const assertion of scenario.assertions) {
        try {
          const passed = await assertion.check()
          result.assertions.push({
            name: assertion.name,
            passed,
            error: passed ? undefined : `Expected: ${assertion.expected || 'true'}`,
          })
          
          if (passed) {
          } else {
          }
        } catch (error: any) {
          result.assertions.push({
            name: assertion.name,
            passed: false,
            error: error.message,
          })
        }
      }

      // Check if all assertions passed
      result.passed = result.assertions.every(a => a.passed)

      // Cleanup
      if (scenario.cleanup) {
        await scenario.cleanup()
      }

      result.duration = Date.now() - startTime
    } catch (error: any) {
      result.errors.push(error.message)
      result.duration = Date.now() - startTime
    } finally {
      currentScenario.value = null
    }

    return result
  }

  /**
   * Run all scenarios
   */
  const runAllScenarios = async (scenarios: TestScenario[]): Promise<TestResult[]> => {
    if (isRunning.value) {
      return results.value
    }

    isRunning.value = true
    results.value = []
    for (const scenario of scenarios) {
      const result = await runScenario(scenario)
      results.value.push(result)
      
      // Small delay between scenarios
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    isRunning.value = false

    // Print summary
    const passed = results.value.filter(r => r.passed).length
    const failed = results.value.filter(r => !r.passed).length
    const totalDuration = results.value.reduce((sum, r) => sum + r.duration, 0)
    return results.value
  }

  /**
   * Generate a test report
   */
  const generateReport = (): string => {
    const passed = results.value.filter(r => r.passed).length
    const failed = results.value.filter(r => !r.passed).length
    
    let report = `\n=== TEST REPORT ===\n\n`
    report += `Total: ${results.value.length} | Passed: ${passed} | Failed: ${failed}\n\n`
    
    for (const result of results.value) {
      report += `${result.passed ? '✅' : '❌'} ${result.scenario} (${result.duration}ms)\n`
      
      if (!result.passed) {
        const failedAssertions = result.assertions.filter(a => !a.passed)
        for (const assertion of failedAssertions) {
          report += `   ❌ ${assertion.name}: ${assertion.error || 'Failed'}\n`
        }
      }
    }
    
    return report
  }

  return {
    isRunning: computed(() => isRunning.value),
    currentScenario: computed(() => currentScenario.value),
    results: computed(() => results.value),
    runScenario,
    runAllScenarios,
    generateReport,
    waitForAnimations,
    waitForSync,
  }
}

