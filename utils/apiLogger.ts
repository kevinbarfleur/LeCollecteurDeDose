/**
 * API Response Logger
 * 
 * Temporary utility to log API responses in a format suitable for Markdown documentation.
 * This will be removed once the API documentation is complete.
 */

/**
 * Log an API endpoint response in a formatted way for documentation
 */
export function logApiResponse(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  response: any,
  statusCode?: number
) {
  const fullEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api/${endpoint}`
  
  console.group(`📡 [API DOC] ${method} ${fullEndpoint}`)
  
  if (statusCode) {
    console.log(`Status: ${statusCode}`)
  }
  
  // Log response type and structure info
  if (Array.isArray(response)) {
    console.log(`Response Type: Array (${response.length} items)`)
    if (response.length > 0) {
      console.log('Sample item structure:')
      console.log(JSON.stringify(response[0], null, 2))
    }
  } else if (response && typeof response === 'object') {
    const keys = Object.keys(response)
    console.log(`Response Type: Object (${keys.length} keys)`)
    if (keys.length > 0 && keys.length <= 10) {
      console.log(`Keys: ${keys.join(', ')}`)
    } else if (keys.length > 10) {
      console.log(`Keys: ${keys.slice(0, 10).join(', ')}, ... (${keys.length} total)`)
    }
  }
  
  // Full response
  console.log('\n--- Full Response ---')
  console.log(JSON.stringify(response, null, 2))
  
  // Formatted for Markdown (ready to copy)
  console.log('\n--- Markdown Format (copy below) ---')
  console.log(`### ${method} ${fullEndpoint}`)
  if (statusCode) {
    console.log(`**Status:** ${statusCode}`)
  }
  console.log(`\`\`\`json`)
  console.log(JSON.stringify(response, null, 2))
  console.log(`\`\`\``)
  
  console.groupEnd()
}

/**
 * Log an API error in a formatted way
 */
export function logApiError(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  error: any
) {
  const fullEndpoint = endpoint.startsWith('/api/') ? endpoint : `/api/${endpoint}`
  
  console.group(`❌ [API DOC] ${method} ${fullEndpoint} - ERROR`)
  
  const status = error.status || error.statusCode || 'Unknown'
  const message = error.message || error.data?.message || 'Unknown error'
  
  console.error(`Status: ${status}`)
  console.error(`Message: ${message}`)
  
  if (error.data) {
    console.error('Error Data:', error.data)
  }
  
  // Markdown format
  console.log('\n--- Markdown Format (copy below) ---')
  console.log(`### ${method} ${fullEndpoint} - Error`)
  console.log(`**Status:** ${status}`)
  console.log(`**Message:** ${message}`)
  if (error.data) {
    console.log(`\`\`\`json`)
    console.log(JSON.stringify(error.data, null, 2))
    console.log(`\`\`\``)
  }
  
  console.groupEnd()
}

