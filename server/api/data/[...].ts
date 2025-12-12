/**
 * Proxy server route for Data API
 * 
 * Routes requests to the external bot API server
 * Handles CORS and API key authentication
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const externalApiUrl = config.public.dataApiUrl || 'http://localhost:3000'
  const apiKey = config.dataApiKey || ''
  
  // Get the path from the request (catch-all route parameter)
  const pathParam = getRouterParam(event, '_')
  // pathParam can be a string or array of segments
  const path = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam || '')
  const method = getMethod(event)
  
  // Clean the base URL to avoid double slashes
  const baseUrl = externalApiUrl.replace(/\/+$/, '') // Remove trailing slashes
  const cleanPath = path ? `/${path}` : ''
  
  // Build the external API URL
  const url = `${baseUrl}/api${cleanPath}`
  
  // Get query parameters
  const query = getQuery(event)
  const queryString = new URLSearchParams(query as Record<string, string>).toString()
  const fullUrl = queryString ? `${url}?${queryString}` : url
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  // Add API key for write operations (POST, PUT, DELETE)
  if (apiKey && ['POST', 'PUT', 'DELETE'].includes(method)) {
    headers['x-api-key'] = apiKey
  }
  
  // Get request body if present
  let body: any = undefined
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await readBody(event)
    } catch (e) {
      // No body or invalid body
    }
  }
  
  try {
    // Make the request to the external API
    const response = await $fetch(fullUrl, {
      method: method as any,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    
    return response
  } catch (error: any) {
    console.error(`[Data API Proxy] Error calling ${fullUrl}:`, error)
    
    // Return appropriate error response
    throw createError({
      statusCode: error.status || error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error',
      data: error.data || error,
    })
  }
})

