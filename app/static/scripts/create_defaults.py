#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_placeholder(path, text, width=100, height=100, bg_color=(30, 30, 30), text_color=(200, 200, 200)):
    """Create a simple placeholder image with text."""
    # Create a new image with a solid background
    img = Image.new('RGB', (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Calculate text position
    try:
        # Try to load a font if available
        font = ImageFont.truetype("Arial", 14)
    except IOError:
        # Fall back to default font
        font = ImageFont.load_default()
    
    # Calculate text size to center it
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    # Draw text centered on image
    position = ((width - text_width) // 2, (height - text_height) // 2)
    draw.text(position, text, fill=text_color, font=font)
    
    # Draw a border
    draw.rectangle([(0, 0), (width-1, height-1)], outline=(80, 80, 80), width=2)
    
    # Save the image
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")
    print(f"Created placeholder: {path}")

# Create default images
create_placeholder("../images/teams/default.png", "Team Logo", width=100, height=50)
create_placeholder("../images/drivers/default.png", "Driver", width=60, height=60, bg_color=(40, 40, 40)) 