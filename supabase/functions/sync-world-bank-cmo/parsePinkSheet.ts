/**
 * Minimal World Bank Pink Sheet (CMO Historical Data Monthly) parser for Deno.
 * Mirrors src/services/worldBankApi.ts category / header mappings.
 */
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

export type WbCommodity = {
  id: string;
  name: string;
  unit: string;
  symbol: string;
  category: string;
  data: { date: string; value: number }[];
  currentValue?: number;
  change?: number;
  changePercent?: number;
};

const CAT = {
  ENERGY: "Energy",
  AGRICULTURAL: "Agricultural",
  METALS: "Metals",
  FERTILIZERS: "Fertilizers",
  OTHER: "Other",
} as const;

const COMMODITY_CATEGORIES: Record<string, string> = {
  CRUDE_PETRO: CAT.ENERGY,
  CRUDE_BRENT: CAT.ENERGY,
  CRUDE_DUBAI: CAT.ENERGY,
  CRUDE_WTI: CAT.ENERGY,
  COAL_AUS: CAT.ENERGY,
  COAL_SAFRICA: CAT.ENERGY,
  NGAS_US: CAT.ENERGY,
  NGAS_EUR: CAT.ENERGY,
  NGAS_JP: CAT.ENERGY,
  iNATGAS: CAT.ENERGY,
  COCOA: CAT.AGRICULTURAL,
  COFFEE_ARABIC: CAT.AGRICULTURAL,
  COFFEE_ROBUS: CAT.AGRICULTURAL,
  TEA_AVG: CAT.AGRICULTURAL,
  TEA_COLOMBO: CAT.AGRICULTURAL,
  TEA_KOLKATA: CAT.AGRICULTURAL,
  TEA_MOMBASA: CAT.AGRICULTURAL,
  COCONUT_OIL: CAT.AGRICULTURAL,
  GRNUT: CAT.AGRICULTURAL,
  FISH_MEAL: CAT.AGRICULTURAL,
  GRNUT_OIL: CAT.AGRICULTURAL,
  PALM_OIL: CAT.AGRICULTURAL,
  PLMKRNL_OIL: CAT.AGRICULTURAL,
  SOYBEANS: CAT.AGRICULTURAL,
  SOYBEAN_OIL: CAT.AGRICULTURAL,
  SOYBEAN_MEAL: CAT.AGRICULTURAL,
  RAPESEED_OIL: CAT.AGRICULTURAL,
  SUNFLOWER_OIL: CAT.AGRICULTURAL,
  BARLEY: CAT.AGRICULTURAL,
  MAIZE: CAT.AGRICULTURAL,
  SORGHUM: CAT.AGRICULTURAL,
  RICE_05: CAT.AGRICULTURAL,
  RICE_25: CAT.AGRICULTURAL,
  RICE_A1: CAT.AGRICULTURAL,
  RICE_05_VNM: CAT.AGRICULTURAL,
  WHEAT_US_SRW: CAT.AGRICULTURAL,
  WHEAT_US_HRW: CAT.AGRICULTURAL,
  BANANA_EU: CAT.AGRICULTURAL,
  BANANA_US: CAT.AGRICULTURAL,
  ORANGE: CAT.AGRICULTURAL,
  BEEF: CAT.AGRICULTURAL,
  CHICKEN: CAT.AGRICULTURAL,
  LAMB: CAT.AGRICULTURAL,
  SHRIMP_MEX: CAT.AGRICULTURAL,
  SUGAR_EU: CAT.AGRICULTURAL,
  SUGAR_US: CAT.AGRICULTURAL,
  SUGAR_WLD: CAT.AGRICULTURAL,
  TOBAC_US: CAT.AGRICULTURAL,
  LOGS_CMR: CAT.AGRICULTURAL,
  LOGS_MYS: CAT.AGRICULTURAL,
  SAWNWD_CMR: CAT.AGRICULTURAL,
  SAWNWD_MYS: CAT.AGRICULTURAL,
  PLYWOOD: CAT.AGRICULTURAL,
  COTTON_A_INDX: CAT.AGRICULTURAL,
  RUBBER_TSR20: CAT.AGRICULTURAL,
  RUBBER1_MYSG: CAT.AGRICULTURAL,
  ALUMINUM: CAT.METALS,
  IRON_ORE: CAT.METALS,
  COPPER: CAT.METALS,
  LEAD: CAT.METALS,
  TIN: CAT.METALS,
  NICKEL: CAT.METALS,
  ZINC: CAT.METALS,
  GOLD: CAT.METALS,
  PLATINUM: CAT.METALS,
  SILVER: CAT.METALS,
  PHOSROCK: CAT.FERTILIZERS,
  DAP: CAT.FERTILIZERS,
  TSP: CAT.FERTILIZERS,
  UREA: CAT.FERTILIZERS,
  POTASH: CAT.FERTILIZERS,
};

