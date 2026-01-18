#!/usr/bin/env python3
"""Generate icons for Zargov Chrome extension"""

import struct
import zlib
import os

def create_png(width, height, pixels):
    """Create a PNG file from pixel data"""
    def png_chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk (image data)
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter type: none
        for x in range(width):
            raw_data += pixels[y * width + x]
    
    compressed = zlib.compress(raw_data, 9)
    idat = png_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = png_chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend

def lerp_color(c1, c2, t):
    """Linear interpolation between two colors"""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(4))

def generate_icon(size):
    """Generate an icon of the given size"""
    pixels = []
    
    # Colors
    cyan = (0, 217, 255, 255)
    purple = (163, 113, 247, 255)
    dark = (13, 17, 23, 255)
    transparent = (0, 0, 0, 0)
    
    center = size / 2
    radius = size * 0.45
    corner_radius = size * 0.2
    
    for y in range(size):
        for x in range(size):
            # Check if inside rounded rectangle
            dx = abs(x - center + 0.5)
            dy = abs(y - center + 0.5)
            
            inside = True
            if dx > center - corner_radius and dy > center - corner_radius:
                # Corner region
                cx = center - corner_radius
                cy = center - corner_radius
                dist = ((dx - cx) ** 2 + (dy - cy) ** 2) ** 0.5
                inside = dist <= corner_radius
            elif dx > center or dy > center:
                inside = False
            
            if inside:
                # Gradient from top-left to bottom-right
                t = (x + y) / (2 * size)
                color = lerp_color(cyan, purple, t)
                
                # Draw simple layers pattern
                rel_x = (x - center) / radius
                rel_y = (y - center) / radius
                
                # Create layer lines
                layer_drawn = False
                for layer_offset in [-0.3, 0.1, 0.5]:
                    layer_y = layer_offset
                    # Check if on layer line
                    if abs(rel_y - layer_y) < 0.15:
                        # V shape
                        expected_y = layer_y + abs(rel_x) * 0.3
                        if abs(rel_y - expected_y) < 0.12:
                            color = dark
                            layer_drawn = True
                            break
                
                pixels.append(bytes(color))
            else:
                pixels.append(bytes(transparent))
    
    return create_png(size, size, pixels)

def main():
    os.makedirs('icons', exist_ok=True)
    
    for size in [16, 48, 128]:
        png_data = generate_icon(size)
        filename = f'icons/icon{size}.png'
        with open(filename, 'wb') as f:
            f.write(png_data)
        print(f'Generated {filename}')
    
    print('Done!')

if __name__ == '__main__':
    main()
