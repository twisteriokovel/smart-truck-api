# Historical Data Seeding for Smart Truck API

This document explains how to generate **historical data** specifically for **statistics and dashboard development**. All generated orders and trips will be marked as **DONE** or **CANCELLED** to provide realistic historical data for analytics.

## Prerequisites

Before running the seeding scripts, make sure you have:

1. **Active Trucks**: Add some trucks to your database first using the truck endpoints
2. **Addresses**: Add some destination addresses using the address endpoints
3. **MongoDB Connection**: Ensure your database is running and connected

## Available Commands

### Generate Historical Data

```bash
# Generate 3 months of historical data (default)
npm run seed seed

# Generate 6 months of historical data for rich analytics
npm run seed seed 6

# Generate 1 month of historical data
npm run seed seed 1
```

### Clear Historical Data

```bash
# Remove generated historical data (last 3 months)
npm run seed clear
```

### Help

```bash
# Show available commands
npm run seed
```

## What Gets Generated

### Orders
- **Quantity**: 40-60 orders per month
- **Date Range**: Evenly distributed over the specified months
- **Pallets**: 1-8 pallets per order (200-1000kg each, 100-200cm height)
- **Status Distribution**:
  - **85% DONE**: Successfully completed orders
  - **15% CANCELLED**: Cancelled orders for realistic business metrics
- **Destinations**: Random selection from your existing addresses
- **Notes**: Realistic order notes (optional)

### Trips
- **Automatic Creation**: Based on order status and pallet count
- **Truck Assignment**: Random selection from active trucks
- **Capacity Respect**: Trips respect truck pallet capacity
- **Multiple Trips**: Large orders automatically split into multiple trips
- **Realistic Timing**: Trips spaced appropriately based on order date
- **Status Logic**:
  - **DONE** for completed orders (matches order status)
  - **CANCELLED** for cancelled orders (some trips may be DONE if completed before order cancellation)
- **Accurate Fuel & Duration**: Calculated based on real truck consumption and route data with realistic variance

### Calculation Methodology

#### Fuel Consumption
- **Formula**: `(truck consumption in L/100km × route distance in km × 2) ÷ 100`
- **Round Trip**: Accounts for return journey
- **Truck-Specific**: Uses actual consumption data from your truck fleet
- **Actual Variance**: ±20% variance for realistic fuel efficiency differences

#### Trip Duration
- **Formula**: `(route time × 2) + unloading time + rest time (if needed)`
- **Travel Time**: Based on real route time data × 2 for round trip
- **Unloading**: 2-3 hours for cargo handling
- **Driver Rest**: Mandatory 9-hour rest if total work time exceeds 9 hours
- **Actual Variance**: ±3 hours for realistic timing differences

## Data Characteristics

### Realistic Historical Patterns
- **Temporal Distribution**: Orders evenly distributed over the specified timeframe
- **Completion Focus**: All orders are historical (DONE/CANCELLED) for accurate statistics
- **Trip Alignment**: Trip status properly aligned with order outcomes
- **Capacity Management**: Respects truck limitations and business rules
- **Business Logic**: Follows your existing validation and relationship rules

### Example Calculation

**Scenario**: Volvo FH16 truck delivering to Харків
- **Truck**: 30 L/100km consumption, 85 km/h average speed
- **Route**: 480km distance, 6 hours travel time

**Calculations**:
- **Estimated Fuel**: (30 × 480 × 2) ÷ 100 = 288 liters
- **Estimated Duration**: (6 × 2) + 3 + 9 = 24 hours (travel + unloading + rest)
- **Actual Fuel**: 288 ± 20% = 230-346 liters
- **Actual Duration**: 24 ± 3 hours = 21-27 hours

### Statistics Friendly
The generated data is perfect for dashboard development with:
- **Revenue tracking** (based on cargo weight and trip completion)
- **Truck utilization** (active vs idle trucks over time)
- **Order completion rates** (status distribution analysis)
- **Fuel efficiency** (estimated vs actual fuel consumption with realistic variance)
- **Route optimization** (trip duration analysis based on real route data)

## Usage Examples

### For Dashboard Development
```bash
# Generate 6 months of rich data for comprehensive charts
npm run seed seed 6
```

### For Testing
```bash
# Generate minimal data for testing
npm run seed seed 1
```

### Reset and Regenerate
```bash
# Clear old data and generate fresh data
npm run seed clear
npm run seed seed 3
```

## Safety Features

- **Non-destructive**: Only affects orders and trips created by the seeding process
- **Date-based filtering**: Clear command only removes recent data (last 3 months)
- **Validation**: Uses your existing business logic and validation rules
- **No user data**: Doesn't affect trucks, addresses, or user accounts

## Troubleshooting

### "No active trucks found"
Add trucks to your database first using the truck management endpoints.

### "No addresses found"
Add destination addresses using the address management endpoints.

### Database connection errors
Ensure MongoDB is running and your connection string is correct in your environment variables.

## Technical Details

- **Counter Integration**: Uses your existing counter service for order/trip numbers
- **Schema Compliance**: Generated data follows your exact schema definitions
- **Relationship Integrity**: Maintains proper foreign key relationships
- **Timestamp Accuracy**: Realistic created/updated timestamps