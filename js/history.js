/**
 * ====================================
 * الحصاد الأحمر - Red Harvest
 * History Module
 * ====================================
 */

let allAnalyses = [];
let filteredAnalyses = [];
let currentPage = 1;
const itemsPerPage = 12;

document.addEventListener('DOMContentLoaded', function () {
    initFilters();
    initModal();

    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            showToast('error', 'يجب تسجيل الدخول لعرض السجل');
            return;
        }
        initHistory();
    });
});

async function initHistory() {
    await loadHistory();
}

async function loadHistory() {
    const historyGrid = document.getElementById('historyGrid');
    const emptyState = document.getElementById('emptyState');

    try {
        allAnalyses = await getAnalysisHistory(100);
        filteredAnalyses = [...allAnalyses];

        if (allAnalyses.length === 0) {
            historyGrid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            historyGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            renderHistory();
        }
    } catch (error) {
        console.error('Error loading history:', error);
        showToast('error', 'حدث خطأ في تحميل السجل');
    }
}

function renderHistory() {
    const historyGrid = document.getElementById('historyGrid');
    const loadMore = document.getElementById('loadMore');

    const endIndex = currentPage * itemsPerPage;
    const displayedAnalyses = filteredAnalyses.slice(0, endIndex);

    historyGrid.innerHTML = displayedAnalyses.map(analysis => {
        const result = analysis.result || {};
        const stage = result.dominant || 'unknown';
        const stageAr = result.dominantAr || translateStage(stage);
        const count = result.total || 0;
        const confidence = result.detections && result.detections.length
            ? Math.round(result.detections[0].confidence * 100)
            : 0;

        return `
        <div class="history-card" onclick="openDetail('${analysis.id}')">
            <div class="history-image">
                <img src="${analysis.imageUrl || 'assets/images/placeholder.svg'}" alt="${stageAr}">
            </div>
            <div class="history-content">
                <span class="history-stage" style="background: ${getStageColor(stage)}20; color: ${getStageColor(stage)}">
                    <i class="fas fa-circle"></i>
                    ${stageAr}
                </span>
                <div class="history-meta">
                    <span><i class="fas fa-cubes"></i> ${count}</span>
                    <span><i class="fas fa-bullseye"></i> ${confidence}%</span>
                </div>
                <div class="history-date">
                    <i class="fas fa-clock"></i>
                    ${formatDate(analysis.createdAt)}
                </div>
            </div>
        </div>
        `;
    }).join('');

    if (endIndex < filteredAnalyses.length) {
        loadMore.style.display = 'block';
    } else {
        loadMore.style.display = 'none';
    }
}

function initFilters() {
    const searchInput = document.getElementById('searchInput');
    const stageFilter = document.getElementById('stageFilter');
    const dateFilter = document.getElementById('dateFilter');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (searchInput) searchInput.addEventListener('input', debounce(applyFilters, 300));
    if (stageFilter) stageFilter.addEventListener('change', applyFilters);
    if (dateFilter) dateFilter.addEventListener('change', applyFilters);

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function () {
            currentPage++;
            renderHistory();
        });
    }
}

function applyFilters() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const stageValue = document.getElementById('stageFilter').value;
    const dateValue = document.getElementById('dateFilter').value;

    filteredAnalyses = allAnalyses.filter(analysis => {
        const result = analysis.result || {};
        const stage = result.dominant || '';
        const stageAr = result.dominantAr || '';

        const searchMatch = !searchValue ||
            stageAr.toLowerCase().includes(searchValue) ||
            stage.toLowerCase().includes(searchValue);

        const stageMatch = !stageValue || stage === stageValue;

        let dateMatch = true;
        if (dateValue) {
            const analysisDate = analysis.createdAt instanceof Date 
                ? analysis.createdAt 
                : analysis.createdAt?.toDate?.() || new Date(analysis.createdAt);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (dateValue === 'today') {
                dateMatch = analysisDate >= today;
            } else if (dateValue === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                dateMatch = analysisDate >= weekAgo;
            } else if (dateValue === 'month') {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                dateMatch = analysisDate >= monthAgo;
            }
        }

        return searchMatch && stageMatch && dateMatch;
    });

    currentPage = 1;
    renderHistory();

    const historyGrid = document.getElementById('historyGrid');
    const emptyState = document.getElementById('emptyState');

    if (filteredAnalyses.length === 0) {
        historyGrid.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.querySelector('h3').textContent = 'لا توجد نتائج';
        emptyState.querySelector('p').textContent = 'جرب تغيير معايير البحث';
    } else {
        historyGrid.style.display = 'grid';
        emptyState.style.display = 'none';
    }
}

function initModal() {
    const modal = document.getElementById('detailModal');
    const closeBtn = document.getElementById('closeDetailModal');
    const closeDetail = document.getElementById('closeDetail');
    const deleteBtn = document.getElementById('deleteAnalysis');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeDetail) closeDetail.addEventListener('click', closeModal);
    if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);

    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });
    }
}

function openDetail(analysisId) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('detailModalBody');

    const analysis = allAnalyses.find(a => a.id === analysisId);
    if (!analysis) return;

    window.currentDetailId = analysisId;

    const result = analysis.result || {};
    const stage = result.dominant || 'unknown';
    const stageAr = result.dominantAr || translateStage(stage);
    const count = result.total || 0;
    const confidence = result.detections && result.detections.length
        ? Math.round(result.detections[0].confidence * 100)
        : 0;

    modalBody.innerHTML = `
        <div class="detail-image">
            <img src="${analysis.imageUrl || 'assets/images/placeholder.svg'}" alt="${stageAr}">
        </div>

        <div class="detail-main">
            <span class="history-stage" style="background: ${getStageColor(stage)}; color: white; font-size: 1.25rem;">
                <i class="fas fa-circle"></i>
                ${stageAr}
            </span>
            <span class="stage-en">${stage}</span>
        </div>

        <div class="detail-stats">
            <div class="detail-stat">
                <i class="fas fa-bullseye"></i>
                <span>نسبة الثقة</span>
                <strong>${confidence}%</strong>
            </div>
            <div class="detail-stat">
                <i class="fas fa-cubes"></i>
                <span>عدد الكائنات</span>
                <strong>${count}</strong>
            </div>
            <div class="detail-stat">
                <i class="fas fa-clock"></i>
                <span>التاريخ</span>
                <strong>${formatDate(analysis.createdAt)}</strong>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('active');
    window.currentDetailId = null;
}

async function handleDelete() {
    if (!window.currentDetailId) return;

    if (!confirm('هل أنت متأكد من حذف هذا التحليل؟')) return;

    try {
        await firebase.firestore().collection('analyses').doc(window.currentDetailId).delete();
        allAnalyses = allAnalyses.filter(a => a.id !== window.currentDetailId);
        filteredAnalyses = filteredAnalyses.filter(a => a.id !== window.currentDetailId);
        closeModal();
        renderHistory();
        showToast('success', 'تم حذف التحليل بنجاح');
    } catch (error) {
        console.error(error);
        showToast('error', 'حدث خطأ أثناء الحذف');
    }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}