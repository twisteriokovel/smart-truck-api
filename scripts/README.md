# Performance Optimization for Historical Context

This directory contains scripts and instructions to fix the `getHistoricalContext` request cancellation issue.

## Problem
The `getHistoricalContext` method was timing out on the frontend due to:
- Long database query times
- Missing database indexes
- No timeout handling
- Inefficient data fetching

## Solutions Implemented

### 1. Database Indexes (Required)
Run the index creation script to optimize database queries:

```bash
# Option 1: Using MongoDB shell
mongo your_database_name scripts/add-indexes.js

# Option 2: Using mongosh (newer MongoDB shell)
mongosh your_database_name scripts/add-indexes.js

# Option 3: Copy and paste the contents of add-indexes.js into your MongoDB client
```

### 2. Code Improvements
The following improvements have been made to the `HistoricalContextService`:

- ✅ **Timeout handling**: 10-second timeout to prevent hanging requests
- ✅ **Performance monitoring**: Detailed logging of query execution times
- ✅ **Query optimization**: Reduced data fetching and limited result sets
- ✅ **Error handling**: Graceful fallback to default context on timeout/error

## How to Test

### 1. Apply the Database Indexes
First, run the index script:
```bash
mongosh your_database_name scripts/add-indexes.js
```

### 2. Restart Your Application
```bash
npm run start:dev
```

### 3. Monitor the Logs
Watch for these log entries when testing historical context:
```
[HistoricalContextService] Fetching historical context for order ORDER_ID
[HistoricalContextService] Found X similar orders in Y ms
[HistoricalContextService] Retrieved X trips in Y ms
[HistoricalContextService] Calculated metrics in Y ms
[HistoricalContextService] Historical context retrieved for order ORDER_ID in Y ms
```

### 4. Test the Smart Optimization Endpoint
```bash
curl -X POST http://localhost:3000/api/smart-trip/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "orderId": "test-order-123",
    "includeHistoricalContext": true,
    "pallets": [
      {"id": "pallet1", "weight": 500, "height": 1.5},
      {"id": "pallet2", "weight": 750, "height": 1.8}
    ]
  }'
```

## Performance Expectations

After applying these optimizations:

- **Before**: 15-30+ seconds (often timing out)
- **After**: 2-5 seconds typical response time
- **Timeout**: Maximum 10 seconds before fallback to default context
- **Fallback**: System continues to work even if historical context fails

## Monitoring Performance

Check your application logs for timing information:

```bash
# Follow logs in development
npm run start:dev

# Or check specific service logs
grep "HistoricalContextService" logs/application.log
```

## Troubleshooting

### If queries are still slow:
1. Verify indexes were created: `db.orders.getIndexes()` and `db.trips.getIndexes()`
2. Check your database size - very large collections may need additional optimization
3. Consider adding more specific indexes based on your query patterns

### If timeout errors occur frequently:
1. Increase the `TIMEOUT_MS` value in `historical-context.service.ts`
2. Review your MongoDB server performance and resources
3. Consider implementing caching (see next steps below)

## Next Steps (Optional Improvements)

### 1. Add Caching
Implement Redis caching for historical context results:
```typescript
// Cache results for 30 minutes since historical data doesn't change frequently
const cacheKey = `historical_${palletCount}_${Math.round(totalWeight)}`;
```

### 2. Database Connection Optimization
Review MongoDB connection pool settings in your app configuration.

### 3. Background Processing
Consider moving historical context calculation to a background job for very large datasets.

## Files Modified
- `src/services/historical-context.service.ts` - Added timeout and performance monitoring
- `scripts/add-indexes.js` - MongoDB index creation script
- `scripts/README.md` - This documentation