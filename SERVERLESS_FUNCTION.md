# Complete Serverless Function for Airtable

## File: `serverless-airtable.js`

This is a complete, production-ready serverless function that fetches ALL records from your Airtable base with automatic pagination.

## Features

✅ **Automatic Pagination** - Fetches all records across multiple pages automatically  
✅ **Environment Variables** - Uses `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID`  
✅ **Filtering** - Excludes records where `Status = 'Done'`  
✅ **Sorting** - Sorts by `Name` field ascending  
✅ **CORS Enabled** - Allows requests from any origin  
✅ **Error Handling** - Comprehensive error handling with proper status codes  
✅ **Multi-Platform** - Works with Vercel, Netlify, and Cloudflare Workers  

## Deployment Instructions

### For Vercel:

1. Save the code as `api/airtable.js` in your project
2. Set environment variables in Vercel dashboard:
   - `AIRTABLE_API_KEY`
   - `AIRTABLE_BASE_ID`
3. Deploy: `vercel deploy`

### For Netlify:

1. Save the code as `netlify/functions/airtable.js`
2. Set environment variables in Netlify dashboard
3. Deploy: `netlify deploy --prod`

### For Cloudflare Workers:

1. Save the code and adapt for Cloudflare Workers format
2. Set environment variables in Cloudflare dashboard
3. Deploy via Wrangler CLI

## Response Format

**Success Response:**
```json
{
  "success": true,
  "records": [...],
  "totalRecords": 150,
  "table": "TableName",
  "filter": "NOT({Status}='Done')",
  "sort": {
    "field": "Name",
    "direction": "asc"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to fetch Airtable records",
  "message": "Error details here"
}
```

## Configuration

Edit these constants in the file to customize:

- `TABLE_NAME`: Change from `'TableName'` to your actual table name
- `PAGE_SIZE`: Adjust page size (default: 50, max: 100)
- `FILTER_FORMULA`: Modify the filter logic
- `SORT_FIELD`: Change the sort field
- `SORT_DIRECTION`: Change to `'desc'` for descending

## Testing

Test locally with:
```bash
node serverless-airtable.js
```

Or test the deployed endpoint:
```bash
curl https://your-deployment.vercel.app/api/airtable
```

