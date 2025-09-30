// 数据同步管理器
class SyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.syncQueue = [];
        this.lastSyncTime = null;
        
        this.setupNetworkListeners();
        this.startPeriodicSync();
    }

    setupNetworkListeners() {
        // 监听网络状态变化
        window.addEventListener('online', async () => {
            console.log('网络已连接');
            this.isOnline = true;
            this.updateNetworkStatus();
            await this.handleOnlineRestore();
            this.triggerSync();
        });

        window.addEventListener('offline', async () => {
            console.log('网络已断开');
            this.isOnline = false;
            this.updateNetworkStatus();
            await this.handleOfflineData();
        });

        // 页面可见性变化时同步
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                this.triggerSync();
            }
        });
    }

    updateNetworkStatus() {
        const statusEl = document.getElementById('network-status');
        if (statusEl) {
            if (this.isOnline) {
                statusEl.textContent = '在线';
                statusEl.className = 'network-status online';
            } else {
                statusEl.textContent = '离线';
                statusEl.className = 'network-status offline';
            }
        }
    }

    async triggerSync() {
        if (!this.isOnline || this.syncInProgress || !window.timeTracker || !window.timeTracker.currentUser) {
            return;
        }

        this.syncInProgress = true;
        
        try {
            // 同步待处理的记录
            await window.timeTracker.syncPendingRecords();
            
            // 从云端拉取最新数据
            await this.pullLatestData();
            
            this.lastSyncTime = new Date();
            this.updateSyncStatus('同步完成');
            
        } catch (error) {
            console.error('同步失败:', error);
            this.updateSyncStatus('同步失败');
        } finally {
            this.syncInProgress = false;
        }
    }

    async pullLatestData() {
        if (!window.timeTracker || !window.timeTracker.currentUser) return;

        try {
            if (!window.db) {
                console.warn('Firestore未初始化，跳过云端同步');
                return;
            }

            const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            console.log('🔄 开始从云端拉取最新数据...');
            
            // 获取所有用户记录，而不是增量更新
            const recordsRef = collection(window.db, 'timeRecords');
            const q = query(
                recordsRef,
                where('userId', '==', window.timeTracker.currentUser.uid)
            );

            const querySnapshot = await getDocs(q);
            const cloudRecords = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                cloudRecords.push({
                    ...data,
                    id: doc.id,
                    startTime: data.startTime.toDate(),
                    endTime: data.endTime.toDate()
                });
            });

            // 客户端排序：按开始时间降序排列
            cloudRecords.sort((a, b) => b.startTime - a.startTime);

            console.log(`📥 从云端获取到 ${cloudRecords.length} 条记录`);
            console.log(`📱 本地当前有 ${window.timeTracker.records.length} 条记录`);

            // 合并云端和本地数据，去重
            const mergedRecords = this.mergeRecords(window.timeTracker.records, cloudRecords);
            
            if (mergedRecords.length !== window.timeTracker.records.length) {
                window.timeTracker.records = mergedRecords;
                window.timeTracker.saveLocalRecords();
                
                // 更新显示
                window.timeTracker.renderTodayStats();
                window.timeTracker.renderRecords();
                window.timeTracker.renderCalendar();
                
                console.log(`✅ 同步完成，现在共有 ${mergedRecords.length} 条记录`);
            } else {
                console.log('📊 数据已是最新，无需更新');
            }

        } catch (error) {
            console.error('❌ 拉取最新数据失败:', error);
        }
    }

    // 合并记录并去重
    mergeRecords(localRecords, cloudRecords) {
        const recordMap = new Map();
        
        // 先添加云端记录（优先级更高）
        cloudRecords.forEach(record => {
            if (record.id) {
                recordMap.set(record.id, record);
            } else {
                // 对于没有ID的记录，使用时间戳作为键
                const key = `${record.startTime.getTime()}_${record.endTime.getTime()}_${record.activity}`;
                recordMap.set(key, record);
            }
        });
        
        // 再添加本地记录（如果不存在的话）
        localRecords.forEach(record => {
            if (record.id && !recordMap.has(record.id)) {
                recordMap.set(record.id, record);
            } else if (!record.id) {
                const key = `${record.startTime.getTime()}_${record.endTime.getTime()}_${record.activity}`;
                if (!recordMap.has(key)) {
                    recordMap.set(key, record);
                }
            }
        });
        
        // 转换为数组并按时间排序
        return Array.from(recordMap.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    }

    updateSyncStatus(message) {
        const statusEl = document.getElementById('sync-status');
        if (statusEl) {
            statusEl.textContent = message;
            
            // 3秒后清除状态
            setTimeout(() => {
                if (statusEl.textContent === message) {
                    statusEl.textContent = '';
                }
            }, 3000);
        }
    }

    startPeriodicSync() {
        // 每5分钟自动同步一次
        setInterval(() => {
            if (this.isOnline && !document.hidden) {
                this.triggerSync();
            }
        }, 5 * 60 * 1000);
    }

    // 手动触发同步
    async manualSync() {
        if (!this.isOnline) {
            this.updateSyncStatus('网络未连接');
            return;
        }

        this.updateSyncStatus('正在同步...');
        await this.triggerSync();
    }

    // 检查是否有待同步的数据
    hasPendingSync() {
        return window.timeTracker && window.timeTracker.pendingSync.length > 0;
    }

    // 获取同步状态信息
    getSyncInfo() {
        return {
            isOnline: this.isOnline,
            syncInProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime,
            pendingCount: this.hasPendingSync() ? window.timeTracker.pendingSync.length : 0
        };
    }

    // 处理数据冲突
    async resolveConflicts(localRecords, remoteRecords) {
        const mergedRecords = [];
        const recordMap = new Map();

        // 首先添加所有远程记录
        remoteRecords.forEach(record => {
            recordMap.set(record.id, record);
        });

        // 处理本地记录
        localRecords.forEach(localRecord => {
            if (localRecord.id && recordMap.has(localRecord.id)) {
                // 记录已存在，检查是否有冲突
                const remoteRecord = recordMap.get(localRecord.id);
                
                // 使用最新的修改时间作为冲突解决策略
                if (localRecord.endTime > remoteRecord.endTime) {
                    recordMap.set(localRecord.id, localRecord);
                }
            } else if (!localRecord.id) {
                // 本地新记录，需要上传
                recordMap.set(`local_${Date.now()}_${Math.random()}`, localRecord);
            }
        });

        return Array.from(recordMap.values()).sort((a, b) => 
            new Date(b.startTime) - new Date(a.startTime)
        );
    }

    // 离线数据管理
    async handleOfflineData() {
        if (!window.timeTracker) return;

        // 保存离线状态标记
        localStorage.setItem('app_offline_mode', 'true');
        localStorage.setItem('last_offline_time', new Date().toISOString());

        // 确保所有数据都保存到本地
        window.timeTracker.saveLocalRecords();
        
        this.updateSyncStatus('离线模式');
    }

    // 恢复在线状态
    async handleOnlineRestore() {
        if (!window.timeTracker) return;

        const wasOffline = localStorage.getItem('app_offline_mode') === 'true';
        
        if (wasOffline) {
            localStorage.removeItem('app_offline_mode');
            localStorage.removeItem('last_offline_time');
            
            this.updateSyncStatus('正在同步离线数据...');
            
            try {
                // 重新加载用户数据并合并冲突
                await this.syncOfflineChanges();
                this.updateSyncStatus('离线数据同步完成');
            } catch (error) {
                console.error('离线数据同步失败:', error);
                this.updateSyncStatus('离线数据同步失败');
            }
        }
    }

    // 同步离线期间的更改
    async syncOfflineChanges() {
        if (!window.timeTracker || !window.timeTracker.currentUser) return;

        try {
            // 获取本地数据
            const localRecords = window.timeTracker.loadLocalRecords();
            
            // 获取云端数据
            await window.timeTracker.loadUserRecords();
            const remoteRecords = window.timeTracker.records;

            // 解决冲突
            const mergedRecords = await this.resolveConflicts(localRecords, remoteRecords);
            
            // 更新本地记录
            window.timeTracker.records = mergedRecords;
            
            // 上传新的本地记录
            for (const record of mergedRecords) {
                if (!record.id && record.startTime) {
                    try {
                        await window.timeTracker.saveRecordToCloud(record);
                    } catch (error) {
                        console.error('上传记录失败:', error);
                        // 添加到待同步队列
                        window.timeTracker.pendingSync.push(record);
                    }
                }
            }

            // 保存合并后的数据
            window.timeTracker.saveLocalRecords();
            
            // 更新显示
            window.timeTracker.renderTodayStats();
            window.timeTracker.renderRecords();
            window.timeTracker.renderCalendar();

        } catch (error) {
            console.error('同步离线更改失败:', error);
            throw error;
        }
    }

    // 检查数据完整性
    validateDataIntegrity() {
        if (!window.timeTracker) return true;

        const records = window.timeTracker.records;
        let isValid = true;

        records.forEach((record, index) => {
            // 检查必要字段
            if (!record.activity || !record.startTime || !record.endTime || !record.duration) {
                console.warn(`记录 ${index} 缺少必要字段:`, record);
                isValid = false;
            }

            // 检查时间逻辑
            if (new Date(record.endTime) <= new Date(record.startTime)) {
                console.warn(`记录 ${index} 时间逻辑错误:`, record);
                isValid = false;
            }

            // 检查持续时间
            const calculatedDuration = new Date(record.endTime) - new Date(record.startTime);
            if (Math.abs(calculatedDuration - record.duration) > 1000) { // 允许1秒误差
                console.warn(`记录 ${index} 持续时间不匹配:`, record);
                // 自动修复
                record.duration = calculatedDuration;
            }
        });

        return isValid;
    }
}

// 初始化同步管理器
window.syncManager = new SyncManager();