/**
 * ====================================
 * الحصاد الأحمر - Red Harvest
 * Dashboard Module
 * ====================================
 */

document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            initDashboard();
        }
    });
});

async function initDashboard() {
    await loadStats();
    initCharts();
    await loadRecentActivity();
}

async function loadStats() {
    try {
        const stats = await getDashboardStats();
        
        animateValue('totalAnalyses', 0, stats.totalAnalyses, 1000);
        animateValue('matureCount', 0, stats.matureCount, 1000);
        document.getElementById('avgConfidence').textContent = stats.avgConfidence + '%';
        animateValue('totalDetections', 0, stats.totalDetections, 1000);
        
        window.dashboardStats = stats;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const range = end - start;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + range * easeOutQuart(progress));
        element.textContent = current.toLocaleString('ar-SA');
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
}

function initCharts() {
    initStagesChart();
    initTimelineChart();
    initConfidenceChart();
}

function initStagesChart() {
    const ctx = document.getElementById('stagesChart');
    if (!ctx) return;
    
    const stats = window.dashboardStats || {
        stageDistribution: {
            'Bud': 15,
            'Flower': 22,
            'Early-growth': 25,
            'Mid-Growth': 20,
            'Maturity': 45
        }
    };
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['برعم', 'زهرة', 'نمو مبكر', 'نمو متوسط', 'ناضج'],
            datasets: [{
                data: Object.values(stats.stageDistribution),
                backgroundColor: ['#22c55e', '#ec4899', '#eab308', '#f97316', '#dc2626'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Cairo' },
                        padding: 15
                    }
                }
            },
            cutout: '60%'
        }
    });
}

function initTimelineChart() {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;
    
    const labels = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const data = [12, 19, 15, 25, 22, 30, 18];
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'التحليلات',
                data: data,
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#dc2626',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { color: '#94a3b8', font: { family: 'Cairo' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { color: '#94a3b8', font: { family: 'Cairo' } }
                }
            }
        }
    });
}

function initConfidenceChart() {
    const ctx = document.getElementById('confidenceChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['برعم', 'زهرة', 'نمو مبكر', 'نمو متوسط', 'ناضج'],
            datasets: [{
                label: 'متوسط الثقة %',
                data: [88, 92, 85, 90, 95],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(234, 179, 8, 0.7)',
                    'rgba(249, 115, 22, 0.7)',
                    'rgba(220, 38, 38, 0.7)'
                ],
                borderColor: ['#22c55e', '#ec4899', '#eab308', '#f97316', '#dc2626'],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Cairo' } }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Cairo' },
                        callback: (value) => value + '%'
                    }
                }
            }
        }
    });
}

async function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    try {
        const analyses = await getAnalysisHistory(5);
        
        if (analyses.length === 0) return;
        
        activityList.innerHTML = analyses.map(analysis => {
            const result = analysis.result || {};
            const stage = result.dominant || 'unknown';
            const stageAr = result.dominantAr || translateStage(stage);
            
            return `
                <div class="activity-item">
                    <div class="activity-image">
                        <img src="${analysis.imageUrl || 'assets/images/placeholder.svg'}" alt="تحليل">
                    </div>
                    <div class="activity-content">
                        <span class="activity-stage" style="background: ${getStageColor(stage)}20; color: ${getStageColor(stage)}">
                            ${stageAr}
                        </span>
                        <span class="activity-meta">
                            <i class="fas fa-cubes"></i> ${result.total || 0} كائنات
                        </span>
                    </div>
                    <span class="activity-time">${formatDate(analysis.createdAt)}</span>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}