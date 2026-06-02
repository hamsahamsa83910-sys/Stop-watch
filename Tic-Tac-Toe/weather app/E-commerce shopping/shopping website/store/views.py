import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Sum, F
from django.views.decorators.http import require_POST

from .models import Category, Product, CartItem, Order, OrderItem

# Helper: Get cart items for active guest or logged-in user
def get_cart_items(request):
    if request.user.is_authenticated:
        return CartItem.objects.filter(user=request.user)
    else:
        if not request.session.session_key:
            request.session.create()
        return CartItem.objects.filter(session_id=request.session.session_key)

# Helper: Merge session cart items into user cart upon login
def merge_cart_on_login(request, user):
    session_key = request.session.session_key
    if not session_key:
        return
    
    session_items = CartItem.objects.filter(session_id=session_key)
    for item in session_items:
        # Check if user already has this product in cart
        user_item = CartItem.objects.filter(user=user, product=item.product).first()
        if user_item:
            user_item.quantity += item.quantity
            user_item.save()
            item.delete()
        else:
            item.user = user
            item.session_id = None
            item.save()

# Home View
def home(request):
    categories = Category.objects.all()
    # Fetch 6 latest products
    featured_products = Product.objects.filter(stock__gt=0).order_by('-created_at')[:6]
    return render(request, 'store/home.html', {
        'categories': categories,
        'featured_products': featured_products
    })

# Product Listing Catalog (with Search & Filtering)
def product_list(request):
    products = Product.objects.all().order_by('-created_at')
    categories = Category.objects.all()
    
    # Search functionality
    query = request.GET.get('q')
    if query:
        products = products.filter(name__icontains=query) | products.filter(description__icontains=query)
        
    # Category filter
    category_slug = request.GET.get('category')
    selected_category = None
    if category_slug:
        selected_category = get_object_or_404(Category, slug=category_slug)
        products = products.filter(category=selected_category)
        
    return render(request, 'store/product_list.html', {
        'products': products,
        'categories': categories,
        'selected_category': selected_category,
        'search_query': query
    })

# Product Details
def product_detail(request, slug):
    product = get_object_or_404(Product, slug=slug)
    # Fetch related products in the same category, excluding current product
    related_products = Product.objects.filter(category=product.category).exclude(id=product.id)[:4]
    return render(request, 'store/product_detail.html', {
        'product': product,
        'related_products': related_products
    })

# Cart View
def cart_view(request):
    cart_items = get_cart_items(request)
    subtotal = sum(item.subtotal for item in cart_items)
    
    # Simple shipping logic: flat $10, free above $100, $0 if empty cart
    shipping = 10.00 if subtotal > 0 and subtotal < 100 else 0.00
    total = float(subtotal) + shipping
    
    return render(request, 'store/cart.html', {
        'cart_items': cart_items,
        'subtotal': subtotal,
        'shipping': shipping,
        'total': total
    })

# Add to Cart (Supports standard GET and AJAX POST)
def add_to_cart(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    quantity = int(request.GET.get('qty', 1))
    
    # Stock check
    if product.stock < quantity:
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': f'Only {product.stock} items left in stock.'})
        messages.error(request, f'Only {product.stock} items left in stock.')
        return redirect('store:product_detail', slug=product.slug)

    # Determine user identity
    user = request.user if request.user.is_authenticated else None
    session_key = None if request.user.is_authenticated else request.session.session_key
    if not request.user.is_authenticated and not session_key:
        request.session.create()
        session_key = request.session.session_key
        
    # Get or create item
    cart_item, created = CartItem.objects.get_or_create(
        product=product,
        user=user,
        session_id=session_key,
        defaults={'quantity': quantity}
    )
    if not created:
        if cart_item.quantity + quantity > product.stock:
            cart_item.quantity = product.stock
            cart_item.save()
            msg = f'Adjusted quantity to max available stock ({product.stock}).'
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True, 'message': msg, 'cart_count': sum(i.quantity for i in get_cart_items(request))})
            messages.warning(request, msg)
            return redirect('store:cart')
        else:
            cart_item.quantity += quantity
            cart_item.save()

    msg = f'"{product.name}" added to cart.'
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'success': True, 'message': msg, 'cart_count': sum(i.quantity for i in get_cart_items(request))})
    
    messages.success(request, msg)
    return redirect('store:cart')

