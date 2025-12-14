/**
 * Console API for running tests from browser console
 * 
 * Usage:
 *   // In browser console:
 *   window.runTests()           // Run all tests
 *   window.runTest('foil')      // Run specific test
 *   window.testReport()         // Show test report
 */

import { useTestRunner } from '~/composables/useTestRunner'
import { testScenarios, setupTestHelpers } from './index'
import { useDevTestMode } from '~/composables/useDevTestMode'

let testRunner: ReturnType<typeof useTestRunner> | null = null
let helpersInitialized = false

/**
 * Initialize test runner and helpers
 * This should be called from the component
 */
export function initTestRunner(helpers: {
  getCollectionState: () => {
    cards: any[]
    vaalOrbs: number
    cardCounts: Map<number, { normal: number; foil: number }>
  }
  simulateOutcome: (outcome: string) => Promise<void>
  getCardByUid: (uid: number) => any | null
  addVaalOrbs?: (amount: number) => void
}) {
  testRunner = useTestRunner()
  setupTestHelpers(helpers)
  helpersInitialized = true
  
  // Expose to window for console access
  if (typeof window !== 'undefined') {
    // Only expose test functions in development mode
    if (import.meta.dev) {
      ;(window as any).runTests = async () => {
        if (!testRunner) {
          console.error('[TestRunner] Test runner not initialized')
          return
        }
        return await testRunner.runAllScenarios(testScenarios)
      }
      
      ;(window as any).runTest = async (scenarioName: string) => {
        if (!testRunner) {
          console.error('[TestRunner] Test runner not initialized')
          return
        }
        const scenario = testScenarios.find(s => s.name === scenarioName)
        if (!scenario) {
          console.error(`[TestRunner] Scenario "${scenarioName}" not found`)
          console.log('[TestRunner] Available scenarios:', testScenarios.map(s => s.name))
          return
        }
        return await testRunner.runScenario(scenario)
      }
      
      ;(window as any).testReport = () => {
        if (!testRunner) {
          console.error('[TestRunner] Test runner not initialized')
          return
        }
        const report = testRunner.generateReport()
        console.log(report)
        return report
      }
      
      ;(window as any).testStatus = () => {
        if (!testRunner) {
          console.error('[TestRunner] Test runner not initialized')
          return
        }
        return {
          isRunning: testRunner.isRunning.value,
          currentScenario: testRunner.currentScenario.value,
          results: testRunner.results.value,
        }
      }
      
      // Expose sync queue status check
      ;(window as any).checkSyncQueue = () => {
        // Access sync queue status if available
        // This will be set by the sync queue composable
        const queueStatus = (window as any).__syncQueueStatus
        return queueStatus || { isProcessing: false, size: 0 }
      }
      
      // Expose addVaalOrbs if available
      if (helpers.addVaalOrbs) {
        ;(window as any).addVaalOrbs = (amount: number = 10) => {
          helpers.addVaalOrbs!(amount)
          console.log(`[TestRunner] Added ${amount} vaalOrbs`)
        }
      }
    }
    
    // Only log in development mode
    if (import.meta.dev) {
      console.log('[TestRunner] ✅ Test runner initialized')
      console.log('[TestRunner] Available commands:')
      console.log('  window.runTests()      - Run all test scenarios')
      console.log('  window.runTest(name)   - Run a specific scenario')
      console.log('  window.testReport()    - Show test report')
      console.log('  window.testStatus()    - Show test status')
      if (helpers.addVaalOrbs) {
        console.log('  window.addVaalOrbs(n)  - Add vaalOrbs for testing')
      }
    }
  }
}

/**
 * Check if test runner is initialized
 */
export function isTestRunnerInitialized(): boolean {
  return helpersInitialized && testRunner !== null
}

