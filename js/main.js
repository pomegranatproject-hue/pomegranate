/**
 * ====================================
 * الحصاد الأحمر - Red Harvest
 * Main JavaScript
 * ====================================
 */

document.addEventListener('DOMContentLoaded', function() {
    initNavbar();
    initParticles();
    initMobileMenu();
    initScrollAnimations();
});

function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (!mobileMenuBtn || !navLinks) return;
    
    mobileMenuBtn.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        
        const icon = mobileMenuBtn.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
}

function initParticles() {
    const particlesContainer = document.getElementById('heroParticles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background: linear-gradient(135deg, var(--primary), var(--primary-light));
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            right: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.3 + 0.1};
            animation: particleFloat${(i % 3) + 1} ${Math.random() * 10 + 10}s ease-in-out infinite;
            animation-delay: ${Math.random() * -10}s;
        `;
        particlesContainer.appendChild(particle);
    }
}

function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.stage-card, .feature-item, .dashboard-stat-card, .chart-card').forEach(el => {
        observer.observe(el);
    });
}

function showToast(type, message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    if (type === 'success') {
        icon.className = 'toast-icon fas fa-check-circle';
        toast.className = 'toast success';
    } else if (type === 'error') {
        icon.className = 'toast-icon fas fa-exclamation-circle';
        toast.className = 'toast error';
    } else {
        icon.className = 'toast-icon fas fa-info-circle';
        toast.className = 'toast';
    }
    
    messageEl.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(date) {
    if (!date) return '';
    
    const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
    
    return d.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatNumber(num) {
    return new Intl.NumberFormat('ar-SA').format(num);
}

function getStageColor(stage) {
    const colors = {
        'Bud': '#22c55e',
        'Flower': '#ec4899',
        'Early-growth': '#eab308',
        'Mid-Growth': '#f97316',
        'Maturity': '#dc2626'
    };
    return colors[stage] || '#6b7280';
}

function translateStage(stage) {
    const translations = {
        'Bud': 'برعم',
        'Flower': 'زهرة',
        'Early-growth': 'نمو مبكر',
        'Mid-Growth': 'نمو متوسط',
        'Maturity': 'ناضج'
    };
    return translations[stage] || stage;
}

function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}