const HEADER_NAME_TO_SYMBOL: Record<string, string> = {
  "Crude oil, average": "CRUDE_PETRO",
  "Crude oil, Brent": "CRUDE_BRENT",
  "Crude oil, Dubai": "CRUDE_DUBAI",
  "Crude oil, WTI": "CRUDE_WTI",
  "Coal, Australian": "COAL_AUS",
  "Coal, South African": "COAL_SAFRICA",
  "Natural gas, US": "NGAS_US",
  "Natural gas, Europe": "NGAS_EUR",
  "Liquefied natural gas, Japan": "NGAS_JP",
  "Natural gas index": "iNATGAS",
  Cocoa: "COCOA",
  "Coffee, Arabica": "COFFEE_ARABIC",
  "Coffee, Robusta": "COFFEE_ROBUS",
  "Tea, avg 3 auctions": "TEA_AVG",
  "Tea, Colombo": "TEA_COLOMBO",
  "Tea, Kolkata": "TEA_KOLKATA",
  "Tea, Mombasa": "TEA_MOMBASA",
  "Coconut oil": "COCONUT_OIL",
  Groundnuts: "GRNUT",
  "Fish meal": "FISH_MEAL",
  "Groundnut oil": "GRNUT_OIL",
  "Palm oil": "PALM_OIL",
  "Palm kernel oil": "PLMKRNL_OIL",
  Soybeans: "SOYBEANS",
  "Soybean oil": "SOYBEAN_OIL",
  "Soybean meal": "SOYBEAN_MEAL",
  "Rapeseed oil": "RAPESEED_OIL",
  "Sunflower oil": "SUNFLOWER_OIL",
  Barley: "BARLEY",
  Maize: "MAIZE",
  Sorghum: "SORGHUM",
  "Rice, Thai 5%": "RICE_05",
  "Rice, Thai 25%": "RICE_25",
  "Rice, Thai A.1": "RICE_A1",
  "Rice, Viet Namese 5%": "RICE_05_VNM",
  "Wheat, US SRW": "WHEAT_US_SRW",
  "Wheat, US HRW": "WHEAT_US_HRW",
  "Banana, Europe": "BANANA_EU",
  "Banana, US": "BANANA_US",
  Orange: "ORANGE",
  Beef: "BEEF",
  Chicken: "CHICKEN",
  Lamb: "LAMB",
  "Shrimps, Mexican": "SHRIMP_MEX",
  "Sugar, EU": "SUGAR_EU",
  "Sugar, US": "SUGAR_US",
  "Sugar, world": "SUGAR_WLD",
  "Tobacco, US import u.v.": "TOBAC_US",
  "Logs, Cameroon": "LOGS_CMR",
  "Logs, Malaysian": "LOGS_MYS",
  "Sawnwood, Cameroon": "SAWNWD_CMR",
  "Sawnwood, Malaysian": "SAWNWD_MYS",
  Plywood: "PLYWOOD",
  "Cotton, A Index": "COTTON_A_INDX",
  "Rubber, TSR20": "RUBBER_TSR20",
  "Rubber, RSS3": "RUBBER1_MYSG",
  "Phosphate rock": "PHOSROCK",
  DAP: "DAP",
  TSP: "TSP",
  Urea: "UREA",
  "Potassium chloride": "POTASH",
  Aluminum: "ALUMINUM",
  "Iron ore, cfr spot": "IRON_ORE",
  Copper: "COPPER",
  Lead: "LEAD",
  Tin: "TIN",
  Nickel: "NICKEL",
  Zinc: "ZINC",
  Gold: "GOLD",
  Platinum: "PLATINUM",
  Silver: "SILVER",
};

