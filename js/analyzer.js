/**
 * ====================================
 * الحصاد الأحمر - محلل الصور
 * ربط حقيقي بنموذج YOLO
 * ====================================
 */

const API_URL = 'http://localhost:5000/predict';

let currentImage = null;
let currentImageFile = null;
let cameraStream = null;
let currentResult = null;

// ألوان المراحل
const STAGE_COLORS = {
    'Bud': '#22c55e',
    'Flower': '#ec4899',
    'Early-growth': '#eab308',
    'Mid-Growth': '#f97316',
    'Maturity': '#dc2626',
    'Dry': '#6b7280',
    'not-pomegranate': '#3b82f6'
};

const STAGE_NAMES_AR = {
    'Bud': 'برعم',
    'Flower': 'زهرة',
    'Early-growth': 'نمو مبكر',
    'Mid-Growth': 'نمو متوسط',
    'Maturity': 'ناضج',
    'Dry': 'جاف',
    'not-pomegranate': 'ليس رمان'
};

document.addEventListener('DOMContentLoaded', () => {
    initUploadArea();
    initCameraCapture();
    initAnalyzeButton();
    initResultActions();
});

// ================= رفع الصور =================
function initUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const removeImage = document.getElementById('removeImage');

    if (!uploadArea || !imageInput) return;

    uploadArea.addEventListener('click', (e) => {
        if (!e.target.closest('#removeImage')) imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageSelect(file);
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageSelect(file);
        }
    });

    if (removeImage) {
        removeImage.addEventListener('click', (e) => {
            e.stopPropagation();
            clearImage();
        });
    }
}

async function handleImageSelect(file) {
    currentImageFile = file;
    currentImage = await fileToDataURL(file);

    document.getElementById('previewImage').src = currentImage;
    document.getElementById('uploadPlaceholder').style.display = 'none';
    document.getElementById('uploadPreview').style.display = 'block';
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('resultsSection').style.display = 'none';
}

function clearImage() {
    currentImage = null;
    currentImageFile = null;
    currentResult = null;

    document.getElementById('previewImage').src = '';
    document.getElementById('uploadPlaceholder').style.display = 'flex';
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('imageInput').value = '';
}

// ================= الكاميرا =================
function initCameraCapture() {
    const cameraBtn = document.getElementById('cameraBtn');
    const cameraModal = document.getElementById('cameraModal');
    const closeCameraModal = document.getElementById('closeCameraModal');
    const cancelCamera = document.getElementById('cancelCamera');
    const capturePhoto = document.getElementById('capturePhoto');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');

    if (!cameraBtn) return;

    cameraBtn.addEventListener('click', async () => {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraVideo.srcObject = cameraStream;
            cameraModal.classList.add('active');
        } catch (error) {
            showToast('error', 'لا يمكن الوصول للكاميرا');
        }
    });

    function closeCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraModal.classList.remove('active');
    }

    closeCameraModal.addEventListener('click', closeCamera);
    cancelCamera.addEventListener('click', closeCamera);

    capturePhoto.addEventListener('click', () => {
        cameraCanvas.width = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        cameraCanvas.getContext('2d').drawImage(cameraVideo, 0, 0);

        const imageData = cameraCanvas.toDataURL('image/jpeg', 0.9);
        closeCamera();

        const blob = dataURLtoBlob(imageData);
        handleImageSelect(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
    });
}

// ================= التحليل =================
function initAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', startAnalysis);
}

async function startAnalysis() {
    if (!currentImageFile) {
        showToast('error', 'اختر صورة أولاً');
        return;
    }

    const uploadCard = document.getElementById('uploadCard');
    const analysisProgress = document.getElementById('analysisProgress');
    const progressFill = document.getElementById('progressFill');

    uploadCard.style.display = 'none';
    analysisProgress.style.display = 'block';

    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 10;
        if (progress > 90) progress = 90;
        progressFill.style.width = progress + '%';
    }, 200);

    try {
        const formData = new FormData();
        formData.append('image', currentImageFile);

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('فشل الاتصال بالخادم');

        const result = await response.json();

        clearInterval(progressInterval);
        progressFill.style.width = '100%';

        setTimeout(() => displayResults(result), 300);

    } catch (error) {
        clearInterval(progressInterval);
        showToast('error', error.message || 'حدث خطأ');
        uploadCard.style.display = 'block';
        analysisProgress.style.display = 'none';
    }
}