# Update Cart Quantity (AJAX)
@require_POST
def update_cart(request):
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        quantity = int(data.get('quantity'))
    except (ValueError, TypeError, KeyError):
        return JsonResponse({'success': False, 'message': 'Invalid data received.'})
        
    product = get_object_or_404(Product, id=product_id)
    
    if quantity <= 0:
        return JsonResponse({'success': False, 'message': 'Quantity must be at least 1.'})
        
    if product.stock < quantity:
        return JsonResponse({'success': False, 'message': f'Only {product.stock} items available.'})
        
    # Find matching cart item
    if request.user.is_authenticated:
        cart_item = CartItem.objects.filter(user=request.user, product=product).first()
    else:
        cart_item = CartItem.objects.filter(session_id=request.session.session_key, product=product).first()
        
    if not cart_item:
        return JsonResponse({'success': False, 'message': 'Cart item not found.'})
        
    cart_item.quantity = quantity
    cart_item.save()
    
    # Calculate new totals
    cart_items = get_cart_items(request)
    subtotal = float(sum(item.subtotal for item in cart_items))
    shipping = 10.00 if subtotal > 0 and subtotal < 100 else 0.00
    total = subtotal + shipping
    cart_count = sum(item.quantity for item in cart_items)
    
    return JsonResponse({
        'success': True,
        'message': 'Cart updated.',
        'item_subtotal': float(cart_item.subtotal),
        'subtotal': subtotal,
        'shipping': shipping,
        'total': total,
        'cart_count': cart_count
    })

# Remove from Cart
def remove_from_cart(request, item_id):
    if request.user.is_authenticated:
        cart_item = get_object_or_404(CartItem, id=item_id, user=request.user)
    else:
        cart_item = get_object_or_404(CartItem, id=item_id, session_id=request.session.session_key)
        
    name = cart_item.product.name
    cart_item.delete()
    messages.success(request, f'"{name}" removed from cart.')
    return redirect('store:cart')

# Checkout View
def checkout_view(request):
    cart_items = get_cart_items(request)
    if not cart_items:
        messages.warning(request, 'Your cart is empty. Add products before checkout.')
        return redirect('store:product_list')
        
    subtotal = sum(item.subtotal for item in cart_items)
    shipping = 10.00 if subtotal > 0 and subtotal < 100 else 0.00
    total = float(subtotal) + shipping
    
    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        address = request.POST.get('address')
        city = request.POST.get('city')
        zip_code = request.POST.get('zip_code')
        
        # Validations
        if not all([first_name, last_name, email, address, city, zip_code]):
            messages.error(request, 'Please fill in all shipping fields.')
            return redirect('store:checkout')
            
        # Verify stock again
        for item in cart_items:
            if item.product.stock < item.quantity:
                messages.error(request, f'Stock for "{item.product.name}" has run out. Available: {item.product.stock}. Please adjust your cart.')
                return redirect('store:cart')
                
        # Create Order
        user = request.user if request.user.is_authenticated else None
        order = Order.objects.create(
            user=user,
            first_name=first_name,
            last_name=last_name,
            email=email,
            address=address,
            city=city,
            zip_code=zip_code,
            total_price=total,
            status='Pending'
        )
        
        # Create Order Items and decrease product stock
        for item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                price=item.product.price,
                quantity=item.quantity
            )
            item.product.stock -= item.quantity
            item.product.save()
            
        # Clear Cart
        cart_items.delete()
        messages.success(request, 'Thank you! Your order was successfully processed.')
        return redirect('store:order_success', order_id=order.id)
        
    return render(request, 'store/checkout.html', {
        'cart_items': cart_items,
        'subtotal': subtotal,
        'shipping': shipping,
        'total': total
    })

