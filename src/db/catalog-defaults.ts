export interface DefaultCategory {
  name: string;
  slug: string;
  sortOrder: number;
}

export interface DefaultProductTier {
  minQty: number;
  maxQty?: number | null;
  unitPrice: number;
}

export interface DefaultProduct {
  categorySlug: string;
  sku: string;
  name: string;
  description: string;
  pricingType: "AREA" | "UNIT" | "CUSTOM";
  unitLabel: string;
  basePrice: number;
  minArea?: string;
  areaRounding?: "EXACT" | "ROUND_UP_0_5" | "ROUND_UP_1";
  tiers?: DefaultProductTier[];
}

export interface DefaultFinishing {
  name: string;
  chargeType: "FLAT" | "PER_QTY" | "PER_AREA";
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
    basePrice: 20000,
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
    basePrice: 35000,
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
    basePrice: 27000,
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
    basePrice: 65000,
    tiers: [
      { minQty: 3, maxQty: 9, unitPrice: 60000 },
      { minQty: 10, maxQty: null, unitPrice: 55000 },
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
    basePrice: 6000,
    tiers: [
      { minQty: 10, maxQty: 49, unitPrice: 5000 },
      { minQty: 50, maxQty: 99, unitPrice: 4000 },
      { minQty: 100, maxQty: null, unitPrice: 3500 },
    ],
  },
  {
    categorySlug: "stiker-brosur",
    sku: "STK-VNL-A3",
    name: "Stiker Vinyl A3+ Tahan Air",
    description: "Stiker bahan vinyl anti air dan tidak mudah sobek untuk botol minuman, kosmetik, dan outdoor.",
    pricingType: "UNIT",
    unitLabel: "lembar",
    basePrice: 12000,
    tiers: [
      { minQty: 10, maxQty: 49, unitPrice: 10000 },
      { minQty: 50, maxQty: 99, unitPrice: 8500 },
      { minQty: 100, maxQty: null, unitPrice: 7500 },
    ],
  },
  {
    categorySlug: "stiker-brosur",
    sku: "BRS-AP150-A5",
    name: "Brosur Art Paper 150gr A5",
    description: "Cetak brosur promosi ukuran A5 full color 1 sisi di atas kertas Art Paper 150gr mengilap.",
    pricingType: "UNIT",
    unitLabel: "lembar",
    basePrice: 1000,
    tiers: [
      { minQty: 100, maxQty: 499, unitPrice: 750 },
      { minQty: 500, maxQty: 999, unitPrice: 500 },
      { minQty: 1000, maxQty: null, unitPrice: 350 },
    ],
  },
  {
    categorySlug: "stiker-brosur",
    sku: "KTN-AC260-100",
    name: "Kartu Nama Art Carton 260gr (Isi 100)",
    description: "Kartu nama tebal 260gr cetak full color 1 sisi, 1 box isi 100 lembar lengkap kotak mika.",
    pricingType: "UNIT",
    unitLabel: "box",
    basePrice: 35000,
    tiers: [
      { minQty: 3, maxQty: 4, unitPrice: 30000 },
      { minQty: 5, maxQty: 9, unitPrice: 27500 },
      { minQty: 10, maxQty: null, unitPrice: 25000 },
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
    basePrice: 65000,
    tiers: [
      { minQty: 1, maxQty: 11, unitPrice: 65000 },
      { minQty: 12, maxQty: 49, unitPrice: 55000 },
      { minQty: 50, maxQty: null, unitPrice: 48000 },
    ],
  },
  {
    categorySlug: "apparel",
    sku: "APP-JRS-FLP",
    name: "Jersey Printing Sublim Fullprint",
    description: "Bahan drifit milano/brazil cetak sublimasi fullprint",
    pricingType: "UNIT",
    unitLabel: "pcs",
    basePrice: 110000,
    tiers: [
      { minQty: 1, maxQty: 11, unitPrice: 110000 },
      { minQty: 12, maxQty: 49, unitPrice: 95000 },
      { minQty: 50, maxQty: null, unitPrice: 85000 },
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
    basePrice: 18000,
    tiers: [
      { minQty: 1, maxQty: 24, unitPrice: 18000 },
      { minQty: 25, maxQty: 99, unitPrice: 14000 },
      { minQty: 100, maxQty: null, unitPrice: 10000 },
    ],
  },
  {
    categorySlug: "merchandise",
    sku: "MCH-IDC-PVC",
    name: "ID Card PVC Print 2 Sisi",
    description: "Kartu identitas bahan PVC tebal standar ATM cetak bolak-balik full color, cocok dipadukan dengan lanyard.",
    pricingType: "UNIT",
    unitLabel: "pcs",
    basePrice: 8000,
    tiers: [
      { minQty: 20, maxQty: 49, unitPrice: 6500 },
      { minQty: 50, maxQty: 99, unitPrice: 5500 },
      { minQty: 100, maxQty: null, unitPrice: 4500 },
    ],
  },
  {
    categorySlug: "merchandise",
    sku: "MCH-MUG-SBL",
    name: "Mug Custom Coating Sublim (Include Box)",
    description: "Mug keramik putih standar SNI cetak full color keliling lengkap dengan dus satuan.",
    pricingType: "UNIT",
    unitLabel: "pcs",
    basePrice: 25000,
    tiers: [
      { minQty: 12, maxQty: 49, unitPrice: 21000 },
      { minQty: 50, maxQty: 99, unitPrice: 18000 },
      { minQty: 100, maxQty: null, unitPrice: 16000 },
    ],
  },
];

export const DEFAULT_FINISHINGS: DefaultFinishing[] = [
  {
    name: "Mata Ayam (Ring Besi)",
    chargeType: "PER_QTY",
    defaultPrice: 1000,
    unitLabel: "titik",
  },
  {
    name: "Selongsong / Kolong Kayu",
    chargeType: "PER_AREA",
    defaultPrice: 2500,
    unitLabel: "meter",
  },
  {
    name: "Laminasi Doff / Glossy",
    chargeType: "PER_AREA",
    defaultPrice: 5000,
    unitLabel: "m²",
  },
  {
    name: "Jasa Desain Standar",
    chargeType: "FLAT",
    defaultPrice: 15000,
    unitLabel: "file",
  },
  // Finishing tambahan harian untuk lembaran A3+
  {
    name: "Laminasi Glossy / Doff A3+",
    chargeType: "PER_QTY",
    defaultPrice: 3000,
    unitLabel: "lembar",
  },
];
