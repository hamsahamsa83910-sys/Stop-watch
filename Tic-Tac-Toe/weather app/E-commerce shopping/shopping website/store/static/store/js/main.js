document.addEventListener('DOMContentLoaded', () => {
    // --- Burger Menu Toggle ---
    const burgerMenu = document.getElementById('burger-menu');
    const navLinks = document.getElementById('nav-links');

    if (burgerMenu && navLinks) {
        burgerMenu.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            // Animate burger bars
            const spans = burgerMenu.querySelectorAll('span');
            spans[0].style.transform = navLinks.classList.contains('active') ? 'rotate(45deg) translate(6px, 6px)' : 'none';
            spans[1].style.opacity = navLinks.classList.contains('active') ? '0' : '1';
            spans[2].style.transform = navLinks.classList.contains('active') ? 'rotate(-45deg) translate(5px, -5px)' : 'none';
        });
    }

    // --- Dynamic Toast System ---
    const toastContainer = document.getElementById('toast-container');
    
    window.showToast = function(message, type = 'success') {
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const text = document.createElement('span');
        text.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        });
        
        toast.appendChild(text);
        toast.appendChild(closeBtn);
        toastContainer.appendChild(toast);
        
        // Auto-remove toast after 4 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'fadeOut 0.3s forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    };

    // --- CSRF Token Helper ---
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // --- AJAX Quantity Controls ---
    const qtyContainers = document.querySelectorAll('.qty-control');
    
    qtyContainers.forEach(container => {
        const minusBtn = container.querySelector('.qty-minus');
        const plusBtn = container.querySelector('.qty-plus');
        const input = container.querySelector('.qty-input');
        const productId = container.dataset.productId;
        
        if (minusBtn && plusBtn && input && productId) {
            minusBtn.addEventListener('click', () => {
                let currentVal = parseInt(input.value);
                if (currentVal > 1) {
                    currentVal--;
                    input.value = currentVal;
                    updateCartQuantity(productId, currentVal, input);
                }
            });
            
            plusBtn.addEventListener('click', () => {
                let currentVal = parseInt(input.value);
                currentVal++;
                input.value = currentVal;
                updateCartQuantity(productId, currentVal, input);
            });
            
            input.addEventListener('change', () => {
                let currentVal = parseInt(input.value);
                if (isNaN(currentVal) || currentVal < 1) {
                    currentVal = 1;
                    input.value = 1;
                }
                updateCartQuantity(productId, currentVal, input);
            });
        }
    });

    function updateCartQuantity(productId, newQty, inputElement) {
        const csrfToken = getCookie('csrftoken');
        
        fetch('/cart/update/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: newQty
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update badge in header
                const cartBadges = document.querySelectorAll('.cart-badge');
                cartBadges.forEach(badge => {
                    badge.textContent = data.cart_count;
                });
                
                // Update item-specific subtotal if we are on the cart page
                const itemRow = inputElement.closest('.cart-item-row');
                if (itemRow) {
                    const rowSubtotal = itemRow.querySelector('.cart-item-subtotal');
                    if (rowSubtotal) {
                        rowSubtotal.textContent = `$${data.item_subtotal.toFixed(2)}`;
                    }
                }
                
                // Update cart general totals
                const cartSubtotal = document.getElementById('cart-subtotal');
                const cartShipping = document.getElementById('cart-shipping');
                const cartTotal = document.getElementById('cart-total');
                
                if (cartSubtotal) cartSubtotal.textContent = `$${data.subtotal.toFixed(2)}`;
                if (cartShipping) cartShipping.textContent = data.shipping === 0 ? 'FREE' : `$${data.shipping.toFixed(2)}`;
                if (cartTotal) cartTotal.textContent = `$${data.total.toFixed(2)}`;
                
                window.showToast(data.message, 'success');
            } else {
                // Reset input to original quantity if error
                window.showToast(data.message, 'error');
                // Reload page to sync database state on critical error
                setTimeout(() => location.reload(), 1500);
            }
        })
        .catch(error => {
            console.error('Error updating cart:', error);
            window.showToast('Network error updating cart.', 'error');
        });
    }

    // --- AJAX Add to Cart (From Product Grid) ---
    const ajaxCartButtons = document.querySelectorAll('.ajax-add-to-cart');
    
    ajaxCartButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = btn.dataset.productId;
            const qtyInput = document.getElementById('detail-qty-input');
            const qty = qtyInput ? qtyInput.value : 1;
            
            fetch(`/cart/add/${productId}/?qty=${qty}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update all cart badges
                    const cartBadges = document.querySelectorAll('.cart-badge');
                    cartBadges.forEach(badge => {
                        badge.textContent = data.cart_count;
                        // Add keyframe pop animation
                        badge.style.transform = 'scale(1.3)';
                        setTimeout(() => badge.style.transform = 'scale(1)', 200);
                    });
                    
                    window.showToast(data.message, 'success');
                } else {
                    window.showToast(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error adding to cart:', error);
                window.showToast('Failed to add item to cart.', 'error');
            });
        });
    });
});
