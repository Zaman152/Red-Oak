/**
 * Complete Airtable Serverless Function
 * 
 * This function fetches ALL records from an Airtable table with:
 * - Filter: Excludes records where Status = 'Done'
 * - Sort: By Name field ascending
 * - Pagination: Automatically handles multiple pages (50 records per page)
 * - CORS: Allows requests from any origin
 * 
 * Compatible with: Vercel, Netlify, Cloudflare Workers
 * 
 * Environment Variables Required:
 * - AIRTABLE_API_KEY: Your Airtable Personal Access Token
 * - AIRTABLE_BASE_ID: Your Airtable Base ID
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Get credentials from environment variables (required for production)
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

// Table configuration
const TABLE_NAME = 'TableName'; // The name of your Airtable table
const PAGE_SIZE = 50; // Maximum records per page (Airtable limit is 100, but 50 is safer)
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
  // Base URL for Airtable API
  let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  
  // Build query parameters
  const params = new URLSearchParams();
  
  // Add filter formula (URL encoded)
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
    throw new Error(`Airtable API error (${response.status}): ${errorText}`);
  }
  
  // Parse JSON response
  const data = await response.json();
  
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
  
  // Keep fetching pages until there are no more
  do {
    pageCount++;
    console.log(`Fetching page ${pageCount}...`);
    
    // Fetch current page
    const pageData = await fetchPage(offset);
    
    // Add records from this page to our collection
    allRecords.push(...pageData.records);
    
    // Update offset for next page
    offset = pageData.offset;
    
    console.log(`Page ${pageCount}: Retrieved ${pageData.records.length} records. Total so far: ${allRecords.length}`);
    
    // Continue if there are more pages
  } while (offset);
  
  console.log(`Finished fetching all records. Total: ${allRecords.length} records across ${pageCount} pages.`);
  
  return allRecords;
}

// ============================================================================
// MAIN SERVERLESS FUNCTION
// ============================================================================

/**
 * Main handler function for serverless deployment
 * Compatible with Vercel, Netlify, and Cloudflare Workers
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
    return res.status(200).end();
  }
  
  // ========================================================================
  // STEP 3: Validate HTTP method
  // ========================================================================
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }
  
  // ========================================================================
  // STEP 4: Validate environment variables
  // ========================================================================
  if (!AIRTABLE_API_KEY) {
    console.error('Missing AIRTABLE_API_KEY environment variable');
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'AIRTABLE_API_KEY environment variable is not set'
    });
  }
  
  if (!AIRTABLE_BASE_ID) {
    console.error('Missing AIRTABLE_BASE_ID environment variable');
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'AIRTABLE_BASE_ID environment variable is not set'
    });
  }
  
  // ========================================================================
  // STEP 5: Fetch all records from Airtable
  // ========================================================================
  try {
    console.log(`Starting fetch from Airtable base: ${AIRTABLE_BASE_ID}, table: ${TABLE_NAME}`);
    
    // Fetch all records (handles pagination automatically)
    const allRecords = await fetchAllRecords();
    
    // ========================================================================
    // STEP 6: Return successful response
    // ========================================================================
    return res.status(200).json({
      success: true,
      records: allRecords,
      totalRecords: allRecords.length,
      table: TABLE_NAME,
      filter: FILTER_FORMULA,
      sort: {
        field: SORT_FIELD,
        direction: SORT_DIRECTION
      }
    });
    
  } catch (error) {
    // ========================================================================
    // STEP 7: Handle errors
    // ========================================================================
    console.error('Error fetching Airtable records:', error);
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      statusCode = 401;
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      statusCode = 403;
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      statusCode = 404;
    } else if (error.message.includes('422') || error.message.includes('Unprocessable')) {
      statusCode = 422;
    }
    
    // Return error response
    return res.status(statusCode).json({
      success: false,
      error: 'Failed to fetch Airtable records',
      message: error.message,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}

// ============================================================================
// ALTERNATIVE EXPORT FOR COMMONJS (if ES modules don't work)
// ============================================================================
// Uncomment this if your platform requires CommonJS:
/*
module.exports = async (req, res) => {
  // Same handler code as above
  return handler(req, res);
};
*/

