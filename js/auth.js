/**
 * ====================================
 * الحصاد الأحمر - Red Harvest
 * Authentication Module
 * ====================================
 */

// Auth State Observer
if (typeof firebase !== 'undefined') {  // إصلاح: تغيير من !== '' إلى !== 'undefined'
    firebase.auth().onAuthStateChanged(function(user) {
        updateNavAuth(user);
        
        if (user) {
            console.log('✅ User logged in:', user.email);
        } else {
            console.log('ℹ️ No user logged in');
            
            const protectedPages = ['analyze.html', 'dashboard.html', 'history.html'];
            const currentPage = window.location.pathname.split('/').pop();
            
            if (protectedPages.includes(currentPage)) {
                // window.location.href = 'login.html';
            }
        }
    });
}

// باقي الكود كما هو (لم يتغير)
function updateNavAuth(user) {
    const navAuth = document.getElementById('navAuth');
    if (!navAuth) return;
    
    if (user) {
        const displayName = user.displayName || user.email.split('@')[0];
        navAuth.innerHTML = `
            <div class="user-menu">
                <span class="user-name">
                    <i class="fas fa-user-circle"></i>
                    ${displayName}
                </span>
                <button class="btn btn-outline" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i>
                    تسجيل الخروج
                </button>
            </div>
        `;
    } else {
        navAuth.innerHTML = `
            <a href="login.html" class="btn btn-outline">تسجيل الدخول</a>
            <a href="register.html" class="btn btn-primary">إنشاء حساب</a>
        `;
    }
}

// Login
async function login(email, password) {
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.code };
    }
}

// Register
async function register(name, email, password) {
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await user.updateProfile({ displayName: name });

        try {
            if (firebase.firestore) {
                await firebase.firestore().collection('users').doc(user.uid).set({
                    name: name,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (dbError) {
            console.warn('⚠️ Firestore save failed, but user created:', dbError);
        }
        
        return { success: true, user: user };
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, error: error.code };
    }
}

// Logout
async function handleLogout() {
    try {
        await firebase.auth().signOut();
        showToast('success', 'تم تسجيل الخروج بنجاح');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('error', 'حدث خطأ أثناء تسجيل الخروج');
    }
}

// Reset password
async function resetPassword(email) {
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        return { success: true };
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, error: error.code };
    }
}

// Translate error messages
function getErrorMessage(errorCode) {
    const messages = {
        'auth/user-not-found': 'البريد الإلكتروني غير مسجل',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
        'auth/invalid-email': 'البريد الإلكتروني غير صالح',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/too-many-requests': 'تم تجاوز عدد المحاولات، حاول لاحقاً',
        'auth/network-request-failed': 'خطأ في الاتصال بالإنترنت',
        'auth/user-disabled': 'تم تعطيل هذا الحساب'
    };
    return messages[errorCode] || 'حدث خطأ غير متوقع';
}

// Check authentication
function requireAuth() {
    return new Promise((resolve, reject) => {
        const unsubscribe = firebase.auth().onAuthStateChanged(user => {
            unsubscribe();
            if (user) {
                resolve(user);
            } else {
                reject(new Error('يجب تسجيل الدخول'));
            }
        });
    });
}