import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce.settings')
django.setup()

from store.models import Category, Product
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image, ImageDraw

def create_mock_image(title, bg_color, accent_color):
    """Draw a premium-looking geometric digital product card placeholder image using Pillow."""
    # Create 600x600 dark canvas
    img = Image.new('RGB', (600, 600), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw geometric glowing background rings
    for r in range(120, 240, 20):
        draw.ellipse([300 - r, 300 - r, 300 + r, 300 + r], outline=accent_color, width=1)
        
    # Draw a solid center disc
    draw.ellipse([300 - 80, 300 - 80, 300 + 80, 300 + 80], fill='#0f0c1b', outline=accent_color, width=2)
    
    # Draw simple cross-lines
    draw.line([300, 50, 300, 550], fill=accent_color, width=1)
    draw.line([50, 300, 550, 300], fill=accent_color, width=1)
    
    # Draw a bounding border
    draw.rectangle([10, 10, 590, 590], outline=accent_color, width=2)
    
    # Save image to bytes stream
    byte_arr = BytesIO()
    img.save(byte_arr, format='JPEG')
    byte_arr.seek(0)
    
    return ContentFile(byte_arr.read(), name=f"{title.lower().replace(' ', '_')}.jpg")

def seed():
    print("Purging database state...")
    Product.objects.all().delete()
    Category.objects.all().delete()
    User.objects.filter(username__in=['admin', 'customer']).delete()
    
    print("Creating categories...")
    electronics = Category.objects.create(name="Electronics")
    apparel = Category.objects.create(name="Apparel")
    accessories = Category.objects.create(name="Accessories")
    
    products_data = [
        {
            "category": electronics,
            "name": "Quantum X1 Laptop",
            "description": "Ultra-thin high-performance computing beast with a sleek glass body, vibrant OLED display, and next-generation neural processing chips.",
            "price": 1499.99,
            "stock": 8,
            "bg": "#0c081a",
            "accent": "#00f2fe" # Neon Cyan
        },
        {
            "category": electronics,
            "name": "Spectre ANC Headphones",
            "description": "Premium noise-cancelling wireless audio gear featuring spatial surround sound, memory-foam cushions, and dual active-ambient filters.",
            "price": 299.99,
            "stock": 15,
            "bg": "#120e24",
            "accent": "#8a2be2" # Violet
        },
        {
            "category": accessories,
            "name": "Nebula Smart Watch",
            "description": "A futuristic smartwatch with curved holographic display, detailed biometric trackers, sleep mapping, and 14-day quantum-battery life.",
            "price": 199.99,
            "stock": 12,
            "bg": "#0c081a",
            "accent": "#8a2be2"
        },
        {
            "category": apparel,
            "name": "Apex Cyber Hoodie",
            "description": "Waterproof technical streetwear hoodie with reflective cybernetic print patterns, hidden zipper pockets, and dynamic thermal isolation layers.",
            "price": 89.99,
            "stock": 25,
            "bg": "#120e24",
            "accent": "#00f2fe"
        },
        {
            "category": accessories,
            "name": "Aether Tech Backpack",
            "description": "Modular travel pack featuring solar charger panels, secure laptop sleeves, RFID shielded linings, and anti-theft biometric zipper locks.",
            "price": 129.99,
            "stock": 10,
            "bg": "#0c081a",
            "accent": "#00f2fe"
        },
        {
            "category": accessories,
            "name": "Chrono Blue Light Glasses",
            "description": "Ultra-light titanium gaming glasses designed to block high-frequency screen blue light emissions and prevent digital eye strain.",
            "price": 49.99,
            "stock": 30,
            "bg": "#120e24",
            "accent": "#8a2be2"
        }
    ]
    
    print("Creating products with drawn placeholders...")
    for idx, p in enumerate(products_data):
        prod = Product(
            category=p["category"],
            name=p["name"],
            description=p["description"],
            price=p["price"],
            stock=p["stock"]
        )
        # Create physical image file and save
        mock_img = create_mock_image(p["name"], p["bg"], p["accent"])
        prod.image.save(mock_img.name, mock_img, save=True)
        print(f" - Created {prod.name} (Stock: {prod.stock})")

    print("Creating test users...")
    # Customer
    customer = User.objects.create_user(username="customer", email="customer@example.com", password="pass1234")
    customer.first_name = "Jane"
    customer.last_name = "Doe"
    customer.save()
    print(" - Created Customer user: [customer / pass1234]")
    
    # Superuser admin
    admin = User.objects.create_superuser(username="admin", email="admin@example.com", password="admin1234")
    admin.first_name = "Alex"
    admin.last_name = "Smith"
    admin.save()
    print(" - Created Admin superuser: [admin / admin1234]")
    
    print("\nDatabase seeded successfully!")

if __name__ == '__main__':
    seed()
