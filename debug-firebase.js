// Firebase调试工具
class FirebaseDebugger {
    constructor() {
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🔍 开始Firebase调试测试...');
        this.clearResults();
        
        await this.testFirebaseConnection();
        await this.testAuthentication();
        await this.testFirestoreConnection();
        await this.testDataOperations();
        
        this.displayResults();
    }

    clearResults() {
        this.testResults = [];
        const resultsEl = document.getElementById('debug-results');
        if (resultsEl) {
            resultsEl.innerHTML = '';
        }
    }

    addResult(test, status, message, details = null) {
        const result = {
            test,
            status,
            message,
            details,
            timestamp: new Date().toLocaleTimeString()
        };
        this.testResults.push(result);
        console.log(`${status === 'success' ? '✅' : '❌'} ${test}: ${message}`);
        if (details) {
            console.log('详细信息:', details);
        }
    }

    async testFirebaseConnection() {
        try {
            if (!window.auth || !window.db) {
                this.addResult('Firebase连接', 'error', 'Firebase服务未初始化', {
                    auth: !!window.auth,
                    db: !!window.db
                });
                return;
            }

            this.addResult('Firebase连接', 'success', 'Firebase服务已正确初始化', {
                auth: !!window.auth,
                db: !!window.db,
                authApp: window.auth.app?.name,
                dbApp: window.db.app?.name
            });
        } catch (error) {
            this.addResult('Firebase连接', 'error', '连接测试失败', error.message);
        }
    }

    async testAuthentication() {
        try {
            const authManager = window.authManager;
            const isAuthenticated = authManager?.isAuthenticated();
            const isGuest = authManager?.isGuest();
            const currentUser = authManager?.getCurrentUser();

            if (isGuest) {
                this.addResult('用户认证', 'success', '游客模式已激活', {
                    mode: '游客模式',
                    note: '数据仅保存在本地'
                });
            } else if (isAuthenticated && window.auth?.currentUser) {
                this.addResult('用户认证', 'success', '用户已登录', { 
                    uid: window.auth.currentUser.uid,
                    email: window.auth.currentUser.email,
                    emailVerified: window.auth.currentUser.emailVerified,
                    mode: '云端同步模式'
                });
            } else if (isAuthenticated && currentUser) {
                this.addResult('用户认证', 'warning', 'AuthManager显示已登录，但Firebase用户不存在', {
                    authManagerUser: !!currentUser,
                    firebaseUser: !!window.auth?.currentUser
                });
            } else {
                this.addResult('用户认证', 'warning', '用户未登录', {
                    suggestion: '请登录或使用游客模式'
                });
            }
        } catch (error) {
            this.addResult('用户认证', 'error', '认证测试失败', error.message);
        }
    }

    async testFirestoreConnection() {
        try {
            if (!window.db) {
                this.addResult('Firestore连接', 'error', 'Firestore服务未初始化');
                return;
            }

            // 尝试获取Firestore设置
            const { enableNetwork, disableNetwork } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // 测试网络连接
            await enableNetwork(window.db);
            this.addResult('Firestore连接', 'success', 'Firestore网络连接正常');
            
        } catch (error) {
            this.addResult('Firestore连接', 'error', 'Firestore连接测试失败', error.message);
        }
    }

