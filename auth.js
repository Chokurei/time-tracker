// 用户认证和Firebase集成
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isGuestMode = false;
        this.initializeAuth();
    }

    async initializeAuth() {
        // 等待Firebase初始化
        await this.waitForFirebase();
        
        // 检查Firebase配置状态
        this.updateConfigStatus();
        
        // 监听认证状态变化
        if (window.auth) {
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            onAuthStateChanged(window.auth, (user) => {
                this.handleAuthStateChange(user);
            });
        }
        
        this.setupEventListeners();
    }

    async waitForFirebase() {
        let attempts = 0;
        while (!window.auth && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    setupEventListeners() {
        // 登录表单事件
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('register-btn').addEventListener('click', () => this.showRegisterForm());
        document.getElementById('guest-btn').addEventListener('click', () => this.enterGuestMode());
        
        // 注册表单事件
        document.getElementById('register-submit-btn').addEventListener('click', () => this.register());
        document.getElementById('back-to-login-btn').addEventListener('click', () => this.showLoginForm());
        
        // 登出事件
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // 手动同步事件
        document.getElementById('manual-sync-btn').addEventListener('click', () => {
            if (window.syncManager) {
                window.syncManager.manualSync();
            }
        });
        
        // 回车键登录
        document.getElementById('email').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
    }

    showRegisterForm() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
        this.clearError();
    }

    showLoginForm() {
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
        this.clearError();
    }

    async login() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showError('请输入邮箱和密码');
            return;
        }

        try {
            if (!window.auth) {
                throw new Error('Firebase未初始化');
            }

            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signInWithEmailAndPassword(window.auth, email, password);
            this.clearError();
        } catch (error) {
            console.error('登录失败:', error);
            this.showError(this.getErrorMessage(error));
        }
    }

    async register() {
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm').value;

        if (!email || !password || !confirmPassword) {
            this.showError('请填写所有字段');
            return;
        }

        if (password.length < 6) {
            this.showError('密码至少需要6位');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('两次输入的密码不一致');
            return;
        }

        try {
            if (!window.auth) {
                throw new Error('Firebase未初始化');
            }

            const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await createUserWithEmailAndPassword(window.auth, email, password);
            this.clearError();
        } catch (error) {
            console.error('注册失败:', error);
            this.showError(this.getErrorMessage(error));
        }
    }

    async logout() {
        try {
            if (this.isGuestMode) {
                this.isGuestMode = false;
                this.currentUser = null;
                this.showAuthInterface();
                return;
            }

            if (window.auth) {
                const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                await signOut(window.auth);
            }
        } catch (error) {
            console.error('登出失败:', error);
            this.showError('登出失败，请重试');
        }
    }

    enterGuestMode() {
        this.isGuestMode = true;
        this.currentUser = { uid: 'guest', email: '游客模式' };
        this.showMainApp();
    }

    handleAuthStateChange(user) {
        this.currentUser = user;
        if (user) {
            this.showMainApp();
        } else if (!this.isGuestMode) {
            this.showAuthInterface();
        }
    }

    showAuthInterface() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
        this.clearForms();
    }

    showMainApp() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // 更新用户信息显示
        const userEmail = document.getElementById('user-email');
        if (userEmail) {
            userEmail.textContent = this.currentUser.email || '游客模式';
        }
        
        // 初始化时间记录器
        if (window.timeTracker) {
            window.timeTracker.initializeForUser(this.currentUser);
        }
    }

    clearForms() {
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-confirm').value = '';
        this.clearError();
    }

    showError(message) {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    clearError() {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.classList.add('hidden');
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return '用户不存在，请检查邮箱地址';
            case 'auth/wrong-password':
                return '密码错误，请重试';
            case 'auth/email-already-in-use':
                return '该邮箱已被注册';
            case 'auth/weak-password':
                return '密码强度不够，请使用至少6位字符';
            case 'auth/invalid-email':
                return '邮箱格式不正确';
            case 'auth/too-many-requests':
                return '请求过于频繁，请稍后再试';
            default:
                return error.message || '操作失败，请重试';
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    isGuest() {
        return this.isGuestMode;
    }

    updateConfigStatus() {
        const statusElement = document.getElementById('config-status');
        if (!statusElement) return;

        if (window.auth && window.db) {
            statusElement.innerHTML = `
                <span style="color: #4caf50; font-size: 12px;">
                    ✅ Firebase已配置 - 云端同步可用
                </span>
            `;
        } else {
            statusElement.innerHTML = `
                <span style="color: #ff9800; font-size: 12px;">
                    ⚠️ 本地模式 - <a href="#" onclick="document.getElementById('firebase-config-warning')?.remove(); window.showFirebaseConfigWarning?.(); return false;" style="color: #ff9800; text-decoration: underline;">配置Firebase启用云端同步</a>
                </span>
            `;
        }
    }
}

// 初始化认证管理器
window.authManager = new AuthManager();