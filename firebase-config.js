// Firebase配置和初始化
async function initializeFirebase() {
    try {
        // 动态导入Firebase模块
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        // Firebase配置 - 用户需要替换为自己的配置
        const firebaseConfig = {
            apiKey: "your-api-key-here",
            authDomain: "your-project.firebaseapp.com",
            projectId: "your-project-id",
            storageBucket: "your-project.appspot.com",
            messagingSenderId: "123456789",
            appId: "your-app-id"
        };

        // 检查配置是否已更新
        if (firebaseConfig.apiKey === "your-api-key-here") {
            console.warn('请在firebase-config.js中配置您的Firebase项目信息');
            showFirebaseConfigWarning();
            return false;
        }

        // 初始化Firebase
        const app = initializeApp(firebaseConfig);
        window.auth = getAuth(app);
        window.db = getFirestore(app);

        console.log('Firebase初始化成功');
        return true;
    } catch (error) {
        console.error('Firebase初始化失败:', error);
        showFirebaseConfigWarning();
        return false;
    }
}

function showFirebaseConfigWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff9800;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    warningDiv.innerHTML = `
        <strong>Firebase配置提醒</strong><br>
        请在firebase-config.js中配置您的Firebase项目信息以启用云端同步功能。<br>
        当前将使用本地存储模式。
        <button onclick="this.parentElement.remove()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            margin-left: 10px;
            cursor: pointer;
        ">关闭</button>
    `;
    
    document.body.appendChild(warningDiv);
    
    // 5秒后自动关闭
    setTimeout(() => {
        if (warningDiv.parentElement) {
            warningDiv.remove();
        }
    }, 5000);
}

// 页面加载时初始化Firebase
document.addEventListener('DOMContentLoaded', async () => {
    await initializeFirebase();
});