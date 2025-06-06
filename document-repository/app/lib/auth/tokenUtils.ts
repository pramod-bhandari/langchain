/**
 * Simple utility functions for generating and validating tokens
 * 
 * Note: For production use, consider using a proper JWT library with proper encryption
 */

import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'temporary-secret-key-for-development';

/**
 * Create a simple encrypted token for sensitive data
 * @param data The data to encode in the token
 * @param expiry Expiry time (e.g., '5m', '1h', '1d')
 * @returns The encrypted token
 */
export function createToken(data: string, expiry: string = '15m'): string {
  try {
    // Convert expiry to milliseconds
    let expiryMs = 15 * 60 * 1000; // Default 15 minutes
    
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    
    if (!isNaN(value)) {
      switch (unit) {
        case 's':
          expiryMs = value * 1000;
          break;
        case 'm':
          expiryMs = value * 60 * 1000;
          break;
        case 'h':
          expiryMs = value * 60 * 60 * 1000;
          break;
        case 'd':
          expiryMs = value * 24 * 60 * 60 * 1000;
          break;
      }
    }
    
    // Create payload with expiry
    const payload = {
      data,
      exp: Date.now() + expiryMs
    };
    
    // Convert payload to string
    const payloadStr = JSON.stringify(payload);
    
    // Simple encryption
    const cipher = crypto.createCipher('aes-256-cbc', SECRET_KEY);
    let encrypted = cipher.update(payloadStr, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  } catch (error) {
    console.error('Error creating token:', error);
    throw new Error('Failed to create token');
  }
}

/**
 * Decode a token and validate it
 * @param token The token to decode
 * @returns The decoded data
 */
export function decodeToken(token: string): string {
  try {
    // Simple decryption
    const decipher = crypto.createDecipher('aes-256-cbc', SECRET_KEY);
    let decrypted = decipher.update(token, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse payload
    const payload = JSON.parse(decrypted);
    
    // Check expiry
    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }
    
    return payload.data;
  } catch (error) {
    console.error('Error decoding token:', error);
    throw new Error('Invalid or expired token');
  }
} 