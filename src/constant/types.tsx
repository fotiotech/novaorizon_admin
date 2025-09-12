import { CartItem } from "@/app/reducer/cartReducer";

export type Users = {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  status?: string;
  customerInfos?: Customer;
  created_at?: string;
  updated_at?: string;
};

export type Category = {
  _id?: string;
  parent_id?: string;
  url_slug?: string;
  name?: string;
  description?: string;
  imageUrl?: string[];
  attributes?: any[];
  seo_title?: string;
  seo_desc?: string;
  keywords?: string;
  sort_order?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type Brand = {
  _id: string;
  name: string;
  logoUrl?: string;
  status?: "active" | "inactive";
};

interface VariantAttribute {
  _id: string;
  name: string;
  product_id: string;
  values: string[];
}

export type Carrier = {
  _id?: string;
  name: string;
  contact: string;
  email: string;
  regionsServed: { region: string; basePrice: number }[];
  averageDeliveryTime: string;
  costPerKm: number;
  status: "active" | "inactive";
  timestamps?: string;
};

export type Product = {
  _id?: string;
  url_slug?: string; // Unique slug for the product URL
  dsin?: string; // Unique identifier for the product
  sku?: string; // Stock Keeping Unit
  productName: string; // Name of the product
  variantName: string; // Name of the product
  category_id: string; // ID of the category the product belongs to
  brand_id: string | { _id: string; name: string }; // ID or populated brand object
  department: string; // Department the product belongs to
  description?: string; // Description of the product
  basePrice: number; // Base price of the product
  taxRate?: number; // Tax rate (optional, defaults to 0)
  finalPrice: number; // Final price of the product after taxes and discounts
  discount?: { type: "percentage" | "fixed"; value: number } | null; // Discount details (optional)
  currency?: string; // Currency for the price (defaults to "XAF")
  productCode?: string; // Unique Product Code
  stockQuantity: number; // Quantity in stock
  imageUrls: string[]; // Array of image URLs for the product
  attributes?: {
    groupName: string; // Name of the attribute group
    attributes: Record<string, string[]>; // Map of attribute names to string arrays
  }[];
  variants: any[];
  variantAttributes: VariantAttribute[];
  offerId?: string; // Optional ID of an associated offer
  status?: "active" | "inactive"; // Status of the product
  created_at?: string; // Timestamp when the product was created
  updated_at?: string; // Timestamp when the product was last updated
};



export type Shipping = {
  ShippingCost: number;
  orderId: number;
  customerId: number;
  ShippingAddress: string;
  ShippingMethod: string;
  Carrier: string;
  TrackingNumber: number;
  ShipmentDate: string;
  ExpectedDeliveryDate: string;
  ActualDeliveryDate: string;
  Weight: number;
  Dimensions: string;
  ShippingInstructions: string;
  InsuranceAmount: number;
  SignatureRequired: string;
  ReturnTrackingNumber: string;
  CustomsInformation: string;
  PackageContents: string;
  DeliveryConfirmation: string;
  ReturnStatus: string;
  PackagingType: string;
};

export type Inventory = {
  id_product: number;
  sku: string;
  stockQuantity: number;
  stockAvailability: number;
  product_name: string;
  minimumStockLevel: number;
  reorderQuantity: number;
  supplierId: number | string;
  warehouseLocation: string;
  batchNumber: number;
  expiryDate: string;
  dateReceived: string;
  dateLastSold: string;
  costPrice: number;
  sellingPrice: number;
  stockStatus: number;
  reservedStock: number;
  damagedStock: number;
  stockValue: number;
  stockTurnOverRate: number;
  lastCheckDate: string;
};

export type Orders = {
  _id?: string;
  orderNumber: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  products: CartItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
  transactionId: string;
  customerDetails: {
    billingAddress: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
      postalCode?: string;
      preferences?: string[]; // Array to store customer preferences
    };
  };
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingStatus: Date;
  shippingDate: Date;
  deliveryDate: string;
  orderStatus: string;
  notes: string;
  couponCode: string;
  discount: number;
  createdAt: string;
};

export type ProductsFiles = {
  files_id: number;
  productId: number;
  filesUrl: string;
  originalname: string;
  mimetype: string;
  size: string;
};

export type HeroSection = {
  _id?: string;
  title: string;
  description?: string;
  imageUrl?: string[];
  cta_text?: string;
  cta_link: string;
  created_at?: string;
};

export type Customer = {
  _id: string;
  userId: string; // Reference to the User (authenticated user)
  photo: string;
  language: string;
  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    preferences?: string[]; // Array to store customer preferences
  };
  shippingAddress: {
    street: string;
    region: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    carrier: string;
    shippingMethod: string;
  };
  billingMethod?: {
    methodType: string; // e.g., "Credit Card", "PayPal", etc.
    details?: {
      cardNumber?: string;
      expiryDate?: string;
      cardholderName?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
};

export type MonetbilPaymentRequest = {
  serviceKey: string;
  amount: number;
  phone?: string;
  phoneLock?: boolean;
  locale?: string;
  operator?: string;
  country?: string;
  currency?: string;
  itemRef?: string;
  paymentRef?: string;
  user?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  returnUrl?: string;
  notifyUrl?: string;
  logo?: string;
};

// app/types/tag.ts
export interface Tag {
  _id: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive";
}

export type Offer = {
  _id?: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed" | "bogo" | "free_shipping" | "bundle";
  discountValue?: number;
  conditions?: {
    minPurchaseAmount?: number;
    eligibleProducts?: string[];
    startDate: string;
    endDate: string;
  };
  isActive: boolean;
};
