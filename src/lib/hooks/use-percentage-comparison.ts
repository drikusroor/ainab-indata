import { useMemo } from 'react';
import type { CountrySeriesData } from './use-worldbank-data';

export interface PercentageComparisonData {
  country: {
    code: string;
    name: string;
  };
  data: {
    year: number;
    value: number | null;
    percentage: number | null;
  }[];
}

/**
 * Hook to transform multi-country data into percentage comparison format
 * where each country's values are shown as a percentage of the baseline country
 */
export function usePercentageComparison(
  multiCountryData: CountrySeriesData[] | undefined,
  baselineCountryCode: string
) {
  return useMemo((): PercentageComparisonData[] => {
    if (!multiCountryData || !baselineCountryCode) {
      return [];
    }

    // Find the baseline country data
    const baselineCountry = multiCountryData.find(
      (country) => country.country.code === baselineCountryCode
    );

    if (!baselineCountry) {
      return [];
    }

    // Create a map of baseline values by year for quick lookup
    const baselineValuesByYear = new Map<number, number>();
    baselineCountry.data.forEach((point) => {
      if (point.value !== null) {
        baselineValuesByYear.set(point.year, point.value);
      }
    });

    // Transform each country's data to percentage format
    return multiCountryData.map((countryData) => {
      const transformedData = countryData.data.map((point) => {
        const baselineValue = baselineValuesByYear.get(point.year);
        
        let percentage: number | null = null;
        if (point.value !== null && baselineValue !== null && baselineValue !== 0) {
          percentage = (point.value / baselineValue) * 100;
        }

        return {
          year: point.year,
          value: point.value,
          percentage,
        };
      });

      return {
        country: countryData.country,
        data: transformedData,
      };
    });
  }, [multiCountryData, baselineCountryCode]);
}