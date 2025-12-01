// Quick test script to verify Airtable API connection
require('dotenv').config();
const fetch = require('node-fetch');

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblDrUWfwkwMQM9yR';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
  console.error('Error: AIRTABLE_BASE_ID and AIRTABLE_API_KEY must be set in .env file');
  process.exit(1);
}

async function testAirtable() {
  try {
    console.log('Testing Airtable API connection...\n');
    
    // Test 1: Simple fetch without sort (in case Name field doesn't exist)
    console.log('Test 1: Fetching without sort...');
    const url1 = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=NOT%28%7BStatus%7D%3D%27Done%27%29&pageSize=50`;
    
    const response1 = await fetch(url1, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response1.ok) {
      const errorText = await response1.text();
      console.error('❌ Error:', response1.status, errorText);
    } else {
      const data1 = await response1.json();
      console.log('✅ Success! Found', data1.records?.length || 0, 'records');
      if (data1.records && data1.records.length > 0) {
        console.log('Sample record fields:', Object.keys(data1.records[0].fields));
      }
    }

    // Test 2: With sort by Name
    console.log('\nTest 2: Fetching with sort by Name...');
    const url2 = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=NOT%28%7BStatus%7D%3D%27Done%27%29&sort%5B0%5D%5Bfield%5D=Name&sort%5B0%5D%5Bdirection%5D=asc&pageSize=50`;
    
    const response2 = await fetch(url2, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response2.ok) {
      const errorText = await response2.text();
      console.error('❌ Error with sort:', response2.status, errorText);
      console.log('\n⚠️  The "Name" field might not exist. Use the version without sort.');
    } else {
      const data2 = await response2.json();
      console.log('✅ Success with sort! Found', data2.records?.length || 0, 'records');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

testAirtable();

