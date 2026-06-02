from .models import CartItem

def cart_processor(request):
    total_qty = 0
    if request.user.is_authenticated:
        cart_items = CartItem.objects.filter(user=request.user)
        total_qty = sum(item.quantity for item in cart_items)
    else:
        session_key = request.session.session_key
        if session_key:
            cart_items = CartItem.objects.filter(session_id=session_key)
            total_qty = sum(item.quantity for item in cart_items)
    return {'cart_count': total_qty}
