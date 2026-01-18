// Simple script to generate icons using Node.js canvas
// Run: node generate-icons.js

const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [16, 48, 128];

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#00d9ff');
  gradient.addColorStop(1, '#a371f7');
  
  // Draw rounded rectangle background
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Draw layers icon
  ctx.strokeStyle = '#0d1117';
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const cx = size / 2;
  const cy = size / 2;
  const w = size * 0.35;
  const h = size * 0.15;
  
  // Top layer
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 1.5);
  ctx.lineTo(cx - w, cy - h * 0.5);
  ctx.lineTo(cx, cy + h * 0.5);
  ctx.lineTo(cx + w, cy - h * 0.5);
  ctx.closePath();
  ctx.stroke();
  
  // Middle layer
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + h * 0.3);
  ctx.lineTo(cx, cy + h * 1.3);
  ctx.lineTo(cx + w, cy + h * 0.3);
  ctx.stroke();
  
  // Bottom layer
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + h * 1.1);
  ctx.lineTo(cx, cy + h * 2.1);
  ctx.lineTo(cx + w, cy + h * 1.1);
  ctx.stroke();
  
  return canvas.toBuffer('image/png');
}

sizes.forEach(size => {
  const buffer = generateIcon(size);
  fs.writeFileSync(`icons/icon${size}.png`, buffer);
  console.log(`Generated icon${size}.png`);
});

console.log('Done!');
