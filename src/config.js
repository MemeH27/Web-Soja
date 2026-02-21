/**
 * SOJA App Configuration
 * Centralized configuration for business settings
 */

// Business WhatsApp number (without + prefix for URL)
export const BUSINESS_WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '50433135869'

// Business operating hours
export const BUSINESS_HOURS = {
  open: '10:00',
  close: '20:00',
  timezone: 'America/Tegucigalpa'
}

// Shipping cost configuration
export const SHIPPING_CONFIG = {
  freeThreshold: 500, // L from which shipping is free
  defaultCost: 40 // L standard shipping cost
}

// Delivery area boundaries (Santa Rosa de Copán)
export const DELIVERY_BOUNDS = {
  center: [14.775, -88.779],
  radiusKm: 10
}
