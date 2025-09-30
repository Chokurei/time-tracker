// Firebase配置和初始化
async function initializeFirebase() {
    try {
        // 动态导入Firebase模块
        const { initializeApp, getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        // Firebase配置 - 请替换为您的Firebase项目配置
        // 获取配置步骤：
        // 1. 访问 https://console.firebase.google.com/
        // 2. 创建新项目或选择现有项目
        // 3. 点击"项目设置" > "常规" > "您的应用" > "网络应用"
        // 4. 复制配置对象并替换下面的值
        const firebaseConfig = {
            apiKey: "AIzaSyDBfeHd48RAqmG68g5pqOIAxSpi8kp37Wo",                    // 从Firebase控制台获取
            authDomain: "time-tracker-9ac34.firebaseapp.com",     // 格式：项目ID.firebaseapp.com
            projectId: "time-tracker-9ac34",                   // 您的Firebase项目ID
            storageBucket: "time-tracker-9ac34.appspot.com",      // 格式：项目ID.appspot.com
            messagingSenderId: "1065078932153",                 // 数字ID
            appId: "1:1065078932153:web:0107c591416f57333c9168"                           // 应用ID，格式：1:数字:web:字符串
        };

        // 检查配置是否已更新
        console.log('🔍 检查Firebase配置...');
        console.log('API Key:', firebaseConfig.apiKey);
        console.log('Project ID:', firebaseConfig.projectId);
        console.log('Auth Domain:', firebaseConfig.authDomain);
        console.log('Storage Bucket:', firebaseConfig.storageBucket);
        
        // 详细检查每个配置项
        const isApiKeyValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== "your-api-key-here";
        const isProjectIdValid = firebaseConfig.projectId && firebaseConfig.projectId !== "your-project-id";
        
        console.log('配置验证结果:', {
            apiKeyValid: isApiKeyValid,
            projectIdValid: isProjectIdValid,
            apiKeyLength: firebaseConfig.apiKey ? firebaseConfig.apiKey.length : 0,
            projectIdLength: firebaseConfig.projectId ? firebaseConfig.projectId.length : 0
        });
        
        if (!isApiKeyValid || !isProjectIdValid) {
            console.warn('❌ Firebase配置未更新，请配置您的Firebase项目信息');
            console.warn('详细信息:', {
                apiKey: firebaseConfig.apiKey,
                projectId: firebaseConfig.projectId,
                needsApiKey: !isApiKeyValid,
                needsProjectId: !isProjectIdValid
            });
            showFirebaseConfigWarning();
            return false;
        }

        console.log('✅ Firebase配置检查通过');

        // 调试信息：显示当前配置
        console.log('🔧 Firebase配置信息:', {
            apiKey: firebaseConfig.apiKey.substring(0, 10) + '...',
            authDomain: firebaseConfig.authDomain,
            projectId: firebaseConfig.projectId,
            storageBucket: firebaseConfig.storageBucket
        });

        // 初始化Firebase（检查是否已经初始化）
        console.log('🚀 开始Firebase应用初始化...');
        let app;
        try {
            app = getApp(); // 尝试获取已存在的应用
            console.log('✅ 使用已存在的Firebase应用');
        } catch (error) {
            // 如果应用不存在，则初始化新应用
            console.log('🚀 初始化新的Firebase应用');
            console.log('配置对象:', firebaseConfig);
            app = initializeApp(firebaseConfig);
            console.log('✅ Firebase应用初始化完成');
        }
        
        console.log('🔐 初始化Auth服务...');
        window.auth = getAuth(app);
        console.log('🗄️ 初始化Firestore服务...');
        window.db = getFirestore(app);

        console.log('✅ Firebase初始化成功');
        console.log('🔐 Auth对象:', window.auth ? '已创建' : '创建失败');
        console.log('🗄️ Firestore对象:', window.db ? '已创建' : '创建失败');
        console.log('🎉 所有Firebase服务已准备就绪');
        return true;
    } catch (error) {
        console.error('Firebase初始化失败:', error);
        showFirebaseConfigWarning();
        return false;
    }
}

function showFirebaseConfigWarning() {
    // 调试信息：追踪警告调用来源
    console.error('🚨 showFirebaseConfigWarning被调用！');
    console.error('调用堆栈:', new Error().stack);
    console.error('当前Firebase状态:', {
        auth: !!window.auth,
        db: !!window.db,
        authType: typeof window.auth,
        dbType: typeof window.db
    });
    
    // 移除已存在的警告
    const existingWarning = document.getElementById('firebase-config-warning');
    if (existingWarning) {
        existingWarning.remove();
    }

    const warningDiv = document.createElement('div');
    warningDiv.id = 'firebase-config-warning';
    warningDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #ff6b6b, #ff8e53);
        color: white;
        padding: 20px;
        border-radius: 12px;
        z-index: 1000;
        max-width: 600px;
        text-align: left;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.5;
    `;
    
    warningDiv.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
            <strong style="font-size: 18px;">Firebase配置需要设置</strong>
        </div>
        <div style="margin-bottom: 15px; font-size: 14px;">
            <p style="margin: 5px 0;"><strong>当前状态：</strong>使用本地存储模式（数据仅保存在本设备）</p>
            <p style="margin: 5px 0;"><strong>要启用云端同步，请按以下步骤配置：</strong></p>
            <ol style="margin: 10px 0; padding-left: 20px;">
                <li>访问 <a href="https://console.firebase.google.com/" target="_blank" style="color: #fff; text-decoration: underline;">Firebase控制台</a></li>
                <li>创建新项目或选择现有项目</li>
                <li>启用Authentication和Firestore数据库</li>
                <li>在项目设置中获取Web应用配置</li>
                <li>将配置信息替换到firebase-config.js文件中</li>
            </ol>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button onclick="window.open('https://console.firebase.google.com/', '_blank')" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">打开Firebase控制台</button>
            <button onclick="this.closest('#firebase-config-warning').remove()" style="
                background: rgba(255,255,255,0.9);
                border: none;
                color: #333;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            ">我知道了</button>
        </div>
    `;
    
    document.body.appendChild(warningDiv);
    
    // 10秒后自动关闭
    setTimeout(() => {
        if (warningDiv.parentElement) {
            warningDiv.remove();
        }
    }, 10000);
}

// 页面加载时初始化Firebase
// 使函数全局可用
window.showFirebaseConfigWarning = showFirebaseConfigWarning;

document.addEventListener('DOMContentLoaded', async () => {
    // 清除可能的缓存问题
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
            registration.unregister();
        }
    }
    
    const firebaseInitialized = await initializeFirebase();
    
    // 发出Firebase初始化完成事件
    const event = new CustomEvent('firebaseInitialized', { 
        detail: { success: firebaseInitialized } 
    });
    document.dispatchEvent(event);
    console.log('🎉 Firebase初始化事件已发出:', firebaseInitialized);
});