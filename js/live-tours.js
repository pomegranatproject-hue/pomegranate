/**
 * Live Tours JavaScript
 * Handles displaying live tour videos for customers
 */

document.addEventListener('DOMContentLoaded', function() {
    loadLiveTour();
});

async function loadLiveTour() {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('liveTours').doc('current').get();
        
        const tourVideoWrapper = document.getElementById('tourVideoWrapper');
        const tourInfo = document.getElementById('tourInfo');
        
        if (doc.exists) {
            const data = doc.data();
            tourVideoWrapper.innerHTML = `
                <div class="tour-video-player">
                    <video controls autoplay muted style="width: 100%; max-height: 600px; border-radius: 12px; box-shadow: var(--shadow-lg);">
                        <source src="${data.url}" type="video/mp4">
                        متصفحك لا يدعم تشغيل الفيديو.
                    </video>
                    <div class="video-controls" style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: center;">
                        <button class="btn btn-secondary" onclick="toggleFullscreen()">
                            <i class="fas fa-expand"></i> ملء الشاشة
                        </button>
                        <button class="btn btn-outline" onclick="shareTour('${data.url}')">
                            <i class="fas fa-share"></i> مشاركة
                        </button>
                    </div>
                </div>
            `;
            
            tourInfo.innerHTML = `
                <div class="tour-details">
                    <p><strong>اسم الفيديو:</strong> ${data.fileName || 'جولة مباشرة'}</p>
                    <p><strong>تاريخ الرفع:</strong> ${data.uploadedAt ? formatDate(data.uploadedAt) : 'غير محدد'}</p>
                    <p><strong>الحالة:</strong> <span style="color: #22c55e;">مباشر الآن</span></p>
                </div>
            `;
        } else {
            tourVideoWrapper.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-video-slash"></i></div>
                    <h3>لا توجد جولة مباشرة حالياً</h3>
                    <p>تحقق مرة أخرى لاحقاً لمشاهدة الجولة المباشرة</p>
                </div>
            `;
            
            tourInfo.innerHTML = `
                <p>لا توجد معلومات متاحة حالياً. سيتم عرض تفاصيل الجولة عند توفرها.</p>
            `;
        }
    } catch (error) {
        console.error('Load tour error:', error);
        showToast('error', 'فشل في تحميل الجولة المباشرة');
    }
}

function toggleFullscreen() {
    const video = document.querySelector('.tour-video-player video');
    if (!video) return;
    
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
    }
}

async function shareTour(url) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'جولة مباشرة - الحصاد الأحمر',
                text: 'شاهد جولة مباشرة في مزارع الرمان',
                url: url
            });
        } catch (error) {
            console.log('Share cancelled or failed:', error);
        }
    } else {
        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(url);
            showToast('success', 'تم نسخ رابط الجولة إلى الحافظة');
        } catch (error) {
            console.error('Copy failed:', error);
            showToast('error', 'فشل في نسخ الرابط');
        }
    }
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

function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return d.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
