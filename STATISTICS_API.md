# Statistics API Documentation

This document describes the statistics endpoints for generating dashboard graphics and business analytics.

## Base URL
All statistics endpoints are available under `/statistics`

## Configuration

### Default Configuration
- **Fuel Cost**: 55 UAH per liter
- **Average Hourly Wage**: 200 UAH per hour
- **Average Revenue**: 3 UAH per kg of cargo

### Update Configuration
```http
PUT /statistics/config
Content-Type: application/json

{
  "fuelCostPerLiter": 60,
  "averageHourlyWage": 250,
  "averageRevenuePerKg": 3.5
}
```

### Get Current Configuration
```http
GET /statistics/config
```

## Query Parameters

All endpoints support these query parameters:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `startDate` | string | Start date (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | End date (YYYY-MM-DD) | `2024-12-31` |
| `months` | number | Last N months (1-24) | `6` |

**Default**: Last 6 months if no parameters provided.

## Endpoints

### 1. Orders by Month
Perfect for order volume charts and completion rate analysis.

```http
GET /statistics/orders-by-month?months=12
```

**Response:**
```json
[
  {
    "month": "2024-01",
    "monthName": "January",
    "year": 2024,
    "totalOrders": 45,
    "completedOrders": 38,
    "cancelledOrders": 7,
    "completionRate": 84
  }
]
```

**Use Cases:**
- Monthly order volume bar charts
- Order completion rate trends
- Seasonal order patterns

### 2. Trips by Month
Ideal for operational efficiency tracking.

```http
GET /statistics/trips-by-month?months=6
```

**Response:**
```json
[
  {
    "month": "2024-06",
    "monthName": "June",
    "year": 2024,
    "totalTrips": 78,
    "completedTrips": 71,
    "cancelledTrips": 7,
    "completionRate": 91
  }
]
```

**Use Cases:**
- Trip volume trends
- Operational efficiency metrics
- Driver performance indicators

### 3. Fuel Consumption by Month
Essential for cost analysis and efficiency monitoring.

```http
GET /statistics/fuel-by-month?startDate=2024-01-01&endDate=2024-06-30
```

**Response:**
```json
[
  {
    "month": "2024-06",
    "monthName": "June",
    "year": 2024,
    "totalFuelLiters": 2450,
    "totalFuelCost": 134750,
    "averageFuelPerTrip": 31,
    "fuelEfficiencyVariance": -2.5
  }
]
```

**Key Metrics:**
- `totalFuelLiters`: Total fuel consumed (actual values)
- `totalFuelCost`: Cost in UAH (fuel × price per liter)
- `averageFuelPerTrip`: Efficiency metric
- `fuelEfficiencyVariance`: % difference from estimates (negative = better than expected)

### 4. Labor Costs by Month
Critical for workforce cost management.

```http
GET /statistics/labor-by-month?months=12
```

**Response:**
```json
[
  {
    "month": "2024-06",
    "monthName": "June",
    "year": 2024,
    "totalHours": 1820,
    "totalLaborCost": 364000,
    "averageHoursPerTrip": 23.33,
    "timeVariance": 1.8
  }
]
```

**Key Metrics:**
- `totalHours`: Total driver hours (actual values)
- `totalLaborCost`: Cost in UAH (hours × hourly wage)
- `averageHoursPerTrip`: Efficiency metric
- `timeVariance`: % difference from estimates (positive = took longer than expected)

### 5. Revenue Analysis by Month
Comprehensive profit/loss analysis.

```http
GET /statistics/revenue-by-month?months=6
```

**Response:**
```json
[
  {
    "month": "2024-06",
    "monthName": "June",
    "year": 2024,
    "estimatedRevenue": 405000,
    "totalCosts": 498750,
    "fuelCosts": 134750,
    "laborCosts": 364000,
    "estimatedProfit": -93750,
    "profitMargin": -23
  }
]
```

**Key Metrics:**
- `estimatedRevenue`: Based on cargo weight × revenue per kg
- `totalCosts`: Fuel + labor costs
- `estimatedProfit`: Revenue - total costs
- `profitMargin`: Profit percentage

### 6. Complete Monthly Statistics
Full dataset for comprehensive dashboards.

```http
GET /statistics/monthly?months=6
```

**Response:** Complete dataset with all metrics combined.

### 7. Total Statistics
Aggregated totals for the specified period.

```http
GET /statistics/total?months=12
```

**Response:**
```json
{
  "totalOrders": 520,
  "completedOrders": 442,
  "cancelledOrders": 78,
  "totalTrips": 892,
  "completedTrips": 803,
  "cancelledTrips": 89,
  "totalFuelLiters": 28560,
  "totalFuelCost": 1570800,
  "totalHours": 20840,
  "totalLaborCost": 4168000,
  "averageOrderValue": 4875000,
  "fuelEfficiencyVariance": -1.2,
  "timeVariance": 2.1
}
```

### 8. Dashboard Summary
Perfect for dashboard overview cards.

```http
GET /statistics/summary?months=3
```

**Response:**
```json
{
  "totalStats": {
    "totalOrders": 156,
    "totalTrips": 267,
    "totalFuelLiters": 8280,
    "totalFuelCost": 455400,
    "totalHours": 6240,
    "totalLaborCost": 1248000,
    "totalCosts": 1703400,
    "averageFuelEfficiencyVariance": -1.8,
    "averageTimeVariance": 1.5
  },
  "currentMonth": {
    "month": "June",
    "orders": 52,
    "trips": 89,
    "fuelCost": 151800,
    "laborCost": 416000
  },
  "monthlyTrends": {
    "ordersChange": 3,
    "tripsChange": 5,
    "fuelCostChange": 12500,
    "laborCostChange": 28000
  }
}
```

## Frontend Integration Examples

### 1. Monthly Orders Chart (Chart.js/Recharts)
```javascript
// Fetch data
const response = await fetch('/statistics/orders-by-month?months=12');
const data = await response.json();

// Chart data
const chartData = {
  labels: data.map(d => d.monthName),
  datasets: [{
    label: 'Completed Orders',
    data: data.map(d => d.completedOrders),
    backgroundColor: 'green'
  }, {
    label: 'Cancelled Orders',
    data: data.map(d => d.cancelledOrders),
    backgroundColor: 'red'
  }]
};
```

### 2. Fuel Cost Trend Line
```javascript
const response = await fetch('/statistics/fuel-by-month?months=12');
const data = await response.json();

const chartData = {
  labels: data.map(d => d.monthName),
  datasets: [{
    label: 'Fuel Costs (UAH)',
    data: data.map(d => d.totalFuelCost),
    borderColor: 'blue',
    fill: false
  }]
};
```

### 3. Dashboard KPI Cards
```javascript
const response = await fetch('/statistics/summary?months=1');
const { totalStats, currentMonth, monthlyTrends } = await response.json();

// Use in dashboard cards
const kpis = [
  { title: 'Total Orders', value: totalStats.totalOrders, trend: monthlyTrends.ordersChange },
  { title: 'Fuel Cost', value: `${totalStats.totalFuelCost.toLocaleString()} UAH`, trend: monthlyTrends.fuelCostChange },
  { title: 'Labor Cost', value: `${totalStats.totalLaborCost.toLocaleString()} UAH`, trend: monthlyTrends.laborCostChange }
];
```

## Error Handling

All endpoints return standard HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `500`: Internal Server Error

Error response format:
```json
{
  "statusCode": 400,
  "message": "Invalid date format. Use YYYY-MM-DD",
  "error": "Bad Request"
}
```

## Performance Notes

- All statistics use MongoDB aggregation pipelines for optimal performance
- Queries are optimized for date ranges up to 24 months
- Consider caching responses for frequently accessed data
- Use specific endpoints (e.g., `/fuel-by-month`) rather than `/monthly` for better performance when only specific data is needed