#!/usr/bin/env python3
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, gray

def create_coordinate_test_pdf():
    """Create a PDF with a coordinate grid for testing."""
    pdf_file = "test_coordinate_grid.pdf"
    c = canvas.Canvas(pdf_file, pagesize=letter)
    width, height = letter  # 612 x 792 points
    
    # Draw grid
    c.setStrokeColor(gray)
    c.setLineWidth(0.5)
    
    # Draw vertical lines every 50 points
    for x in range(0, int(width) + 1, 50):
        c.line(x, 0, x, height)
        if x % 100 == 0:
            c.setFont("Helvetica", 8)
            c.drawString(x + 2, height - 10, str(x))
            c.drawString(x + 2, 10, str(x))
    
    # Draw horizontal lines every 50 points
    for y in range(0, int(height) + 1, 50):
        c.line(0, y, width, y)
        if y % 100 == 0:
            c.setFont("Helvetica", 8)
            c.drawString(5, y + 2, str(y))
            c.drawString(width - 30, y + 2, str(y))
    
    # Draw main axes
    c.setStrokeColor(black)
    c.setLineWidth(1)
    c.line(0, height/2, width, height/2)  # horizontal center
    c.line(width/2, 0, width/2, height)  # vertical center
    
    # Add labels
    c.setFont("Helvetica-Bold", 12)
    c.drawString(250, height - 30, "Coordinate Test Grid")
    c.setFont("Helvetica", 10)
    c.drawString(200, height - 50, "Click to place annotations, then drag to reposition")
    
    # Mark some target areas
    c.setStrokeColor(black)
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 10)
    
    # Target 1: Top-left
    c.circle(100, height - 100, 5, stroke=1, fill=0)
    c.drawString(110, height - 105, "Target A (100, 692)")
    
    # Target 2: Center
    c.circle(width/2, height/2, 5, stroke=1, fill=0)
    c.drawString(width/2 + 10, height/2 - 5, f"Target B ({int(width/2)}, {int(height/2)})")
    
    # Target 3: Bottom-right
    c.circle(width - 100, 100, 5, stroke=1, fill=0)
    c.drawString(width - 200, 95, f"Target C ({int(width - 100)}, 100)")
    
    c.save()
    print(f"Created {pdf_file}")
    return pdf_file

if __name__ == "__main__":
    create_coordinate_test_pdf()