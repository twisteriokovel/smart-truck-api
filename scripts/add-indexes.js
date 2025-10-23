// MongoDB Index Creation Script
// Run this script in MongoDB shell or through a MongoDB client

// Connect to your database first`
// use your_database_name

// Add indexes for orders collection to optimize historical context queries
db.orders.createIndex(
  {
    cargoWeight: 1,
    status: 1,
    createdAt: 1,
  },
  {
    name: 'orders_historical_context_weight',
    background: true,
  },
);

db.orders.createIndex(
  {
    'pallets.length': 1,
    status: 1,
    createdAt: 1,
  },
  {
    name: 'orders_historical_context_pallets',
    background: true,
  },
);

// Compound index for both weight and pallet count queries
db.orders.createIndex(
  {
    cargoWeight: 1,
    'pallets.length': 1,
    status: 1,
    createdAt: 1,
  },
  {
    name: 'orders_historical_context_compound',
    background: true,
  },
);

// Add indexes for trips collection
db.trips.createIndex(
  {
    orderId: 1,
    status: 1,
  },
  {
    name: 'trips_order_status',
    background: true,
  },
);

// Additional index for performance metrics calculations
db.trips.createIndex(
  {
    orderId: 1,
    status: 1,
    actualFuel: 1,
    estimatedFuel: 1,
  },
  {
    name: 'trips_performance_metrics',
    background: true,
  },
);

print('Indexes created successfully!');
print(
  'To verify indexes, run: db.orders.getIndexes() and db.trips.getIndexes()',
);