    async testDataOperations() {
        try {
            // 检查Firestore服务
            if (!window.db) {
                this.addResult('数据操作', 'error', 'Firestore服务未初始化');
                return;
            }

            // 检查用户认证状态
            const authManager = window.authManager;
            const isAuthenticated = authManager?.isAuthenticated();
            const isGuest = authManager?.isGuest();
            const currentUser = authManager?.getCurrentUser();

            console.log('🔍 认证状态检查:', {
                authManager: !!authManager,
                isAuthenticated,
                isGuest,
                currentUser: !!currentUser,
                firebaseCurrentUser: !!window.auth?.currentUser
            });

            if (!isAuthenticated && !isGuest) {
                this.addResult('数据操作', 'error', '用户未登录', {
                    suggestion: '请先登录或使用游客模式'
                });
                return;
            }

            // 游客模式下跳过云端数据测试
            if (isGuest) {
                this.addResult('数据操作', 'warning', '游客模式：跳过云端数据测试', {
                    note: '游客模式下数据仅保存在本地'
                });
                return;
            }

            // 检查Firebase认证用户
            if (!window.auth?.currentUser) {
                this.addResult('数据操作', 'error', 'Firebase认证用户不存在', {
                    authManagerUser: !!currentUser,
                    firebaseUser: !!window.auth?.currentUser
                });
                return;
            }

            const { collection, addDoc, getDocs, query, where, deleteDoc, doc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const user = window.auth.currentUser;
            const testData = {
                userId: user.uid,
                activity: '测试活动',
                startTime: Timestamp.now(),
                endTime: Timestamp.now(),
                duration: 1000,
                date: new Date().toISOString().split('T')[0],
                isTest: true
            };

            // 测试写入
            console.log('🔄 测试数据写入...');
            const recordsRef = collection(window.db, 'timeRecords');
            try {
                const docRef = await addDoc(recordsRef, testData);
                this.addResult('数据写入', 'success', '测试数据写入成功', { docId: docRef.id });
            } catch (writeError) {
                if (writeError.code === 'permission-denied') {
                    this.addResult('数据写入', 'error', 'Firestore权限被拒绝', {
                        error: writeError.message,
                        code: writeError.code,
                        solution: '需要配置Firestore安全规则，请查看FIREBASE_SETUP.md文件'
                    });
                    return;
                } else {
                    throw writeError;
                }
            }

            // 测试读取
            console.log('🔄 测试数据读取...');
            try {
                const q = query(recordsRef, where('userId', '==', user.uid), where('isTest', '==', true));
                const querySnapshot = await getDocs(q);
                
                let testRecords = [];
                querySnapshot.forEach((doc) => {
                    testRecords.push({ id: doc.id, ...doc.data() });
                });

                this.addResult('数据读取', 'success', `读取到 ${testRecords.length} 条测试记录`, { 
                    recordCount: testRecords.length,
                    records: testRecords.map(r => ({ id: r.id, activity: r.activity }))
                });

                // 清理测试数据
                console.log('🔄 清理测试数据...');
                for (const record of testRecords) {
                    await deleteDoc(doc(window.db, 'timeRecords', record.id));
                }
                this.addResult('数据清理', 'success', '测试数据已清理');
            } catch (readError) {
                if (readError.code === 'permission-denied') {
                    this.addResult('数据读取', 'error', 'Firestore权限被拒绝', {
                        error: readError.message,
                        code: readError.code,
                        solution: '需要配置Firestore安全规则，请查看FIREBASE_SETUP.md文件'
                    });
                } else {
                    throw readError;
                }
            }

        } catch (error) {
            this.addResult('数据操作', 'error', '数据操作测试失败', {
                error: error.message,
                code: error.code,
                solution: error.code === 'permission-denied' ? '请按照FIREBASE_SETUP.md配置Firestore安全规则' : '请检查网络连接和Firebase配置'
            });
        }
    }

    displayResults() {
        const resultsEl = document.getElementById('debug-results');
        if (!resultsEl) return;

        let html = '<h3>🔍 Firebase调试结果</h3>';
        
        this.testResults.forEach(result => {
            const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
            const statusClass = result.status === 'success' ? 'success' : result.status === 'warning' ? 'warning' : 'error';
            
            html += `
                <div class="debug-result ${statusClass}">
                    <div class="debug-header">
                        ${icon} <strong>${result.test}</strong> - ${result.message}
                        <span class="debug-time">${result.timestamp}</span>
                    </div>
                    ${result.details ? `<div class="debug-details"><pre>${JSON.stringify(result.details, null, 2)}</pre></div>` : ''}
                </div>
            `;
        });

        resultsEl.innerHTML = html;
    }

    // 检查用户的所有记录
    async checkUserRecords() {
        try {
            this.clearResults();
            this.addResult('检查记录', 'info', '开始检查用户记录...');

            // 先检查本地记录
            const localRecords = this.checkLocalRecords();
            if (localRecords.length > 0) {
                this.addResult('本地记录', 'success', `找到 ${localRecords.length} 条本地记录`, {
                    records: localRecords.slice(0, 5).map(r => ({
                        activity: r.activity,
                        date: r.date,
                        duration: this.formatDuration(r.duration)
                    })),
                    total: localRecords.length
                });
            } else {
                this.addResult('本地记录', 'info', '未找到本地记录');
            }

            // 检查认证状态
            const authManager = window.authManager;
            const isAuthenticated = authManager?.isAuthenticated();
            const isGuest = authManager?.isGuest();

            if (isGuest) {
                this.addResult('用户状态', 'info', '当前为访客模式，仅显示本地记录');
                this.displayResults();
                return;
            }

            if (!isAuthenticated || !window.auth?.currentUser) {
                this.addResult('用户状态', 'warning', '用户未登录，无法检查云端记录');
                this.displayResults();
                return;
            }

            if (!window.db) {
                this.addResult('检查记录', 'error', 'Firestore服务未初始化');
                return;
            }

            const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const user = window.auth.currentUser;
            const recordsRef = collection(window.db, 'timeRecords');
            const q = query(
                recordsRef,
                where('userId', '==', user.uid)
            );

            console.log('🔍 正在查询用户记录...', { userId: user.uid });
            const querySnapshot = await getDocs(q);
            const records = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                records.push({
                    id: doc.id,
                    activity: data.activity,
                    date: data.date,
                    duration: data.duration,
                    startTime: data.startTime.toDate(),
                    endTime: data.endTime.toDate()
                });
            });

            // 客户端排序：按开始时间降序排列
            records.sort((a, b) => b.startTime - a.startTime);

            console.log(`📊 找到 ${records.length} 条云端记录:`, records);

            if (records.length === 0) {
                this.addResult('云端记录', 'warning', '未找到任何云端记录', {
                    suggestion: '可能的原因：1) 之前的记录在其他账户下 2) 记录被意外删除 3) 权限问题导致无法读取'
                });
                
                // 检查本地记录
                const localRecords = this.checkLocalRecords();
                if (localRecords.length > 0) {
                    this.addResult('本地记录', 'info', `找到 ${localRecords.length} 条本地记录`, {
                        suggestion: '这些记录可能需要重新同步到云端',
                        records: localRecords.slice(0, 3).map(r => ({
                            activity: r.activity,
                            date: r.date,
                            duration: this.formatDuration(r.duration)
                        }))
                    });
                }
            } else {
                this.addResult('云端记录', 'success', `找到 ${records.length} 条云端记录`, {
                    records: records.slice(0, 5).map(r => ({
                        activity: r.activity,
                        date: r.date,
                        duration: this.formatDuration(r.duration),
                        time: r.startTime.toLocaleString('zh-CN')
                    })),
                    total: records.length,
                    dateRange: records.length > 0 ? {
                        latest: records[0].startTime.toLocaleDateString('zh-CN'),
                        earliest: records[records.length - 1].startTime.toLocaleDateString('zh-CN')
                    } : null
                });

                // 触发应用重新加载记录
                if (window.timeTracker && window.timeTracker.loadUserRecords) {
                    console.log('🔄 触发应用重新加载记录...');
                    await window.timeTracker.loadUserRecords();
                    window.timeTracker.renderRecords();
                    this.addResult('记录同步', 'success', '已触发应用重新加载记录');
                }
            }

            this.displayResults();
            
        } catch (error) {
            console.error('❌ 检查用户记录失败:', error);
            this.addResult('检查记录', 'error', '检查记录失败', {
                error: error.message,
                code: error.code
            });
            this.displayResults();
        }
    }

    // 检查本地记录
    checkLocalRecords() {
        try {
            let allRecords = [];
            
            // 检查所有可能的存储键
            const keysToCheck = ['timeTrackerRecords'];
            
            // 如果有用户，也检查用户特定的键
            const user = window.authManager?.getCurrentUser();
            if (user && user.uid) {
                keysToCheck.push(`timeTrackerRecords_${user.uid}`);
            }
            
            // 检查所有localStorage中的timeTracker相关键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('timeTracker') && !keysToCheck.includes(key)) {
                    keysToCheck.push(key);
                }
            }
            
            console.log('🔍 检查本地存储键:', keysToCheck);
            
            for (const key of keysToCheck) {
                const saved = localStorage.getItem(key);
                if (saved) {
                    try {
                        const records = JSON.parse(saved);
                        if (Array.isArray(records) && records.length > 0) {
                            console.log(`📦 从 ${key} 找到 ${records.length} 条记录`);
                            const processedRecords = records.map(record => ({
                                ...record,
                                startTime: new Date(record.startTime),
                                endTime: record.endTime ? new Date(record.endTime) : null,
                                source: key
                            }));
                            allRecords.push(...processedRecords);
                        }
                    } catch (parseError) {
                        console.warn(`解析 ${key} 失败:`, parseError);
                    }
                }
            }
            
            // 按开始时间排序
            allRecords.sort((a, b) => b.startTime - a.startTime);
            
            console.log(`📊 总共找到 ${allRecords.length} 条本地记录`);
            return allRecords;
            
        } catch (e) {
            console.error('检查本地记录失败:', e);
            return [];
        }
    }

    // 格式化时长
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}小时${minutes % 60}分钟`;
        } else if (minutes > 0) {
            return `${minutes}分钟${seconds % 60}秒`;
        } else {
            return `${seconds}秒`;
        }
    }

    // 测试特定用户的记录（保留原有功能）
    async testUserRecords(userId = null) {
        try {
            const user = userId || window.auth?.currentUser;
            if (!user) {
                console.log('❌ 无法测试用户记录：用户未登录');
                return;
            }

            const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const recordsRef = collection(window.db, 'timeRecords');
            const q = query(
                recordsRef,
                where('userId', '==', typeof user === 'string' ? user : user.uid)
            );

            const querySnapshot = await getDocs(q);
            const records = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                records.push({
                    id: doc.id,
                    activity: data.activity,
                    date: data.date,
                    duration: data.duration,
                    startTime: data.startTime.toDate()
                });
            });

            // 客户端排序：按开始时间降序排列
            records.sort((a, b) => b.startTime - a.startTime);

            console.log(`📊 用户 ${typeof user === 'string' ? user : user.uid} 的记录:`, records);
            return records;
            
        } catch (error) {
            console.error('❌ 测试用户记录失败:', error);
            return [];
        }
    }

    // 显示权限帮助信息
    showPermissionHelp() {
        const resultsEl = document.getElementById('debug-results');
        if (!resultsEl) return;

        resultsEl.innerHTML = `
            <div class="permission-help">
                <h3>🚨 权限被拒绝问题解决方案</h3>
                <div class="help-section">
                    <h4>问题原因：</h4>
                    <p>Firestore安全规则配置不正确，阻止了数据的读写操作。</p>
                </div>
                
                <div class="help-section">
                    <h4>解决步骤：</h4>
                    <ol>
                        <li>打开 <a href="https://console.firebase.google.com/" target="_blank">Firebase控制台</a></li>
                        <li>选择项目：<code>tracker-dc404</code></li>
                        <li>点击左侧菜单 <strong>"Firestore Database"</strong></li>
                        <li>点击 <strong>"规则"</strong> 标签页</li>
                        <li>将规则替换为以下内容：</li>
                    </ol>
                </div>

                <div class="help-section">
                    <h4>安全规则代码：</h4>
                    <textarea readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 11px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /timeRecords/{document} {
      allow read, write: if request.auth != null && 
                        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
                   request.auth.uid == request.resource.data.userId;
    }
    
    match /userSettings/{userId} {
      allow read, write: if request.auth != null && 
                        request.auth.uid == userId;
    }
    
    match /userStats/{userId} {
      allow read, write: if request.auth != null && 
                        request.auth.uid == userId;
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}</textarea>
                </div>

                <div class="help-section">
                    <h4>完成后：</h4>
                    <ol>
                        <li>点击 <strong>"发布"</strong> 按钮保存规则</li>
                        <li>刷新此页面</li>
                        <li>重新运行测试验证修复结果</li>
                    </ol>
                </div>

                <div class="help-section" style="background: #e7f3ff; padding: 10px; border-radius: 4px; margin-top: 10px;">
                    <strong>💡 提示：</strong> 这些规则确保只有已登录的用户才能访问自己的数据，提供了安全的数据隔离。
                </div>
            </div>
        `;
    }
}

// 创建全局调试器实例
window.firebaseDebugger = new FirebaseDebugger();

// 添加调试按钮到页面
document.addEventListener('DOMContentLoaded', () => {
    // 等待一段时间确保其他脚本加载完成
    setTimeout(() => {
        addDebugInterface();
    }, 2000);
});

function addDebugInterface() {
    // 检查是否已经添加了调试界面
    if (document.getElementById('debug-panel')) return;

    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.innerHTML = `
        <div style="position: fixed; top: 10px; right: 10px; z-index: 10000; background: white; border: 2px solid #007bff; border-radius: 8px; padding: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); max-width: 350px;">
            <h4 style="margin: 0 0 10px 0; color: #007bff;">🔧 Firebase调试工具</h4>
            <div style="margin-bottom: 10px;">
                <button onclick="window.firebaseDebugger.runAllTests()" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">运行测试</button>
                <button onclick="window.firebaseDebugger.checkUserRecords()" style="background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">检查记录</button>
                <button onclick="window.firebaseDebugger.showPermissionHelp()" style="background: #ffc107; color: black; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">权限帮助</button>
                <button onclick="document.getElementById('debug-panel').style.display='none'" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">关闭</button>
            </div>
            <div id="debug-results" style="margin-top: 10px; max-height: 400px; overflow-y: auto;"></div>
        </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .debug-result {
            margin: 8px 0;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .debug-result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .debug-result.warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        .debug-result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .debug-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .debug-time {
            font-size: 10px;
            opacity: 0.7;
        }
        .debug-details {
            margin-top: 5px;
            font-family: monospace;
            font-size: 10px;
            background: rgba(0,0,0,0.05);
            padding: 5px;
            border-radius: 3px;
        }
        .debug-details pre {
            margin: 0;
            white-space: pre-wrap;
        }
        .permission-help {
            font-size: 12px;
            line-height: 1.4;
        }
        .permission-help h3 {
            margin: 0 0 10px 0;
            color: #dc3545;
            font-size: 14px;
        }
        .permission-help h4 {
            margin: 10px 0 5px 0;
            color: #007bff;
            font-size: 12px;
        }
        .permission-help .help-section {
            margin-bottom: 15px;
        }
        .permission-help ol, .permission-help ul {
            margin: 5px 0;
            padding-left: 20px;
        }
        .permission-help li {
            margin: 3px 0;
        }
        .permission-help code {
            background: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
        }
        .permission-help a {
            color: #007bff;
            text-decoration: none;
        }
        .permission-help a:hover {
            text-decoration: underline;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(debugPanel);
}