function normalizeHeaderName(raw: string): string {
  return raw
    .replace(/\s*\*{1,2}\s*$/, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function detectStructure(data: unknown[][]): {
  dateColumn: number;
  dataStartRow: number;
  headerRows: number;
  commodityColumns: number[];
} {
  let dateRowIndex = -1;
  let dateColumnIndex = -1;

  for (let row = 0; row < Math.min(20, data.length); row++) {
    const rowData = data[row] || [];
    for (let col = 0; col < rowData.length; col++) {
      const cell = rowData[col];
      if (cell && typeof cell === "string" && /^\d{4}M\d{2}$/.test(cell)) {
        dateRowIndex = row;
        dateColumnIndex = col;
        break;
      }
    }
    if (dateRowIndex !== -1) break;
  }

  if (dateRowIndex === -1) {
    for (let row = 0; row < Math.min(20, data.length); row++) {
      const rowData = data[row] || [];
      for (let col = 0; col < rowData.length; col++) {
        const cell = rowData[col];
        if (
          cell &&
          ((typeof cell === "string" && /^\d{4}-\d{2}/.test(cell)) ||
            cell instanceof Date)
        ) {
          dateRowIndex = row;
          dateColumnIndex = col;
          break;
        }
      }
      if (dateRowIndex !== -1) break;
    }
  }

  if (dateRowIndex === -1) {
    throw new Error("Could not find date column in World Bank Pink Sheet");
  }

  const commodityColumns: number[] = [];
  const maxColumns = Math.max(
    data[0]?.length || 0,
    ...data.slice(0, dateRowIndex).map((row) => row?.length || 0),
  );

  for (let col = 0; col < maxColumns; col++) {
    if (col === dateColumnIndex) continue;
    let hasName = false;
    for (let row = 0; row < dateRowIndex; row++) {
      const cell = data[row]?.[col];
      if (
        cell &&
        typeof cell === "string" &&
        cell.trim().length >= 2 &&
        !cell.match(/^\d+$/) &&
        !cell.toLowerCase().includes("unit") &&
        !cell.toLowerCase().includes("source") &&
        !cell.includes("$") &&
        !cell.toLowerCase().includes("period")
      ) {
        hasName = true;
        break;
      }
    }
    if (hasName) commodityColumns.push(col);
  }

  return {
    dateColumn: dateColumnIndex,
    dataStartRow: dateRowIndex,
    headerRows: dateRowIndex,
    commodityColumns,
  };
}

function extractCommodityInfo(
  data: unknown[][],
  structure: ReturnType<typeof detectStructure>,
): { names: string[]; units: string[]; symbols: string[] } {
  const names: string[] = [];
  const units: string[] = [];
  const symbols: string[] = [];

  for (const colIndex of structure.commodityColumns) {
    let name = "";
    let unit = "";
    let symbol = "";

    for (
      let row = Math.max(0, structure.headerRows - 3);
      row < structure.headerRows;
      row++
    ) {
      const cell = data[row]?.[colIndex];
      if (cell && typeof cell === "string" && cell.trim().length > 0) {
        const cellValue = cell.trim();
        if (
          !unit &&
          (cellValue.includes("$") ||
            cellValue.includes("USD") ||
            cellValue.includes("ton") ||
            cellValue.includes("kg") ||
            cellValue.includes("bbl") ||
            cellValue.includes("cents") ||
            cellValue.includes("mmbtu") ||
            cellValue.includes("dmtu") ||
            cellValue.includes("troy") ||
            cellValue.match(/^\(.*=.*\)$/))
        ) {
          unit = cellValue;
        } else if (
          !name &&
          cellValue.length >= 2 &&
          !cellValue.match(/^\d+$/) &&
          !cellValue.toLowerCase().includes("unit") &&
          !cellValue.toLowerCase().includes("source")
        ) {
          name = cellValue;
        } else if (
          !symbol &&
          cellValue.length <= 20 &&
          cellValue.match(/^[A-Z_0-9]+$/)
        ) {
          symbol = cellValue;
        }
      }
    }

    if (!name) {
      for (let row = 0; row < structure.headerRows; row++) {
        const cell = data[row]?.[colIndex];
        if (cell && typeof cell === "string" && cell.trim().length > 2) {
          const cellValue = cell.trim();
          if (
            !cellValue.toLowerCase().includes("unit") &&
            !cellValue.toLowerCase().includes("source") &&
            !cellValue.match(/^\d+$/) &&
            !cellValue.includes("$")
          ) {
            name = cellValue;
            break;
          }
        }
      }
    }

    if (!name) name = `Commodity_${colIndex}`;

    if (!symbol) {
      const normalized = normalizeHeaderName(name);
      const mapped =
        HEADER_NAME_TO_SYMBOL[normalized] || HEADER_NAME_TO_SYMBOL[name];
      symbol = mapped
        ? mapped
        : normalized
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "_")
            .toUpperCase()
            .substring(0, 20);
    }

    names.push(name);
    units.push(unit);
    symbols.push(symbol);
  }

  return { names, units, symbols };
}

export function parsePinkSheetArrayBuffer(arrayBuffer: ArrayBuffer): WbCommodity[] {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetNames = workbook.SheetNames;
  const preferred = [
    "Monthly Prices",
    "Monthly prices",
    "MONTHLY PRICES",
    "Prices",
    "Data",
    "Sheet1",
  ];

  let targetSheet = null;
  for (const name of preferred) {
    if (sheetNames.includes(name)) {
      targetSheet = workbook.Sheets[name];
      break;
    }
  }
  if (!targetSheet && sheetNames.length > 0) {
    targetSheet = workbook.Sheets[sheetNames[0]];
  }
  if (!targetSheet) throw new Error("No valid sheet found in Excel file");

  const data = XLSX.utils.sheet_to_json(targetSheet, {
    header: 1,
  }) as unknown[][];
  if (data.length < 2) throw new Error("Invalid file: insufficient rows");

  const structure = detectStructure(data);
  const { names, units, symbols } = extractCommodityInfo(data, structure);
  const commodities: WbCommodity[] = [];

  for (let i = 0; i < structure.commodityColumns.length; i++) {
    const colIndex = structure.commodityColumns[i];
    const name = names[i];
    const unit = units[i];
    const symbol = symbols[i];
    if (!name && !symbol) continue;

    const finalSymbol =
      symbol || name.replace(/\s+/g, "_").toUpperCase().substring(0, 20);
    const finalName = name || symbol;
    const category = COMMODITY_CATEGORIES[finalSymbol] || CAT.OTHER;
    const timeSeriesData: { date: string; value: number }[] = [];

    for (let j = structure.dataStartRow; j < data.length; j++) {
      const row = data[j];
      if (!row || row.length <= colIndex) continue;
      const date = row[structure.dateColumn];
      const value = row[colIndex];
      if (
        date &&
        value !== null &&
        value !== undefined &&
        value !== "" &&
        typeof value === "number" &&
        !Number.isNaN(value)
      ) {
        timeSeriesData.push({ date: String(date), value });
      }
    }

    const currentValue =
      timeSeriesData.length > 0
        ? timeSeriesData[timeSeriesData.length - 1]?.value
        : undefined;
    const previousValue =
      timeSeriesData.length > 1
        ? timeSeriesData[timeSeriesData.length - 2]?.value
        : undefined;
    const change =
      currentValue !== undefined && previousValue !== undefined
        ? currentValue - previousValue
        : undefined;
    const changePercent =
      currentValue !== undefined && previousValue
        ? (change! / previousValue) * 100
        : undefined;

    commodities.push({
      id: finalSymbol,
      name: finalName,
      unit: unit || "",
      symbol: finalSymbol,
      category,
      data: timeSeriesData,
      currentValue,
      change,
      changePercent,
    });
  }

  return commodities;
}
