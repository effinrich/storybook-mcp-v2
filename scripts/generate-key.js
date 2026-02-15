#!/usr/bin/env node
/**
 * License Key Generator (PRIVATE - DO NOT PUBLISH)
 * 
 * Usage: node scripts/generate-key.js
 */

function generateKey() {
  // Generate two random 4-char segments
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const randomSegment = () => {
    let result = ''
    for (let i = 0; i < 4; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  }
  
  const seg1 = randomSegment()
  const seg2 = randomSegment()
  
  // Generate checksum
  const data = seg1 + seg2
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data.charCodeAt(i) * (i + 1)
  }
  const checksum = (sum % 1679616).toString(36).toUpperCase().padStart(4, '0').slice(-4)
  
  return `FORGE-PRO-${seg1}-${seg2}-${checksum}`
}

// Generate 5 keys
console.log('Generated License Keys:')
console.log('========================')
for (let i = 0; i < 5; i++) {
  console.log(generateKey())
}
