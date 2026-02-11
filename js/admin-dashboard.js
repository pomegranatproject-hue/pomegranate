/**
 * Admin Dashboard JavaScript
 * Handles video upload for live tours
 */

document.addEventListener('DOMContentLoaded', function() {
    initVideoUpload();
    loadCurrentTour();
});

function initVideoUpload() {
    const videoInput = document.getElementById('videoInput');
    const videoUploadArea = document.getElementById('videoUploadArea');
    const videoUploadPlaceholder = document.getElementById('videoUploadPlaceholder');
    const videoUploadPreview = document.getElementById('videoUploadPreview');
    const previewVideo = document.getElementById('previewVideo');
    const removeVideo = document.getElementById('removeVideo');
    const selectVideoBtn = document.getElementById('selectVideoBtn');
    const uploadVideoBtn = document.getElementById('uploadVideoBtn');

    // Select video button
    selectVideoBtn.addEventListener('click', () => {
        videoInput.click();
    });

    // Video input change
    videoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleVideoSelect(file);
        }
    });

    // Drag and drop
    videoUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        videoUploadArea.classList.add('dragover');
    });

    videoUploadArea.addEventListener('dragleave', () => {
        videoUploadArea.classList.remove('dragover');
    });

    videoUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        videoUploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            handleVideoSelect(file);
        }
    });

    // Remove video
    removeVideo.addEventListener('click', () => {
        videoInput.value = '';
        videoUploadPlaceholder.style.display = 'flex';
        videoUploadPreview.style.display = 'none';
        uploadVideoBtn.disabled = true;
    });

    // Upload video
    uploadVideoBtn.addEventListener('click', uploadVideo);
}

function handleVideoSelect(file) {
    const videoUploadPlaceholder = document.getElementById('videoUploadPlaceholder');
    const videoUploadPreview = document.getElementById('videoUploadPreview');
    const previewVideo = document.getElementById('previewVideo');
    const uploadVideoBtn = document.getElementById('uploadVideoBtn');

    const url = URL.createObjectURL(file);
    previewVideo.src = url;
    videoUploadPlaceholder.style.display = 'none';
    videoUploadPreview.style.display = 'block';
    uploadVideoBtn.disabled = false;
}

async function uploadVideo() {
    const videoInput = document.getElementById('videoInput');
    const file = videoInput.files[0];
    if (!file) return;

    const uploadVideoBtn = document.getElementById('uploadVideoBtn');
    uploadVideoBtn.disabled = true;
    uploadVideoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';

    try {
        // Upload to Firebase Storage
        const storageRef = firebase.storage().ref();
        const videoRef = storageRef.child(`live-tours/${Date.now()}_${file.name}`);
        const snapshot = await videoRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        // Save to Firestore
        const db = firebase.firestore();
        await db.collection('liveTours').doc('current').set({
            url: downloadURL,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            fileName: file.name
        });

        showToast('success', 'تم رفع الفيديو بنجاح!');
        loadCurrentTour();
    } catch (error) {
        console.error('Upload error:', error);
        showToast('error', 'فشل في رفع الفيديو');
    } finally {
        uploadVideoBtn.disabled = false;
        uploadVideoBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> رفع الفيديو';
    }
}

async function loadCurrentTour() {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('liveTours').doc('current').get();
        
        const currentTourContainer = document.getElementById('currentTourContainer');
        
        if (doc.exists) {
            const data = doc.data();
            currentTourContainer.innerHTML = `
                <div class="current-tour-card">
                    <video controls style="width: 100%; max-height: 400px; border-radius: 8px;">
                        <source src="${data.url}" type="video/mp4">
                        متصفحك لا يدعم تشغيل الفيديو.
                    </video>
                    <div class="tour-info" style="margin-top: 1rem;">
                        <p><strong>اسم الملف:</strong> ${data.fileName}</p>
                        <p><strong>تاريخ الرفع:</strong> ${data.uploadedAt ? formatDate(data.uploadedAt) : 'غير محدد'}</p>
                    </div>
                </div>
            `;
        } else {
            currentTourContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-video-slash"></i></div>
                    <h3>لا توجد جولة مباشرة</h3>
                    <p>ارفع فيديو للجولة المباشرة</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load tour error:', error);
        showToast('error', 'فشل في تحميل الجولة المباشرة');
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
