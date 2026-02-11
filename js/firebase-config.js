/**
 * ====================================
 * الحصاد الأحمر - Red Harvest
 * Firebase Configuration
 * ====================================
 */

const firebaseConfig = {
  apiKey: "AIzaSyCR9ocK9eGHbZHHObQHp4JXDxdh_lYPvOk",
  authDomain: "pomegranatproject-e51c9.firebaseapp.com",
  projectId: "pomegranatproject-e51c9",
  storageBucket: "pomegranatproject-e51c9.firebasestorage.app",
  messagingSenderId: "246817340938",
  appId: "1:246817340938:web:baa6a562b9a7350a9ee9f3",
  measurementId: "G-9L52HWC67G"
};

// Initialize Firebase
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase SDK not loaded. Make sure to include Firebase scripts in HTML.');
} else {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    console.log('✅ Firebase initialized successfully');

    window.firebaseAuth = firebase.auth();
    window.firebaseDb = firebase.firestore();

    if (typeof firebase.storage === 'function') {
        window.firebaseStorage = firebase.storage();
        console.log('✅ Firebase Storage initialized');
    }
}

// Helper Functions
function getCurrentUser() {
    return firebase.auth().currentUser;
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function getUserId() {
    const user = getCurrentUser();
    return user ? user.uid : null;
}

// Save analysis result
async function saveAnalysisResult(result, imageUrl) {
    const userId = getUserId();
    if (!userId) throw new Error('يجب تسجيل الدخول لحفظ النتائج');

    const analysisData = {
        userId: userId,
        imageUrl: imageUrl,
        result: result,
        dominant: result.dominant,
        dominantAr: result.dominantAr,
        confidence: result.detections?.[0]?.confidence || 0,
        count: result.total || 0,
        detections: result.detections || [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await window.firebaseDb.collection('analyses').add(analysisData);
    console.log('✅ Analysis saved with ID:', docRef.id);
    return docRef.id;
}

// Upload image
async function uploadImage(file) {
    const userId = getUserId();
    if (!userId) throw new Error('يجب تسجيل الدخول لرفع الصور');
    if (!window.firebaseStorage) throw new Error('Firebase Storage غير مفعّل');

    const fileName = `analyses/${userId}/${Date.now()}_${file.name || 'image.jpg'}`;
    const storageRef = window.firebaseStorage.ref(fileName);

    const snapshot = await storageRef.put(file);
    const downloadUrl = await snapshot.ref.getDownloadURL();

    console.log('✅ Image uploaded:', downloadUrl);
    return downloadUrl;
}

// Fetch history
async function getAnalysisHistory(limit = 50) {
    const userId = getUserId();
    if (!userId) throw new Error('يجب تسجيل الدخول لعرض السجل');

    const snapshot = await window.firebaseDb.collection('analyses')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    const analyses = [];
    snapshot.forEach(doc => {
        analyses.push({ id: doc.id, ...doc.data() });
    });

    return analyses;
}

// Delete analysis
async function deleteAnalysis(analysisId) {
    const userId = getUserId();
    if (!userId) throw new Error('يجب تسجيل الدخول');

    const docRef = window.firebaseDb.collection('analyses').doc(analysisId);
    const doc = await docRef.get();

    if (!doc.exists) throw new Error('التحليل غير موجود');
    if (doc.data().userId !== userId) throw new Error('غير مصرح لك بحذف هذا التحليل');

    await docRef.delete();
    console.log('✅ Analysis deleted:', analysisId);
}

// Dashboard stats
async function getDashboardStats() {
    const userId = getUserId();
    if (!userId) {
        return {
            totalAnalyses: 0,
            matureCount: 0,
            avgConfidence: 0,
            totalDetections: 0,
            stageDistribution: {}
        };
    }

    const snapshot = await window.firebaseDb.collection('analyses')
        .where('userId', '==', userId)
        .get();

    let totalConfidence = 0;
    let totalDetections = 0;
    let matureCount = 0;

    const stageDistribution = {
        'Bud': 0,
        'Flower': 0,
        'Early-growth': 0,
        'Mid-Growth': 0,
        'Maturity': 0
    };

    snapshot.forEach(doc => {
        const data = doc.data();
        const result = data.result || {};
        totalConfidence += data.confidence || 0;
        totalDetections += data.count || result.total || 0;

        const stage = result.dominant || data.dominant;
        if (stage === 'Maturity') matureCount++;
        if (stageDistribution.hasOwnProperty(stage)) {
            stageDistribution[stage]++;
        }
    });

    const totalAnalyses = snapshot.size;

    return {
        totalAnalyses,
        matureCount,
        avgConfidence: totalAnalyses > 0 ? Math.round(totalConfidence / totalAnalyses * 100) : 0,
        totalDetections,
        stageDistribution
    };
}