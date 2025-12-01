/**
 * Test script to run the serverless function locally
 * This simulates a serverless environment and runs the function
 */

require('dotenv').config();

// Mock request and response objects for local testing
const mockReq = {
  method: 'GET',
  headers: {}
};

const mockRes = {
  headers: {},
  statusCode: 200,
  setHeader: function(key, value) {
    this.headers[key] = value;
  },
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('\n=== RESPONSE ===');
    console.log('Status:', this.statusCode);
    console.log('Headers:', this.headers);
    console.log('\n=== DATA ===');
    console.log(JSON.stringify(data, null, 2));
    return this;
  },
  end: function() {
    console.log('\n=== RESPONSE ===');
    console.log('Status:', this.statusCode);
    console.log('Headers:', this.headers);
    return this;
  }
};

// Import the serverless function
// Since it uses ES modules, we'll recreate the logic here for CommonJS
async function runServerlessFunction() {
  console.log('🚀 Starting Airtable Serverless Function Test\n');
  console.log('Environment Variables:');
  console.log('- AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? '✅ Set' : '❌ Missing');
  console.log('- AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('');

  // Import the function logic
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = 'tblDrUWfwkwMQM9yR'; // Using table ID instead of name
  const PAGE_SIZE = 50;
  const FILTER_FORMULA = "NOT({Status}='Done')";
  const SORT_FIELD = 'Name';
  const SORT_DIRECTION = 'asc';

  // Set CORS headers
  mockRes.setHeader('Access-Control-Allow-Origin', '*');
  mockRes.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  mockRes.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  mockRes.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS
  if (mockReq.method === 'OPTIONS') {
    return mockRes.status(200).end();
  }

  // Validate method
  if (mockReq.method !== 'GET') {
    return mockRes.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }

  // Validate environment variables
  if (!AIRTABLE_API_KEY) {
    console.error('❌ Missing AIRTABLE_API_KEY');
    return mockRes.status(500).json({ 
      error: 'Server configuration error',
      message: 'AIRTABLE_API_KEY environment variable is not set'
    });
  }

  if (!AIRTABLE_BASE_ID) {
    console.error('❌ Missing AIRTABLE_BASE_ID');
    return mockRes.status(500).json({ 
      error: 'Server configuration error',
      message: 'AIRTABLE_BASE_ID environment variable is not set'
    });
  }

  // Helper function to build URL
  function buildAirtableURL(offset = null) {
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
    const params = new URLSearchParams();
    params.append('filterByFormula', FILTER_FORMULA);
    params.append('sort[0][field]', SORT_FIELD);
    params.append('sort[0][direction]', SORT_DIRECTION);
    params.append('pageSize', PAGE_SIZE.toString());
    if (offset) {
      params.append('offset', offset);
    }
    return `${url}?${params.toString()}`;
  }

  // Fetch a page
  async function fetchPage(offset = null) {
    const url = buildAirtableURL(offset);
    const fetch = require('node-fetch');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      records: data.records || [],
      offset: data.offset || null,
      hasMore: !!data.offset
    };
  }

  // Fetch all records
  async function fetchAllRecords() {
    const allRecords = [];
    let offset = null;
    let pageCount = 0;

    do {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}...`);

      const pageData = await fetchPage(offset);
      allRecords.push(...pageData.records);
      offset = pageData.offset;

      console.log(`   ✅ Retrieved ${pageData.records.length} records. Total: ${allRecords.length}`);

    } while (offset);

    console.log(`\n✅ Finished! Total: ${allRecords.length} records across ${pageCount} pages.\n`);
    return allRecords;
  }

  // Execute
  try {
    console.log(`📊 Fetching from Airtable:`);
    console.log(`   Base ID: ${AIRTABLE_BASE_ID}`);
    console.log(`   Table: ${TABLE_NAME}`);
    console.log(`   Filter: ${FILTER_FORMULA}`);
    console.log(`   Sort: ${SORT_FIELD} (${SORT_DIRECTION})\n`);

    const allRecords = await fetchAllRecords();

    // Show sample of first record's fields for debugging
    if (allRecords.length > 0) {
      console.log('\n📋 Sample Record Fields:');
      const firstRecord = allRecords[0];
      console.log('   Record ID:', firstRecord.id);
      console.log('   Available fields:', Object.keys(firstRecord.fields).join(', '));
      if (Object.keys(firstRecord.fields).length > 0) {
        console.log('\n   First record data:');
        Object.entries(firstRecord.fields).forEach(([key, value]) => {
          const displayValue = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value).substring(0, 100);
          console.log(`   - ${key}: ${displayValue}`);
        });
      }
    }

    return mockRes.status(200).json({
      success: true,
      records: allRecords,
      totalRecords: allRecords.length,
      table: TABLE_NAME,
      filter: FILTER_FORMULA,
      sort: {
        field: SORT_FIELD,
        direction: SORT_DIRECTION
      },
      // Include field summary
      fieldSummary: allRecords.length > 0 ? {
        availableFields: Object.keys(allRecords[0].fields),
        sampleRecord: allRecords[0]
      } : null
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    let statusCode = 500;
    if (error.message.includes('401')) statusCode = 401;
    else if (error.message.includes('403')) statusCode = 403;
    else if (error.message.includes('404')) statusCode = 404;
    else if (error.message.includes('422')) statusCode = 422;

    return mockRes.status(statusCode).json({
      success: false,
      error: 'Failed to fetch Airtable records',
      message: error.message
    });
  }
}

// Run the test
runServerlessFunction().catch(console.error);