# Order Success
def order_success(request, order_id):
    order = get_object_or_404(Order, id=order_id)
    return render(request, 'store/order_success.html', {'order': order})

# User Auth: Register
def register_view(request):
    if request.user.is_authenticated:
        return redirect('store:dashboard')
        
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        
        if not all([username, email, password, confirm_password]):
            messages.error(request, 'Please complete all required fields.')
            return render(request, 'store/register.html')
            
        if password != confirm_password:
            messages.error(request, 'Passwords do not match.')
            return render(request, 'store/register.html')
            
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username is already taken.')
            return render(request, 'store/register.html')
            
        if User.objects.filter(email=email).exists():
            messages.error(request, 'Email is already registered.')
            return render(request, 'store/register.html')
            
        # Create User
        user = User.objects.create_user(username=username, email=email, password=password)
        messages.success(request, 'Account created successfully! You are now logged in.')
        login(request, user)
        merge_cart_on_login(request, user)
        return redirect('store:dashboard')
        
    return render(request, 'store/register.html')

# User Auth: Login
def login_view(request):
    if request.user.is_authenticated:
        return redirect('store:dashboard')
        
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        if not username or not password:
            messages.error(request, 'Please enter username and password.')
            return render(request, 'store/login.html')
            
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            merge_cart_on_login(request, user)
            messages.success(request, f'Welcome back, {user.username}!')
            
            # Redirect back to cart or checkout if specified
            next_url = request.GET.get('next')
            if next_url:
                return redirect(next_url)
            return redirect('store:dashboard')
        else:
            messages.error(request, 'Invalid username or password.')
            return render(request, 'store/login.html')
            
    return render(request, 'store/login.html')

# User Auth: Logout
def logout_view(request):
    logout(request)
    messages.success(request, 'You have been successfully logged out.')
    return redirect('store:home')

# User Dashboard
@login_required(login_url='store:login')
def user_dashboard(request):
    orders = Order.objects.filter(user=request.user).order_by('-order_date')
    return render(request, 'store/dashboard.html', {
        'orders': orders,
        'user': request.user
    })

# Order Details
@login_required(login_url='store:login')
def order_detail(request, order_id):
    order = get_object_or_404(Order, id=order_id, user=request.user)
    return render(request, 'store/order_detail.html', {'order': order})

# Custom Admin Dashboard (Superusers/Staff only)
@login_required(login_url='store:login')
@user_passes_test(lambda u: u.is_staff or u.is_superuser, login_url='store:home')
def admin_dashboard(request):
    total_sales = Order.objects.exclude(status='Cancelled').aggregate(Sum('total_price'))['total_price__sum'] or 0.00
    total_orders = Order.objects.count()
    total_products = Product.objects.count()
    out_of_stock = Product.objects.filter(stock=0)
    
    orders = Order.objects.all().order_by('-order_date')
    products = Product.objects.all().order_by('name')
    users = User.objects.all().order_by('username')
    
    # Allow filtering orders by status
    status_filter = request.GET.get('status')
    if status_filter:
        orders = orders.filter(status=status_filter)
        
    return render(request, 'store/admin_dashboard.html', {
        'total_sales': total_sales,
        'total_orders': total_orders,
        'total_products': total_products,
        'out_of_stock': out_of_stock,
        'orders': orders,
        'products': products,
        'users': users,
        'status_choices': Order.STATUS_CHOICES
    })

# Update Order Status (Custom Admin Action)
@login_required(login_url='store:login')
@user_passes_test(lambda u: u.is_staff or u.is_superuser, login_url='store:home')
@require_POST
def update_order_status(request, order_id):
    order = get_object_or_404(Order, id=order_id)
    new_status = request.POST.get('status')
    if new_status in dict(Order.STATUS_CHOICES):
        order.status = new_status
        order.save()
        messages.success(request, f'Order #{order.id} status updated to {new_status}.')
    else:
        messages.error(request, 'Invalid status.')
    return redirect('store:admin_dashboard')