// ================= عرض النتائج =================
function displayResults(result) {
    currentResult = result;

    document.getElementById('analysisProgress').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';

    document.getElementById('resultsTime').textContent = new Date().toLocaleString('ar-SA');

    drawDetections(result.detections || []);

    const mainStage = result.detections && result.detections[0];
    const dominantStage = result.dominant || (mainStage ? mainStage.stage : 'unknown');

    document.getElementById('stageBadge').style.background = STAGE_COLORS[dominantStage] || '#dc2626';
    document.getElementById('stageNameAr').textContent = result.dominantAr || STAGE_NAMES_AR[dominantStage] || dominantStage;

    document.getElementById('confidenceValue').textContent = mainStage ? Math.round(mainStage.confidence * 100) + '%' : '-';
    document.getElementById('countValue').textContent = result.total || 0;
    document.getElementById('timeValue').textContent = (result.time || 0).toFixed(2) + 's';

    const detectionsItems = document.getElementById('detectionsItems');
    detectionsItems.innerHTML = (result.detections || []).map(det => {
        const stageKey = Object.keys(STAGE_NAMES_AR).find(key => key.toLowerCase() === det.stage.toLowerCase()) || det.stage;
        const stageName = STAGE_NAMES_AR[stageKey] || det.stage;
        const bgColor = STAGE_COLORS[stageKey] || '#fff';
        return `
        <div class="detection-item">
            <span style="color: #000 !important; background: ${bgColor}; padding: 4px 8px; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 14px;">${stageName}</span>
            <span>${Math.round((det.confidence || 0) * 100)}%</span>
        </div>
    `}).join('');

    // Re-attach save button event listener after results are displayed
    initSaveButton();
}

function drawDetections(detections) {
    const canvas = document.getElementById('detectionCanvas');
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        detections.forEach(det => {
            const [x1, y1, x2, y2] = det.bbox;
            const x = x1 * canvas.width;
            const y = y1 * canvas.height;
            const w = (x2 - x1) * canvas.width;
            const h = (y2 - y1) * canvas.height;

            // رسم المربع
            ctx.strokeStyle = STAGE_COLORS[det.stage] || 'red';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);

            // رسم الخلفية للنص
            const label = STAGE_NAMES_AR[det.stage] || det.stage;
            ctx.font = 'bold 16px Cairo, sans-serif';
            const textWidth = ctx.measureText(label).width;
            
            ctx.fillStyle = STAGE_COLORS[det.stage] || 'red';
            ctx.fillRect(x, y - 25, textWidth + 10, 25);
            
            // رسم النص
            ctx.fillStyle = 'white';
            ctx.fillText(label, x + 5, y - 7);
        });
    };
    img.src = currentImage;
}

// ================= الحفظ =================
function initResultActions() {
    document.getElementById('newAnalysisBtn')?.addEventListener('click', () => {
        clearImage();
        document.getElementById('uploadCard').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
    });

    initSaveButton();
}

function initSaveButton() {
    const saveBtn = document.getElementById('saveResultBtn');
    if (saveBtn) {
        // Remove existing listeners to avoid duplicates
        saveBtn.removeEventListener('click', handleSave);
        saveBtn.addEventListener('click', handleSave);
    }
}

async function handleSave() {
    const userId = 'test-user'; // for testing without login

    const timestamp = new Date();
    const canvas = document.getElementById('detectionCanvas');
    const imageData = canvas.toDataURL('image/png');

    try {
        // حفظ محلياً في localStorage للاختبار
        const analysisData = {
            id: `local_${timestamp.getTime()}`,
            userId: userId,
            imageData: imageData, // حفظ الصورة كـ base64
            result: currentResult,
            dominant: currentResult.dominant,
            dominantAr: currentResult.dominantAr,
            confidence: currentResult.detections?.[0]?.confidence || 0,
            count: currentResult.total || 0,
            detections: currentResult.detections || [],
            time: currentResult.time || 0,
            createdAt: timestamp.toISOString()
        };

        console.log('Saving analysis data locally:', analysisData);

        // حفظ في localStorage
        const existingAnalyses = JSON.parse(localStorage.getItem('analyses') || '[]');
        existingAnalyses.unshift(analysisData); // إضافة في البداية
        localStorage.setItem('analyses', JSON.stringify(existingAnalyses));

        console.log('✅ Analysis saved locally with ID:', analysisData.id);

        showToast('success', 'تم حفظ التحليل بنجاح');

    } catch (error) {
        console.error('خطأ في الحفظ:', error);
        showToast('error', 'خطأ في حفظ التحليل: ' + error.message);
    }
}

// ================= أدوات مساعدة =================
function fileToDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}

function showToast(type, message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const icon = toast.querySelector('.toast-icon');
    const msg = toast.querySelector('.toast-message');

    toast.className = 'toast ' + type;
    icon.className = 'toast-icon fas fa-' + (type === 'success' ? 'check-circle' : 'exclamation-circle');
    msg.textContent = message;

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}