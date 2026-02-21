/**
 * Security utilities for sanitizing user input
 * Prevents XSS attacks by escaping HTML entities
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - The text to sanitize
 * @returns {string} - Sanitized text safe for rendering
 */
export function escapeHtml(text) {
  if (text == null) return ''
  const StringType = typeof text
  if (StringType !== 'string') {
    return StringType === 'number' ? String(text) : ''
  }
  
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;')
}

/**
 * Sanitize an object's string values recursively
 * Useful for sanitizing API response data before rendering
 * @param {object} obj - Object to sanitize
 * @returns {object} - New object with sanitized strings
 */
export function sanitizeObject(obj) {
  if (obj == null) return obj
  if (typeof obj !== 'object') return obj
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }
  
  const sanitized = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key]
      if (typeof value === 'string') {
        sanitized[key] = escapeHtml(value)
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value)
      } else {
        sanitized[key] = value
      }
    }
  }
  return sanitized
}

/**
 * Sanitize order item display data
 * Handles the qty/quantity inconsistency as well
 * @param {object} item - Order item from database
 * @returns {object} - Sanitized item with correct quantity field
 */
export function sanitizeOrderItem(item) {
  if (!item) return null
  
  return {
    id: escapeHtml(item.id || ''),
    name: escapeHtml(item.name || ''),
    quantity: item.quantity || item.qty || 0,
    price: typeof item.price === 'number' ? item.price : 0
  }
}

/**
 * Sanitize order data for display
 * @param {object} order - Order from database
 * @returns {object} - Sanitized order object
 */
export function sanitizeOrder(order) {
  if (!order) return null
  
  return {
    ...order,
    client_name: escapeHtml(order.client_name || ''),
    client_phone: escapeHtml(order.client_phone || ''),
    items: (order.items || []).map(sanitizeOrderItem),
    observations: escapeHtml(order.observations || ''),
    cancel_reason: escapeHtml(order.cancel_reason || '')
  }
}

/**
 * Validate a Honduran phone number with +504 prefix
 * Required format: +504XXXXXXXX (exactly 12 chars, regex: ^\+504[0-9]{8}$)
 * @param {string} phone - Raw phone number input (may include +504 prefix or just 8 digits)
 * @returns {object} - { isValid, normalized, display, error }
 */
export function validateAndNormalizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, normalized: '', display: '', error: 'Numero de telefono requerido' }
  }

  const trimmed = phone.trim()

  // If already in correct format +504XXXXXXXX
  if (/^\+504[0-9]{8}$/.test(trimmed)) {
    return { isValid: true, normalized: trimmed, display: trimmed, error: null }
  }

  // If has +504 prefix but wrong digit count
  if (trimmed.startsWith('+504')) {
    const digits = trimmed.slice(4).replace(/\D/g, '')
    if (digits.length !== 8) {
      return {
        isValid: false,
        normalized: trimmed,
        display: trimmed,
        error: 'Despues de +504 deben ir exactamente 8 digitos'
      }
    }
    return { isValid: true, normalized: `+504${digits}`, display: `+504${digits}`, error: null }
  }

  // If just 8 digits (no prefix), add +504
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 8) {
    return { isValid: true, normalized: `+504${digits}`, display: `+504${digits}`, error: null }
  }

  // If 11 digits starting with 504 (no +)
  if (digits.length === 11 && digits.startsWith('504')) {
    return { isValid: true, normalized: `+${digits}`, display: `+${digits}`, error: null }
  }

  return {
    isValid: false,
    normalized: phone,
    display: phone,
    error: 'Formato invalido. Ingresa 8 digitos (ej: 95551234). El prefijo +504 se agrega automaticamente.'
  }
}

/**
 * Format phone number for display
 * @param {string} phone - Normalized phone number (+504XXXXXXXX)
 * @returns {string} - Formatted phone string
 */
export function formatPhoneDisplay(phone) {
  if (!phone) return ''
  
  // If in +504XXXXXXXX format, display as +504 XXXX-XXXX
  if (/^\+504[0-9]{8}$/.test(phone)) {
    const local = phone.slice(4)
    return `+504 ${local.slice(0, 4)}-${local.slice(4)}`
  }
  
  return phone
}
