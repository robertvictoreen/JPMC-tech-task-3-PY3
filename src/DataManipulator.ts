import { ServerRespond } from './DataStreamer';

export interface Row {
  price_abc: number,
  price_def: number,
  ratio: number,
  timestamp: Date,
  upper_bound: number,
  lower_bound: number,
  trigger_alert: number | undefined,
}


export class DataManipulator {
  // Static variables to keep track of 12 month historical average
  static historicalSum = 0;
  static historicalCount = 0;
  static historicalData = new Map();

  static generateRow(serverRespond: ServerRespond[]): Row {
    const priceABC = (serverRespond[0].top_ask.price + serverRespond[0].top_bid.price) / 2;
    const priceDEF = (serverRespond[1].top_ask.price + serverRespond[1].top_bid.price) / 2;
    const ratio = priceABC / priceDEF;
    const timestamp = serverRespond[0].timestamp > serverRespond[1].timestamp ?
        serverRespond[0].timestamp : serverRespond[1].timestamp;
    const historicalAverage = DataManipulator.getHistoricalAverage(ratio, timestamp);
    // Calculate upper and lower bound within 5% of historical average
    const upperBound = 1.05 * historicalAverage;
    const lowerBound = 0.95 * historicalAverage;
    return {
      price_abc: priceABC,
      price_def: priceDEF,
      ratio,
      timestamp,
      upper_bound: upperBound,
      lower_bound: lowerBound,
      trigger_alert: (ratio > upperBound || ratio < lowerBound) ? ratio : undefined,
    };
  }

  static getHistoricalAverage(ratio: number, timestamp: Date): number {
    // Update moving average
    DataManipulator.historicalSum += ratio;
    DataManipulator.historicalCount++;

    // Use current date string without hours as hash key for lookup
    let currentDate = new Date(timestamp);
    currentDate.setHours(0,0,0,0);
    DataManipulator.historicalData.set(currentDate.toString(), ratio);

    // Create hash key for past year date
    let pastYearDate = new Date(timestamp);
    pastYearDate.setFullYear(pastYearDate.getFullYear() - 1);
    pastYearDate.setHours(0,0,0,0);
    const pastYearKey = pastYearDate.toString();

    if (DataManipulator.historicalData.has(pastYearKey)) {
      // Remove expired ratio
      DataManipulator.historicalCount--;
      DataManipulator.historicalSum -= DataManipulator.historicalData.get(pastYearKey);
      DataManipulator.historicalData.delete(pastYearKey);
    }

    // Calculate current historical average
    return DataManipulator.historicalSum / DataManipulator.historicalCount;
  }
}
