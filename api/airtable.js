/**
 * Complete Airtable Serverless Function for Vercel
 * 
 * Fetches ALL records from an Airtable table using table ID.
 * - Filters out records where Status = 'Done'
 * - Sorts by Name field ascending
 * - Handles automatic pagination (50 records per page)
 * - Includes CORS headers for cross-origin requests
 * - Full error handling with debug logging
 * 
 * Environment Variables Required:
 * - AIRTABLE_API_KEY: Your Airtable Personal Access Token
 * - AIRTABLE_BASE_ID: Your Airtable Base ID
 * - AIRTABLE_TABLE_ID: Your Airtable Table ID (optional, can be hardcoded)
 * 
 * Fully deployable on Vercel - no changes needed!
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Get credentials from environment variables
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblDrUWfwkwMQM9yR'; // Fallback to your table ID

// Query configuration
const PAGE_SIZE = 50; // Records per page (Airtable max is 100, but 50 is safer)
const FILTER_FORMULA = "NOT({Status}='Done')"; // Filter out records with Status = 'Done'
const SORT_FIELD = 'Name'; // Field to sort by
const SORT_DIRECTION = 'asc'; // Sort direction: 'asc' or 'desc'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sets CORS headers to allow requests from any origin
 * @param {Object} res - Response object
 */
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Content-Type', 'application/json');
}

/**
 * Builds the Airtable API URL with query parameters
 * @param {string} offset - Optional pagination offset token
 * @returns {string} Complete Airtable API URL
 */
function buildAirtableURL(offset = null) {
  // Use table ID directly (not table name)
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
  
  // Build query parameters
  const params = new URLSearchParams();
  
  // Add filter formula
  params.append('filterByFormula', FILTER_FORMULA);
  
  // Add sort parameters
  params.append('sort[0][field]', SORT_FIELD);
  params.append('sort[0][direction]', SORT_DIRECTION);
  
  // Add page size
  params.append('pageSize', PAGE_SIZE.toString());
  
  // Add offset for pagination (if provided)
  if (offset) {
    params.append('offset', offset);
  }
  
  // Combine URL and parameters
  return `${url}?${params.toString()}`;
}

/**
 * Fetches a single page of records from Airtable
 * @param {string} offset - Optional pagination offset token
 * @returns {Promise<Object>} Response object with records and next offset
 */
