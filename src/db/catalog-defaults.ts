export interface DefaultCategory {
  name: string;
  slug: string;
  sortOrder: number;
}

export interface DefaultProductTier {
  minQty: number;
  maxQty?: number | null;
  productionPrice?: number;
  unitPrice: number;
}

export interface DefaultProduct {
  categorySlug: string;
  sku: string;
  name: string;
  description: string;
  pricingType: "AREA" | "UNIT" | "CUSTOM";
  unitLabel: string;
  productionPrice: number;
  basePrice: number;
  minArea?: string;
  areaRounding?: "EXACT" | "ROUND_UP_0_5" | "ROUND_UP_1";
  tiers?: DefaultProductTier[];
}

export interface DefaultFinishing {
  name: string;
  chargeType: "FLAT" | "PER_QTY" | "PER_AREA";
  productionPrice: number;
  defaultPrice: number;
  unitLabel: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Banner & Spanduk", slug: "banner-spanduk", sortOrder: 1 },
  { name: "Apparel", slug: "apparel", sortOrder: 2 },
  { name: "Merchandise", slug: "merchandise", sortOrder: 3 },
  { name: "Stiker & Brosur", slug: "stiker-brosur", sortOrder: 4 },
];

export const DEFAULT_PRODUCTS: DefaultProduct[] = [
  // 1. Banner & Spanduk
  {
    categorySlug: "banner-spanduk",
    sku: "BNR-FLX-280",
    name: "Banner Flexi 280gr Standard",
    description: "Spanduk bahan flexi 280gr ekonomis untuk kebutuhan promosi harian indoor maupun outdoor.",
    pricingType: "AREA",
    unitLabel: "m²",
    productionPrice: 20000,
    basePrice: 25000,
    minArea: "1.00",
    areaRounding: "EXACT",
  },
  {
    categorySlug: "banner-spanduk",
    sku: "BNR-KRC-440",
    name: "Banner Flexi Korea (Korcin) 440gr",
    description: "Bahan tebal premium, tahan cuaca dan warna pekat",
    pricingType: "AREA",
    unitLabel: "m²",
    productionPrice: 35000,
    basePrice: 45000,
    minArea: "1.00",
    areaRounding: "EXACT",
  },
  {
    categorySlug: "banner-spanduk",
    sku: "BNR-FLX-340",
    name: "Banner Flexi 340gr Semi-Korcin",
    description: "Bahan spanduk ketebalan menengah 340gr, lebih kuat dan tajam dibanding flexi 280gr standar.",
    pricingType: "AREA",
    unitLabel: "m²",
    productionPrice: 25000,
    basePrice: 32000,
    minArea: "1.00",
    areaRounding: "EXACT",
  },
  {
    categorySlug: "banner-spanduk",
    sku: "BNR-XBN-60160",
    name: "X-Banner 60x160cm (Include Rangka)",
    description: "Paket cetak standing X-Banner ukuran 60x160cm bahan flexi/albatros lengkap dengan rangka fiber.",
    pricingType: "UNIT",
    unitLabel: "set",
    productionPrice: 65000,
    basePrice: 85000,
    tiers: [
      { minQty: 3, maxQty: 9, productionPrice: 60000, unitPrice: 78000 },
      { minQty: 10, maxQty: null, productionPrice: 55000, unitPrice: 70000 },
    ],
  },

  // 2. Stiker & Brosur
  {
    categorySlug: "stiker-brosur",
    sku: "STK-CHR-A3",
    name: "Stiker Chromo A3+ (Print & Kiss Cut)",
    description: "Stiker kertas ekonomis untuk label kemasan makanan dan produk UMKM, termasuk potong kiss-cut.",
    pricingType: "UNIT",
    unitLabel: "lembar",
    productionPrice: 6000,
    basePrice: 8500,
    tiers: [
      { minQty: 10, maxQty: 49, productionPrice: 5000, unitPrice: 7000 },
      { minQty: 50, maxQty: 99, productionPrice: 4000, unitPrice: 6000 },
      { minQty: 100, maxQty: null, productionPrice: 3500, unitPrice: 5000 },
    ],
  },
  {
    categorySlug: "stiker-brosur",
    sku: "STK-VNL-A3",
    name: "Stiker Vinyl A3+ Tahan Air",
    description: "Stiker bahan vinyl anti air dan tidak mudah sobek untuk botol minuman, kosmetik, dan outdoor.",
    pricingType: "UNIT",
    unitLabel: "lembar",
    productionPrice: 12000,
    basePrice: 17000,
    tiers: [
      { minQty: 10, maxQty: 49, productionPrice: 10000, unitPrice: 14000 },
      { minQty: 50, maxQty: 99, productionPrice: 8500, unitPrice: 12000 },
      { minQty: 100, maxQty: null, productionPrice: 7500, unitPrice: 10500 },
    ],
  },
  {
    categorySlug: "stiker-brosur",
    sku: "BRS-AP150-A5",
    name: "Brosur Art Paper 150gr A5",
    description: "Cetak brosur promosi ukuran A5 full color 1 sisi di atas kertas Art Paper 150gr mengilap.",
    pricingType: "UNIT",
    unitLabel: "lembar",
    productionPrice: 1000,
    basePrice: 1500,
    tiers: [
      { minQty: 100, maxQty: 499, productionPrice: 750, unitPrice: 1000 },
      { minQty: 500, maxQty: 999, productionPrice: 500, unitPrice: 700 },
      { minQty: 1000, maxQty: null, productionPrice: 350, unitPrice: 500 },
    ],
  },
  {
    categorySlug: "stiker-brosur",
    sku: "KTN-AC260-100",
    name: "Kartu Nama Art Carton 260gr (Isi 100)",
    description: "Kartu nama tebal 260gr cetak full color 1 sisi, 1 box isi 100 lembar lengkap kotak mika.",
    pricingType: "UNIT",
    unitLabel: "box",
    productionPrice: 25000,
    basePrice: 35000,
    tiers: [
      { minQty: 3, maxQty: 4, productionPrice: 22000, unitPrice: 30000 },
      { minQty: 5, maxQty: 9, productionPrice: 20000, unitPrice: 27500 },
      { minQty: 10, maxQty: null, productionPrice: 18000, unitPrice: 25000 },
    ],
  },

  // 3. Apparel
  {
    categorySlug: "apparel",
    sku: "APP-KOS-30S",
    name: "Kaos Custom Cotton Combed 30s",
    description: "Bahan katun adem sablon DTF full color",
    pricingType: "UNIT",
    unitLabel: "pcs",
    productionPrice: 55000,
    basePrice: 75000,
    tiers: [
      { minQty: 1, maxQty: 11, productionPrice: 55000, unitPrice: 75000 },
      { minQty: 12, maxQty: 49, productionPrice: 50000, unitPrice: 65000 },
      { minQty: 50, maxQty: null, productionPrice: 45000, unitPrice: 60000 },
    ],
  },
  {
    categorySlug: "apparel",
    sku: "APP-JRS-FLP",
    name: "Jersey Printing Sublim Fullprint",
    description: "Bahan drifit milano/brazil cetak sublimasi fullprint",
    pricingType: "UNIT",
    unitLabel: "pcs",
    productionPrice: 85000,
    basePrice: 115000,
    tiers: [
      { minQty: 1, maxQty: 11, productionPrice: 85000, unitPrice: 115000 },
      { minQty: 12, maxQty: 49, productionPrice: 75000, unitPrice: 100000 },
      { minQty: 50, maxQty: null, productionPrice: 68000, unitPrice: 90000 },
    ],
  },

  // 4. Merchandise
  {
    categorySlug: "merchandise",
    sku: "MCH-LNY-2CM",
    name: "Tali Lanyard Tissue 2cm Print 2 Sisi",
    description: "Lanyard cetak sublimasi full color kait logam + stopper",
    pricingType: "UNIT",
    unitLabel: "pcs",
    productionPrice: 12000,
    basePrice: 18000,
    tiers: [
      { minQty: 1, maxQty: 24, productionPrice: 12000, unitPrice: 18000 },
      { minQty: 25, maxQty: 99, productionPrice: 9500, unitPrice: 14000 },
      { minQty: 100, maxQty: null, productionPrice: 7000, unitPrice: 10000 },
    ],
  },
  {
    categorySlug: "merchandise",
    sku: "MCH-IDC-PVC",
    name: "ID Card PVC Print 2 Sisi",
    description: "Kartu identitas bahan PVC tebal standar ATM cetak bolak-balik full color, cocok dipadukan dengan lanyard.",
    pricingType: "UNIT",
    unitLabel: "pcs",
    productionPrice: 6000,
    basePrice: 10000,
    tiers: [
      { minQty: 20, maxQty: 49, productionPrice: 5000, unitPrice: 8000 },
      { minQty: 50, maxQty: 99, productionPrice: 4000, unitPrice: 6500 },
      { minQty: 100, maxQty: null, productionPrice: 3500, unitPrice: 5500 },
    ],
  },
  {
    categorySlug: "merchandise",
    sku: "MCH-MUG-SBL",
    name: "Mug Custom Coating Sublim (Include Box)",
    description: "Mug keramik putih standar SNI cetak full color keliling lengkap dengan dus satuan.",
    pricingType: "UNIT",
    unitLabel: "pcs",
    productionPrice: 18000,
    basePrice: 25000,
    tiers: [
      { minQty: 12, maxQty: 49, productionPrice: 15000, unitPrice: 21000 },
      { minQty: 50, maxQty: 99, productionPrice: 13000, unitPrice: 18000 },
      { minQty: 100, maxQty: null, productionPrice: 11500, unitPrice: 16000 },
    ],
  },
];

export const DEFAULT_FINISHINGS: DefaultFinishing[] = [
  {
    name: "Mata Ayam (Ring Besi)",
    chargeType: "PER_QTY",
    productionPrice: 500,
    defaultPrice: 1000,
    unitLabel: "titik",
  },
  {
    name: "Selongsong / Kolong Kayu",
    chargeType: "PER_AREA",
    productionPrice: 1500,
    defaultPrice: 2500,
    unitLabel: "meter",
  },
  {
    name: "Laminasi Doff / Glossy",
    chargeType: "PER_AREA",
    productionPrice: 5000,
    defaultPrice: 8000,
    unitLabel: "m²",
  },
  {
    name: "Jasa Desain Standar",
    chargeType: "FLAT",
    productionPrice: 0,
    defaultPrice: 20000,
    unitLabel: "file",
  },
  {
    name: "Laminasi Glossy / Doff A3+",
    chargeType: "PER_QTY",
    productionPrice: 2000,
    defaultPrice: 3500,
    unitLabel: "lembar",
  },
];