async function fetchPage(offset = null) {
  const url = buildAirtableURL(offset);
  
  console.log(`[DEBUG] Fetching page from Airtable: ${url.replace(AIRTABLE_API_KEY || '', '[HIDDEN]')}`);
  
  // Make request to Airtable API
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  // Check if request was successful
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[ERROR] Airtable API error (${response.status}):`, errorText);
    
    // Try to parse error as JSON for better logging
    let errorDetails = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorDetails = JSON.stringify(errorJson, null, 2);
      console.error(`[ERROR] Parsed error details:`, errorDetails);
    } catch (e) {
      // Not JSON, use as-is
    }
    
    throw new Error(`Airtable API error (${response.status}): ${errorDetails}`);
  }
  
  // Parse JSON response
  const data = await response.json();
  
  console.log(`[DEBUG] Successfully fetched page: ${data.records?.length || 0} records, hasMore: ${!!data.offset}`);
  
  return {
    records: data.records || [],
    offset: data.offset || null, // Airtable provides offset if there are more pages
    hasMore: !!data.offset
  };
}

/**
 * Fetches ALL records from Airtable by automatically handling pagination
 * @returns {Promise<Array>} Array of all records
 */
async function fetchAllRecords() {
  const allRecords = [];
  let offset = null;
  let pageCount = 0;
  
  console.log(`[DEBUG] Starting to fetch all records with pagination...`);
  
  // Keep fetching pages until there are no more
  do {
    pageCount++;
    console.log(`[DEBUG] Fetching page ${pageCount}...`);
    
    try {
      // Fetch current page
      const pageData = await fetchPage(offset);
      
      // Add records from this page to our collection
      allRecords.push(...pageData.records);
      
      // Update offset for next page
      offset = pageData.offset;
      
      console.log(`[DEBUG] Page ${pageCount}: Retrieved ${pageData.records.length} records. Total so far: ${allRecords.length}`);
      
      // Continue if there are more pages
    } catch (error) {
      console.error(`[ERROR] Failed to fetch page ${pageCount}:`, error.message);
      throw error; // Re-throw to be handled by main handler
    }
  } while (offset);
  
  console.log(`[DEBUG] Finished fetching all records. Total: ${allRecords.length} records across ${pageCount} pages.`);
  
  return allRecords;
}

// ============================================================================
// MAIN SERVERLESS FUNCTION
// ============================================================================

/**
 * Main handler function for Vercel serverless deployment
 * This is the entry point that Vercel will call
 */
export default async function handler(req, res) {
  // ========================================================================
  // STEP 1: Set CORS headers (must be done first)
  // ========================================================================
  setCORSHeaders(res);
  
  // ========================================================================
  // STEP 2: Handle preflight OPTIONS request
  // ========================================================================
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Handling OPTIONS preflight request');
    return res.status(200).end();
  }
  
  // ========================================================================
  // STEP 3: Validate HTTP method
  // ========================================================================
  if (req.method !== 'GET') {
    console.warn(`[WARN] Invalid method: ${req.method}`);
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }
  
  // ========================================================================
  // STEP 4: Validate environment variables
  // ========================================================================
  if (!AIRTABLE_API_KEY) {
    console.error('[ERROR] Missing AIRTABLE_API_KEY environment variable');
    return res.status(500).json({ 
      success: false,
      error: 'Server configuration error',
      message: 'AIRTABLE_API_KEY environment variable is not set'
    });
  }
  
  if (!AIRTABLE_BASE_ID) {
    console.error('[ERROR] Missing AIRTABLE_BASE_ID environment variable');
    return res.status(500).json({ 
      success: false,
      error: 'Server configuration error',
      message: 'AIRTABLE_BASE_ID environment variable is not set'
    });
  }
  
  if (!AIRTABLE_TABLE_ID) {
    console.error('[ERROR] Missing AIRTABLE_TABLE_ID environment variable or fallback');
    return res.status(500).json({ 
      success: false,
      error: 'Server configuration error',
      message: 'AIRTABLE_TABLE_ID environment variable is not set'
    });
  }
  
  // ========================================================================
  // STEP 5: Fetch all records from Airtable
  // ========================================================================
  try {
    console.log(`[INFO] Starting fetch from Airtable:`);
    console.log(`[INFO] - Base ID: ${AIRTABLE_BASE_ID}`);
    console.log(`[INFO] - Table ID: ${AIRTABLE_TABLE_ID}`);
    console.log(`[INFO] - Filter: ${FILTER_FORMULA}`);
    console.log(`[INFO] - Sort: ${SORT_FIELD} (${SORT_DIRECTION})`);
    
    // Fetch all records (handles pagination automatically)
    const allRecords = await fetchAllRecords();
    
    // ========================================================================
    // STEP 6: Return successful response
    // ========================================================================
    console.log(`[INFO] Successfully fetched ${allRecords.length} records`);
    
    return res.status(200).json({
      success: true,
      records: allRecords,
      totalRecords: allRecords.length,
      table: AIRTABLE_TABLE_ID,
      filter: FILTER_FORMULA,
      sort: {
        field: SORT_FIELD,
        direction: SORT_DIRECTION
      }
    });
    
  } catch (error) {
    // ========================================================================
    // STEP 7: Handle errors with detailed logging
    // ========================================================================
    console.error('[ERROR] Error fetching Airtable records:', error);
    console.error('[ERROR] Error stack:', error.stack);
    
    // Determine appropriate status code based on error message
    let statusCode = 500;
    let errorType = 'Internal server error';
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      statusCode = 401;
      errorType = 'Authentication error';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      statusCode = 403;
      errorType = 'Permission denied';
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      statusCode = 404;
      errorType = 'Resource not found';
    } else if (error.message.includes('422') || error.message.includes('Unprocessable')) {
      statusCode = 422;
      errorType = 'Invalid request';
    } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      statusCode = 429;
      errorType = 'Rate limit exceeded';
    }
    
    // Return error response with detailed information
    return res.status(statusCode).json({
      success: false,
      error: errorType,
      message: error.message,
      // Include additional debug info in development
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        baseId: AIRTABLE_BASE_ID,
        tableId: AIRTABLE_TABLE_ID
      })
    });
  }
}
