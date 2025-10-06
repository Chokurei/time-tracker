// 时间记录器应用
class TimeTracker {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.currentActivity = null;
        this.timer = null;
        this.records = [];
        // 评论数据与待同步队列
        this.comments = [];
        this.pendingCommentsSync = [];
        // 评论分页状态
        this.commentsPage = 1;
        this.commentsPageSize = 10;
        this.currentMonth = new Date();
        this.currentUser = null;
        this.isOffline = false;
        this.pendingSync = [];
        
        // 活动类型图标映射
        this.activityIcons = {
            'work': 'fas fa-briefcase',
            'study': 'fas fa-book',
            'exercise': 'fas fa-dumbbell',
            'rest': 'fas fa-bed',
            'entertainment': 'fas fa-gamepad',
            'meeting': 'fas fa-users',
            'chores': 'fas fa-home',
            'other': 'fas fa-circle'
        };
        
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
        this.renderCalendar();
        this.renderTodayStats();
        this.initializeDailyChart();
        // 不在构造函数中渲染记录，等待用户登录后再渲染
        this.renderEmptyRecords();
        // 初始渲染空留言区
        this.renderEmptyComments();
    }



    // 为用户初始化数据
    async initializeForUser(user) {
        console.log('🔄 初始化用户数据:', user);
        this.currentUser = user;
        
        // 恢复之前保存的计时状态
        const restored = this.restoreTimerState();
        if (restored) {
            console.log('⏰ 恢复了之前的计时状态');
        }
        
        await this.loadUserRecords();
        console.log('📊 加载完成，记录数量:', this.records.length);
        this.renderRecords();
        this.renderCalendar();
        this.renderDailyChart();
        // 加载并渲染用户留言
        await this.loadUserComments();
        this.renderComments();
        console.log('✅ 用户初始化完成');
    }

    initializeElements() {
        // 计时器元素
        this.currentTimeEl = document.getElementById('currentTime');
        this.currentActivityEl = document.getElementById('currentActivity');
        this.activityTypeEl = document.getElementById('activityType');
        this.customActivityEl = document.getElementById('customActivity');
        
        // 按钮元素
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        
        // 其他元素
        this.todayStatsEl = document.getElementById('todayStats');
        this.calendarEl = document.getElementById('calendar');
        this.recordsListEl = document.getElementById('recordsList');
        this.currentMonthEl = document.getElementById('currentMonth');
        this.prevMonthBtn = document.getElementById('prevMonth');
        this.nextMonthBtn = document.getElementById('nextMonth');
        // 留言元素
        this.commentInputEl = document.getElementById('commentInput');
        this.submitCommentBtn = document.getElementById('submitComment');
        this.commentsListEl = document.getElementById('commentsList');
        this.commentsPaginationEl = document.getElementById('commentsPagination');
        this.commentsPrevEl = document.getElementById('commentsPrev');
        this.commentsNextEl = document.getElementById('commentsNext');
        this.commentsPageInfoEl = document.getElementById('commentsPageInfo');
    }

    bindEvents() {
        // 计时器控制按钮
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());
        
        // 活动类型选择
        this.activityTypeEl.addEventListener('change', () => {
            if (this.activityTypeEl.value === 'other') {
                this.customActivityEl.style.display = 'block';
                this.customActivityEl.focus();
            } else {
                this.customActivityEl.style.display = 'none';
            }
        });
        
        // 日历导航
        this.prevMonthBtn.addEventListener('click', () => this.previousMonth());
        this.nextMonthBtn.addEventListener('click', () => this.nextMonth());
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.start();
                        break;
                    case 'p':
                        e.preventDefault();
                        this.pause();
                        break;
                    case 'q':
                        e.preventDefault();
                        this.stop();
                        break;
                }
            }
        });
        // 留言提交
        if (this.submitCommentBtn) {
            this.submitCommentBtn.addEventListener('click', () => this.handleSubmitComment());
        }

        // 留言分页按钮
        if (this.commentsPrevEl && this.commentsNextEl) {
            this.commentsPrevEl.addEventListener('click', () => this.changeCommentsPage(-1));
            this.commentsNextEl.addEventListener('click', () => this.changeCommentsPage(1));
        }

        // 留言滑动翻页（触摸手势）
        if (this.commentsListEl) {
            let touchStartX = 0;
            let touchEndX = 0;
            this.commentsListEl.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            });
            this.commentsListEl.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                const delta = touchEndX - touchStartX;
                if (Math.abs(delta) > 50) {
                    // 右滑上一页，左滑下一页
                    this.changeCommentsPage(delta > 0 ? -1 : 1);
                }
            });
        }
    }

    start() {
        if (this.isPaused) {
            // 从暂停状态恢复
            this.startTime = Date.now() - this.pausedTime;
            this.isPaused = false;
        } else {
            // 开始新的计时
            this.startTime = Date.now();
            this.pausedTime = 0;
            this.currentActivity = this.getCurrentActivityName();
        }
        
        this.isRunning = true;
        this.updateButtons();
        this.updateCurrentActivity();
        this.startTimer();
        
        // 保存计时状态
        this.saveTimerState();
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            this.pausedTime = Date.now() - this.startTime;
            this.stopTimer();
            this.updateButtons();
            
            // 保存计时状态
            this.saveTimerState();
        }
    }

    async stop() {
        if (this.isRunning) {
            const endTime = new Date();
            const duration = this.isPaused ? this.pausedTime : endTime.getTime() - this.startTime.getTime();
            
            // 保存记录
            await this.saveRecord({
                activity: this.currentActivity,
                startTime: new Date(this.startTime),
                endTime: endTime,
                duration: duration,
                date: endTime.toDateString(),
                dateKey: this.getDateKey(endTime)
            });
            
            // 清除保存的计时状态
            this.clearTimerState();
            
            // 重置状态
            this.reset();
            
            // 更新按钮状态
            this.updateButtons();
            
            // 更新显示
            this.renderTodayStats();
            this.renderRecords();
            this.renderCalendar();
        }
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.currentActivity = null;
        this.stopTimer();
        this.updateButtons();
        this.updateDisplay();
        this.updateCurrentActivity();
        this.renderTodayStats();
        this.renderRecords();
        this.renderCalendar();
        
        // 清除保存的计时状态
        this.clearTimerState();
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.updateDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    updateDisplay() {
        let elapsed = 0;
        
        if (this.isRunning) {
            if (this.isPaused) {
                elapsed = this.pausedTime;
            } else {
                elapsed = Date.now() - this.startTime;
            }
        }
        
        this.currentTimeEl.textContent = this.formatTime(elapsed);
    }

    updateButtons() {
        this.startBtn.disabled = this.isRunning && !this.isPaused;
        this.pauseBtn.disabled = !this.isRunning || this.isPaused;
        this.stopBtn.disabled = !this.isRunning;
        
        // 更新按钮文本
        if (this.isPaused) {
            this.startBtn.innerHTML = '<i class="fas fa-play"></i> 继续';
        } else {
            this.startBtn.innerHTML = '<i class="fas fa-play"></i> 开始';
        }
    }

    updateCurrentActivity() {
        if (this.isRunning) {
            this.currentActivityEl.textContent = `正在记录: ${this.currentActivity}`;
            this.currentActivityEl.style.color = '#4caf50';
        } else {
            this.currentActivityEl.textContent = '未开始记录';
            this.currentActivityEl.style.color = '#666';
        }
    }

    getCurrentActivityName() {
        if (this.activityTypeEl.value === 'other') {
            return this.customActivityEl.value || '其他';
        }
        
        const activityNames = {
            work: '工作',
            study: '学习',
            exercise: '运动',
            rest: '休息',
            entertainment: '娱乐',
            meeting: '会议',
            chores: '杂务',
            other: '其他'
        };
        
        return activityNames[this.activityTypeEl.value] || '未知';
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        } else if (minutes > 0) {
            return `${minutes}分钟`;
        } else {
            return `${seconds}秒`;
        }
    }

    // 保存计时状态到localStorage
    saveTimerState() {
        if (!this.currentUser) return;
        
        const timerState = {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            startTime: this.startTime,
            pausedTime: this.pausedTime,
            currentActivity: this.currentActivity,
            userId: this.currentUser.uid
        };
        
        const key = `timerState_${this.currentUser.uid}`;
        localStorage.setItem(key, JSON.stringify(timerState));
    }

    // 从localStorage恢复计时状态
    restoreTimerState() {
        if (!this.currentUser) return false;
        
        const key = `timerState_${this.currentUser.uid}`;
        const savedState = localStorage.getItem(key);
        
        if (!savedState) return false;
        
        try {
            const timerState = JSON.parse(savedState);
            
            // 验证状态是否属于当前用户
            if (timerState.userId !== this.currentUser.uid) {
                return false;
            }
            
            // 如果之前在运行状态，恢复计时
            if (timerState.isRunning) {
                this.isRunning = timerState.isRunning;
                this.isPaused = timerState.isPaused;
                this.currentActivity = timerState.currentActivity;
                
                if (timerState.isPaused) {
                    // 如果是暂停状态，恢复暂停时间
                    this.pausedTime = timerState.pausedTime;
                    this.startTime = timerState.startTime;
                } else {
                    // 如果是运行状态，重新计算开始时间
                    this.startTime = timerState.startTime;
                    this.pausedTime = 0;
                }
                
                // 更新界面
                this.updateButtons();
                this.updateCurrentActivity();
                this.updateDisplay();
                
                // 如果不是暂停状态，启动计时器
                if (!this.isPaused) {
                    this.startTimer();
                }
                
                return true;
            }
        } catch (error) {
            console.error('恢复计时状态失败:', error);
        }
        
        return false;
    }

    // 清除保存的计时状态
    clearTimerState() {
        if (!this.currentUser) return;
        
        const key = `timerState_${this.currentUser.uid}`;
        localStorage.removeItem(key);
    }

    async saveRecord(record) {
        this.records.push(record);
        await this.saveUserRecords();
        this.renderDailyChart();
    }

    // 加载用户记录
    async loadUserRecords() {
        if (!this.currentUser) {
            this.records = [];
            return;
        }

        // 初始化records数组
        this.records = [];

        try {
            if (window.authManager && window.authManager.isGuest()) {
                // 游客模式使用本地存储
                this.records = this.loadLocalRecords();
                console.log(`游客模式加载了 ${this.records.length} 条本地记录`);
                return;
            }

            if (!window.db) {
                console.warn('Firestore未初始化，使用本地存储');
                this.records = this.loadLocalRecords();
                console.log(`离线模式加载了 ${this.records.length} 条本地记录`);
                return;
            }

            const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const recordsRef = collection(window.db, 'timeRecords');
            const q = query(
                recordsRef, 
                where('userId', '==', this.currentUser.uid)
            );
            
            console.log('正在从云端加载用户记录...');
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const record = {
                    ...data,
                    id: doc.id,
                    startTime: data.startTime.toDate(),
                    endTime: data.endTime.toDate()
                };
                // 统一补充本地日期键
                record.dateKey = record.dateKey || this.getDateKey(record.endTime || record.startTime);
                this.records.push(record);
                console.log('📝 加载记录:', record);
            });

            // 客户端排序：按开始时间降序排列
            this.records.sort((a, b) => b.startTime - a.startTime);

            console.log(`✅ 从云端加载了 ${this.records.length} 条记录`);
            console.log('📊 排序后的记录数组:', this.records);
            this.isOffline = false;
            
            // 同时保存到本地作为备份
            this.saveLocalRecords();
            
        } catch (error) {
            console.error('❌ 加载云端记录失败:', error);
            this.isOffline = true;
            
            // 尝试从本地存储加载
            const localRecords = this.loadLocalRecords();
            this.records = localRecords;
            console.log(`⚠️ 使用本地备份，加载了 ${this.records.length} 条记录`);
        }
    }

    // 保存用户记录
    async saveUserRecords() {
        if (!this.currentUser) return;

        try {
            if (window.authManager && window.authManager.isGuest()) {
                // 游客模式使用本地存储
                this.saveLocalRecords();
                return;
            }

            if (!window.db) {
                console.warn('Firestore未初始化，保存到本地');
                this.saveLocalRecords();
                this.addToPendingSync();
                return;
            }

            // 保存最新的记录到云端
            const latestRecord = this.records[this.records.length - 1];
            if (latestRecord && !latestRecord.id) {
                await this.saveRecordToCloud(latestRecord);
            }

            // 同时保存到本地作为备份
            this.saveLocalRecords();
            this.isOffline = false;
            
        } catch (error) {
            console.error('保存云端记录失败:', error);
            this.isOffline = true;
            this.saveLocalRecords();
            this.addToPendingSync();
        }
    }

    // 保存单条记录到云端
    async saveRecordToCloud(record) {
        if (!window.db || !this.currentUser) return;

        try {
            const { collection, addDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const recordData = {
                userId: this.currentUser.uid,
                activity: record.activity,
                startTime: Timestamp.fromDate(record.startTime),
                endTime: Timestamp.fromDate(record.endTime),
                duration: record.duration,
                date: record.date,
                dateKey: record.dateKey,
                createdAt: Timestamp.now()
            };
            
            const recordsRef = collection(window.db, 'timeRecords');
            const docRef = await addDoc(recordsRef, recordData);
            // 将云端生成的ID写回本地记录，避免后续同步时出现重复
            record.id = docRef.id;
            console.log('记录已保存到云端，文档ID:', docRef.id);
        } catch (error) {
            console.error('保存记录到云端失败:', error);
            throw error;
        }
    }

    // 本地存储方法
    loadLocalRecords() {
        try {
            const key = this.currentUser ? `timeTrackerRecords_${this.currentUser.uid}` : 'timeTrackerRecords';
            const saved = localStorage.getItem(key);
            const records = saved ? JSON.parse(saved) : [];

            // 转换日期字符串为Date对象并去重
            const map = new Map();
            for (const r of records) {
                const normalized = {
                    ...r,
                    startTime: new Date(r.startTime),
                    endTime: new Date(r.endTime),
                    dateKey: r.dateKey || this.getDateKey(r.endTime || r.startTime)
                };
                const keyStr = normalized.id || `${normalized.activity}|${normalized.startTime.getTime()}|${normalized.endTime.getTime()}`;
                const existing = map.get(keyStr);
                if (!existing) {
                    map.set(keyStr, normalized);
                } else {
                    const preferCloud = !!normalized.id && !existing.id;
                    const preferNewer = normalized.endTime > existing.endTime;
                    if (preferCloud || preferNewer) {
                        map.set(keyStr, normalized);
                    }
                }
            }
            return Array.from(map.values());
        } catch (e) {
            console.error('加载本地记录失败:', e);
            return [];
        }
    }

    saveLocalRecords() {
        try {
            const key = this.currentUser ? `timeTrackerRecords_${this.currentUser.uid}` : 'timeTrackerRecords';
            localStorage.setItem(key, JSON.stringify(this.records));
        } catch (e) {
            console.error('保存本地记录失败:', e);
        }
    }

    // 添加到待同步队列
    addToPendingSync() {
        const latestRecord = this.records[this.records.length - 1];
        if (latestRecord && !latestRecord.id) {
            this.pendingSync.push(latestRecord);
        }
    }

    // 同步待处理的记录
    async syncPendingRecords() {
        if (this.pendingSync.length === 0 || !window.db || !this.currentUser) return;

        try {
            for (const record of this.pendingSync) {
                await this.saveRecordToCloud(record);
            }
            this.pendingSync = [];
            console.log('待同步记录已全部同步完成');
        } catch (error) {
            console.error('同步待处理记录失败:', error);
        }
    }

    renderTodayStats() {
        const today = new Date().toDateString();
        const todayRecords = this.records.filter(record => record.date === today);
        
        // 按类型统计
        const stats = {};
        let totalTime = 0;
        
        todayRecords.forEach(record => {
            if (!stats[record.type]) {
                stats[record.type] = 0;
            }
            stats[record.type] += record.duration;
            totalTime += record.duration;
        });
        
        // 生成统计卡片
        const activityNames = {
            work: '工作',
            study: '学习',
            exercise: '运动',
            rest: '休息',
            entertainment: '娱乐',
            other: '其他'
        };
        
        let html = '';
        
        if (totalTime > 0) {
            Object.entries(stats).forEach(([type, duration]) => {
                const percentage = ((duration / totalTime) * 100).toFixed(1);
                html += `
                    <div class="stat-card">
                        <h3>${activityNames[type] || type}</h3>
                        <div class="value">${this.formatDuration(duration)}</div>
                        <div class="percentage">${percentage}%</div>
                    </div>
                `;
            });
            
            // 添加总计
            html += `
                <div class="stat-card">
                    <h3>总计</h3>
                    <div class="value">${this.formatDuration(totalTime)}</div>
                    <div class="percentage">100%</div>
                </div>
            `;
        } else {
            html = '<div class="stat-card"><h3>今日暂无记录</h3><div class="value">开始记录你的时间吧！</div></div>';
        }
        
        this.todayStatsEl.innerHTML = html;
    }

    renderEmptyRecords() {
        this.recordsListEl.innerHTML = '<div class="record-item"><div class="record-info">请先登录以查看记录</div></div>';
    }

    renderEmptyComments() {
        if (this.commentsListEl) {
            this.commentsListEl.innerHTML = '<div class="comment-item"><div class="comment-content">暂无留言，快来发布你的想法吧！</div></div>';
        }
    }

    renderRecords() {
        console.log('🎨 开始渲染记录，总数:', this.records.length);
        const recordsList = document.getElementById('recordsList');
        
        if (this.records.length === 0) {
            console.log('📝 无记录，显示空状态');
            recordsList.innerHTML = '<div class="no-records">暂无记录</div>';
            return;
        }

        const recentRecords = this.records.slice(-10).reverse();
        console.log('📋 渲染最近记录数量:', recentRecords.length);
        
        const html = recentRecords.map(record => {
            const date = new Date(record.startTime);
            const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('zh-CN');
            
            return `
                <div class="record-item">
                    <div class="record-info">
                        <div class="record-icon ${record.type}">
                            <i class="${this.activityIcons[record.type] || 'fas fa-circle'}"></i>
                        </div>
                        <div class="record-details">
                            <h4>${record.activity}</h4>
                            <p>${dateStr} ${timeStr}</p>
                        </div>
                    </div>
                    <div class="record-duration">${this.formatDuration(record.duration)}</div>
                </div>
            `;
        }).join('');
        
        recordsList.innerHTML = html;
        console.log('✅ 记录渲染完成');
    }

    // 渲染留言列表
    renderComments() {
        if (!this.commentsListEl) return;

        if (!this.comments || this.comments.length === 0) {
            this.renderEmptyComments();
            return;
        }

        const isOwner = (comment) => {
            return this.currentUser && comment.userId === this.currentUser.uid;
        };

        // 排序后做分页切片
        const sorted = this.comments
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // 兜底：每页条数必须为正数
        if (!this.commentsPageSize || this.commentsPageSize <= 0) this.commentsPageSize = 5;
        const totalPages = Math.max(1, Math.ceil(sorted.length / this.commentsPageSize));
        if (this.commentsPage > totalPages) this.commentsPage = totalPages;
        if (this.commentsPage < 1) this.commentsPage = 1;
        const startIdx = (this.commentsPage - 1) * this.commentsPageSize;
        const pageItems = sorted.slice(startIdx, startIdx + this.commentsPageSize);

        const html = pageItems
            .map(comment => {
                const created = new Date(comment.createdAt);
                const metaStr = `${created.toLocaleDateString('zh-CN')} ${created.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
                return `
                <div class="comment-item" data-id="${comment.id || ''}" data-local-id="${comment.localId || ''}">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author || '用户'}</span>
                        <span class="comment-meta">${metaStr}${comment.reported ? ' · 已报错' : ''}</span>
                    </div>
                    <div class="comment-content" contenteditable="false">${this.escapeHtml(comment.content)}</div>
                    <div class="comment-ops">
                        ${isOwner(comment) ? `<button class=\"btn btn-secondary\" data-action=\"edit\" data-id=\"${comment.id || ''}\" data-local-id=\"${comment.localId || ''}\"><i class=\"fas fa-edit\"></i> 修改</button>` : ''}
                        ${isOwner(comment) ? `<button class=\"btn btn-danger\" data-action=\"delete\" data-id=\"${comment.id || ''}\" data-local-id=\"${comment.localId || ''}\"><i class=\"fas fa-trash\"></i> 删除</button>` : ''}
                    </div>
                </div>`;
            }).join('');

        this.commentsListEl.innerHTML = html;

        // 更新分页状态与按钮禁用
        if (this.commentsPageInfoEl) {
            this.commentsPageInfoEl.textContent = `第 ${this.commentsPage} 页 / 共 ${totalPages} 页`;
        }
        if (this.commentsPrevEl) {
            this.commentsPrevEl.disabled = this.commentsPage <= 1;
        }
        if (this.commentsNextEl) {
            this.commentsNextEl.disabled = this.commentsPage >= totalPages;
        }
        // 单页时隐藏分页控件
        if (this.commentsPaginationEl) {
            this.commentsPaginationEl.style.display = totalPages > 1 ? 'flex' : 'none';
        }

        // 绑定操作按钮事件
        this.commentsListEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const localId = e.currentTarget.getAttribute('data-local-id');
                this.deleteCommentById(id, localId);
            });
        });
        // 编辑按钮：切换到编辑模式
        this.commentsListEl.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.currentTarget.closest('.comment-item');
                const contentEl = item.querySelector('.comment-content');
                const id = item.getAttribute('data-id');
                const localId = item.getAttribute('data-local-id');
                // 开启编辑
                contentEl.dataset.original = contentEl.textContent;
                contentEl.setAttribute('contenteditable', 'true');
                contentEl.focus();
                // 将按钮改为保存
                e.currentTarget.innerHTML = '<i class="fas fa-save"></i> 保存';
                e.currentTarget.setAttribute('data-action', 'save');
                e.currentTarget.classList.remove('btn-secondary');
                e.currentTarget.classList.add('btn-primary');
                // 插入取消按钮
                let cancelBtn = item.querySelector('[data-action="cancel-edit"]');
                if (!cancelBtn) {
                    cancelBtn = document.createElement('button');
                    cancelBtn.className = 'btn btn-outline';
                    cancelBtn.setAttribute('data-action', 'cancel-edit');
                    cancelBtn.innerHTML = '<i class="fas fa-times"></i> 取消';
                    item.querySelector('.comment-ops').insertBefore(cancelBtn, e.currentTarget.nextSibling);
                }
                // 绑定取消
                cancelBtn.addEventListener('click', () => {
                    // 恢复原文并退出编辑
                    const original = contentEl.dataset.original || contentEl.textContent;
                    contentEl.textContent = original;
                    contentEl.setAttribute('contenteditable', 'false');
                    // 恢复编辑按钮
                    const editBtn = item.querySelector('[data-action="save"]') || item.querySelector('[data-action="edit"]');
                    if (editBtn) {
                        editBtn.innerHTML = '<i class="fas fa-edit"></i> 修改';
                        editBtn.setAttribute('data-action', 'edit');
                        editBtn.classList.remove('btn-primary');
                        editBtn.classList.add('btn-secondary');
                    }
                    cancelBtn.remove();
                }, { once: true });
            });
        });

        // 保存按钮：提交编辑内容
        this.commentsListEl.querySelectorAll('[data-action="save"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const item = e.currentTarget.closest('.comment-item');
                const contentEl = item.querySelector('.comment-content');
                const id = item.getAttribute('data-id');
                const localId = item.getAttribute('data-local-id');
                const newContent = (contentEl.textContent || '').trim();
                await this.updateCommentContent(id, localId, newContent);
                // 退出编辑
                contentEl.setAttribute('contenteditable', 'false');
                e.currentTarget.innerHTML = '<i class="fas fa-edit"></i> 修改';
                e.currentTarget.setAttribute('data-action', 'edit');
                e.currentTarget.classList.remove('btn-primary');
                e.currentTarget.classList.add('btn-secondary');
                const cancelBtn = item.querySelector('[data-action="cancel-edit"]');
                if (cancelBtn) cancelBtn.remove();
                // 将显示文本更新为转义后的内容，以防后续渲染
                contentEl.textContent = newContent;
            });
        });
    }

    // 切换评论分页
    changeCommentsPage(delta) {
        // 计算总页数，进行严格边界校正
        const length = Array.isArray(this.comments) ? this.comments.length : 0;
        const pageSize = (!this.commentsPageSize || this.commentsPageSize <= 0) ? 5 : this.commentsPageSize;
        const totalPages = Math.max(1, Math.ceil(length / pageSize));
        let nextPage = this.commentsPage + delta;
        if (nextPage < 1) nextPage = 1;
        if (nextPage > totalPages) nextPage = totalPages;
        this.commentsPage = nextPage;
        // 渲染
        this.renderComments();
        // 滚动到评论顶部，避免页面占用
        if (this.commentsListEl) {
            this.commentsListEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // 文本转义，避免XSS
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 提交留言
    async handleSubmitComment() {
        if (!this.commentInputEl) return;
        const content = (this.commentInputEl.value || '').trim();
        if (!content) return;

        const now = new Date();
        const localId = `loc_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;
        const comment = {
            id: undefined,
            localId,
            userId: this.currentUser ? this.currentUser.uid : 'guest',
            author: this.currentUser && this.currentUser.email ? this.currentUser.email : '游客',
            content,
            createdAt: now,
            reported: false
        };

        // 加入本地列表并保存
        this.comments.push(comment);
        this.saveLocalComments();

        // 云端保存
        try {
            if (window.authManager && window.authManager.isGuest()) {
                // 游客模式：仅本地
                console.log('游客模式，留言仅保存在本地');
            } else if (window.db && this.currentUser) {
                await this.saveCommentToCloud(comment);
            } else {
                // Firestore不可用，加入待同步
                this.pendingCommentsSync.push(comment);
                console.warn('Firestore未初始化，留言加入待同步队列');
            }
        } catch (error) {
            console.error('保存留言到云端失败，加入待同步:', error);
            this.pendingCommentsSync.push(comment);
        }

        // 重置到第1页以显示最新留言
        this.commentsPage = 1;
        // 清空输入并刷新显示
        this.commentInputEl.value = '';
        this.renderComments();
    }

    // 删除留言
    async deleteCommentById(id, localId) {
        if (!id && !localId) {
            console.warn('删除失败：未提供ID或本地ID');
        }

        const idx = this.comments.findIndex(c => (id && c.id === id) || (localId && c.localId === localId));
        let comment;
        if (idx >= 0) {
            comment = this.comments[idx];
        } else {
            // Fallback: 找不到ID，忽略
            console.warn('留言未找到或无ID');
            return;
        }

        // 权限：仅作者可删除；游客允许删除自己(guest)的留言
        const isGuest = (window.authManager && typeof window.authManager.isGuest === 'function') ? window.authManager.isGuest() : !this.currentUser;
        const ownsComment = this.currentUser ? (comment.userId === this.currentUser.uid) : (isGuest && comment.userId === 'guest');
        if (!ownsComment) {
            alert('只能删除自己的留言');
            return;
        }

        // 云端删除
        try {
            if (window.db && comment.id) {
                const { doc, deleteDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const commentsRef = collection(window.db, 'comments');
                const target = doc(commentsRef, comment.id);
                await deleteDoc(target);
            }
        } catch (error) {
            console.error('云端删除留言失败:', error);
        }

        // 本地删除并保存
        this.comments.splice(idx, 1);
        this.saveLocalComments();
        this.renderComments();
    }

    // 标记留言为报错
    async reportCommentById(id, localId) {
        const idx = this.comments.findIndex(c => (id && c.id === id) || (localId && c.localId === localId));
        if (idx < 0) return;
        const comment = this.comments[idx];
        if (comment.reported) return;
        comment.reported = true;

        // 云端更新
        try {
            if (window.db && id) {
                const { doc, updateDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const commentsRef = collection(window.db, 'comments');
                const target = doc(commentsRef, id);
                await updateDoc(target, { reported: true });
            }
        } catch (error) {
            console.error('云端更新留言失败:', error);
        }

        this.saveLocalComments();
        this.renderComments();
    }

    // 更新留言内容（仅作者可编辑）
    async updateCommentContent(id, localId, newContent) {
        if (!newContent && newContent !== '') return;
        const idx = this.comments.findIndex(c => (id && c.id === id) || (localId && c.localId === localId));
        if (idx < 0) return;
        const comment = this.comments[idx];
        // 权限：仅作者可修改；游客允许修改自己(guest)的留言
        const isGuest = (window.authManager && typeof window.authManager.isGuest === 'function') ? window.authManager.isGuest() : !this.currentUser;
        const ownsComment = this.currentUser ? (comment.userId === this.currentUser.uid) : (isGuest && comment.userId === 'guest');
        if (!ownsComment) {
            alert('只能修改自己的留言');
            return;
        }
        comment.content = newContent;
        // 云端更新
        try {
            if (window.db && comment.id) {
                const { doc, updateDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const commentsRef = collection(window.db, 'comments');
                const target = doc(commentsRef, comment.id);
                await updateDoc(target, { content: newContent });
            }
        } catch (error) {
            console.error('云端更新留言失败:', error);
        }
        this.saveLocalComments();
    }

    // 加载用户留言（优先云端，失败回退本地）
    async loadUserComments() {
        this.comments = [];
        try {
            if (window.authManager && window.authManager.isGuest()) {
                this.comments = this.loadLocalComments();
                // 兼容旧数据：补齐本地ID
                this.comments.forEach(c => { if (!c.localId) c.localId = `loc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; });
                this.saveLocalComments();
                this.commentsPage = 1;
                return;
            }

            if (!window.db || !this.currentUser) {
                this.comments = this.loadLocalComments();
                this.comments.forEach(c => { if (!c.localId) c.localId = `loc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; });
                this.saveLocalComments();
                this.commentsPage = 1;
                return;
            }

            const { collection, query, where, getDocs, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const commentsRef = collection(window.db, 'comments');
            const q = query(
                commentsRef,
                where('userId', '==', this.currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                this.comments.push({
                    id: docSnap.id,
                    localId: docSnap.id,
                    userId: data.userId,
                    author: data.author,
                    content: data.content,
                    createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt),
                    reported: !!data.reported
                });
            });

            // 保存本地备份
            this.saveLocalComments();
            // 加载完成后展示第1页（最新）
            this.commentsPage = 1;
        } catch (error) {
            console.error('加载云端留言失败，使用本地备份:', error);
            this.comments = this.loadLocalComments();
            this.comments.forEach(c => { if (!c.localId) c.localId = `loc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; });
            this.saveLocalComments();
            // 回退后也展示第1页
            this.commentsPage = 1;
        }
    }

    // 保存单条留言到云端
    async saveCommentToCloud(comment) {
        if (!window.db || !this.currentUser) return;
        const { collection, addDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const commentsRef = collection(window.db, 'comments');
        const payload = {
            userId: this.currentUser.uid,
            author: this.currentUser.email || '',
            content: comment.content,
            createdAt: Timestamp.fromDate(comment.createdAt || new Date()),
            reported: !!comment.reported
        };
        const docRef = await addDoc(commentsRef, payload);
        comment.id = docRef.id;
        console.log('留言已保存到云端，ID:', docRef.id);
    }

    // 本地存储：根据用户隔离
    getLocalCommentsKey() {
        const uid = (this.currentUser && this.currentUser.uid) ? this.currentUser.uid : 'guest';
        return `timeTrackerComments_${uid}`;
    }

    saveLocalComments() {
        try {
            const key = this.getLocalCommentsKey();
            const payload = this.comments.map(c => ({
                id: c.id,
                localId: c.localId,
                userId: c.userId,
                author: c.author,
                content: c.content,
                createdAt: new Date(c.createdAt).toISOString(),
                reported: !!c.reported
            }));
            localStorage.setItem(key, JSON.stringify(payload));
        } catch (e) {
            console.warn('保存本地留言失败:', e);
        }
    }

    loadLocalComments() {
        try {
            const key = this.getLocalCommentsKey();
            const raw = localStorage.getItem(key);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            const comments = arr.map(c => ({
                id: c.id,
                localId: c.localId,
                userId: c.userId,
                author: c.author,
                content: c.content,
                createdAt: new Date(c.createdAt),
                reported: !!c.reported
            }));
            // 补齐缺失的本地ID
            comments.forEach(item => { if (!item.localId) item.localId = `loc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; });
            return comments;
        } catch (e) {
            console.warn('加载本地留言失败:', e);
            return [];
        }
    }

    // 同步待处理的留言
    async syncPendingComments() {
        if (!window.db || !this.currentUser || this.pendingCommentsSync.length === 0) return;
        const pending = [...this.pendingCommentsSync];
        for (const c of pending) {
            try {
                await this.saveCommentToCloud(c);
                // 从队列移除
                this.pendingCommentsSync = this.pendingCommentsSync.filter(x => x !== c);
            } catch (error) {
                console.error('同步留言失败，保留在队列中:', error);
            }
        }
        // 同步完成后保存本地备份
        this.saveLocalComments();
        // 刷新显示
        this.renderComments();
    }

    renderCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // 更新月份显示
        this.currentMonthEl.textContent = `${year}年${month + 1}月`;
        
        // 获取月份信息
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // 生成日历
        let html = '';
        
        // 星期标题
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays.forEach(day => {
            html += `<div class="calendar-header">${day}</div>`;
        });
        
        // 日期格子
        const today = new Date();
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = currentDate.toDateString() === today.toDateString();
            const dateStr = currentDate.toDateString();
            const dateKey = this.getDateKey(currentDate);
            
            // 获取当天的活动
            const dayRecords = this.records.filter(record => (record.dateKey === dateKey) || (record.date === dateStr));
            const hasActivity = dayRecords.length > 0;
            
            let classes = 'calendar-day';
            if (!isCurrentMonth) classes += ' other-month';
            if (isToday) classes += ' today';
            if (hasActivity) classes += ' has-activity';
            
            // 生成活动指示器
            let indicators = '';
            if (hasActivity) {
                const types = [...new Set(dayRecords.map(r => r.type))];
                types.slice(0, 3).forEach(type => {
                    indicators += `<div class="activity-indicator ${type}"></div>`;
                });
            }
            
            html += `
                <div class="${classes}" data-date="${dateStr}" data-key="${dateKey}">
                    <div>${currentDate.getDate()}</div>
                    ${indicators}
                </div>
            `;
        }
        
        this.calendarEl.innerHTML = html;
        
        // 添加点击事件
        this.calendarEl.querySelectorAll('.calendar-day').forEach(day => {
            day.addEventListener('click', (e) => {
                const date = e.currentTarget.dataset.date;
                this.showDayDetails(date);
            });
        });
    }

    // 去重当天记录（按活动名 + 分钟粒度的开始/结束时间，优先保留有ID/较长/较新的记录）
    dedupeDayRecords(records) {
        const map = new Map();
        const roundToMinute = (t) => {
            const d = t instanceof Date ? new Date(t) : new Date(t);
            d.setSeconds(0, 0);
            return d.getTime();
        };
        for (const r of records) {
            if (!r || !r.startTime || !r.endTime) continue;
            const startMs = roundToMinute(r.startTime);
            const endMs = roundToMinute(r.endTime);
            const key = `${r.activity || ''}|${startMs}|${endMs}`;
            const existing = map.get(key);
            if (!existing) {
                map.set(key, r);
            } else {
                const preferCloud = !!r.id && !existing.id;
                const preferLonger = (r.duration || 0) > (existing.duration || 0);
                const preferNewerEnd = new Date(r.endTime) > new Date(existing.endTime);
                if (preferCloud || preferLonger || preferNewerEnd) {
                    map.set(key, r);
                }
            }
        }
        return Array.from(map.values()).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    }

    showDayDetails(dateStr) {
        const key = this.getDateKey(new Date(dateStr));
        const dayRecordsRaw = this.records.filter(record => {
            // 兼容旧的字符串date与新的本地日期键
            return (record.dateKey ? record.dateKey === key : record.date === dateStr);
        });
        const dayRecords = this.dedupeDayRecords(dayRecordsRaw);
        
        if (dayRecords.length === 0) {
            alert('这一天没有记录');
            return;
        }
        const headerDate = new Date(dateStr);
        let details = `${headerDate.toLocaleDateString('zh-CN')} 的活动记录:\n\n`;
        
        // 显示详细记录
        dayRecords.forEach(record => {
            const startTime = new Date(record.startTime).toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            details += `${startTime} - ${record.activity}: ${this.formatDuration(record.duration)}\n`;
        });
        
        // 计算每个活动类型的总时间
        const activityStats = {};
        dayRecords.forEach(record => {
            if (!activityStats[record.activity]) {
                activityStats[record.activity] = 0;
            }
            activityStats[record.activity] += record.duration;
        });
        
        // 添加统计信息
        details += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        details += '📊 当日活动统计:\n\n';
        
        // 按时间长短排序显示
        const sortedStats = Object.entries(activityStats)
            .sort(([,a], [,b]) => b - a);
        
        let totalTime = 0;
        sortedStats.forEach(([activity, duration]) => {
            details += `${activity}: ${this.formatDuration(duration)}\n`;
            totalTime += duration;
        });
        
        details += `\n总计: ${this.formatDuration(totalTime)}`;
        
        alert(details);
    }

    previousMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.renderCalendar();
    }

    // 日图表相关方法

    initializeDailyChart() {
        this.currentWeekStart = this.getWeekStart(new Date());
        this.bindChartEvents();
        this.renderDailyChart();
    }

    bindChartEvents() {
        const prevWeekBtn = document.getElementById('prevWeek');
        const nextWeekBtn = document.getElementById('nextWeek');
        const currentWeekSpan = document.getElementById('currentWeek');

        if (prevWeekBtn) {
            prevWeekBtn.addEventListener('click', () => {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
                this.updateCurrentWeekDisplay();
                this.renderDailyChart();
            });
        }

        if (nextWeekBtn) {
            nextWeekBtn.addEventListener('click', () => {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
                this.updateCurrentWeekDisplay();
                this.renderDailyChart();
            });
        }

        this.updateCurrentWeekDisplay();
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
        return new Date(d.setDate(diff));
    }

    getWeekDates(weekStart) {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            dates.push(date);
        }
        return dates;
    }

    // 本地日期键：YYYY-MM-DD（基于本地时区，避免UTC偏移）
    getDateKey(date) {
        const d = date instanceof Date ? date : new Date(date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // 解析日期键为本地Date对象
    parseDateKey(key) {
        if (!key || typeof key !== 'string') return new Date(key);
        const parts = key.split('-');
        if (parts.length !== 3) return new Date(key);
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        return new Date(y, m, d);
    }

    getDailyData(date) {
        const dateStr = date.toDateString();
        const key = this.getDateKey(date);
        const dayRecordsRaw = this.records.filter(record => {
            // 兼容旧的字符串date与新的本地日期键
            return (record.dateKey ? record.dateKey === key : record.date === dateStr);
        });
        const dayRecords = this.dedupeDayRecords(dayRecordsRaw);

        // 中文活动名称到英文键值的映射
        const activityMapping = {
            '工作': 'work',
            '学习': 'study',
            '运动': 'exercise',
            '休息': 'rest',
            '娱乐': 'entertainment',
            '会议': 'meeting',
            '杂务': 'chores',
            '其他': 'other'
        };

        // 返回时间段数组而不是总时长
        const timeSlots = [];
        
        dayRecords.forEach(record => {
            if (record.startTime && record.endTime) {
                const startTime = new Date(record.startTime);
                const endTime = new Date(record.endTime);
                const activityName = record.activity || '其他';
                const activityKey = activityMapping[activityName] || 'other';
                
                timeSlots.push({
                    activity: activityKey,
                    activityName: activityName,
                    startHour: startTime.getHours() + startTime.getMinutes() / 60,
                    endHour: endTime.getHours() + endTime.getMinutes() / 60,
                    duration: record.duration || 0
                });
            }
        });

        // 添加测试数据（仅当没有其他数据时）
        if (timeSlots.length === 0) {
            const today = new Date();
            if (date.toDateString() === today.toDateString()) {
                timeSlots.push(
                    {
                        activity: 'work',
                        activityName: '工作',
                        startHour: 9,
                        endHour: 12,
                        duration: 180
                    },
                    {
                        activity: 'rest',
                        activityName: '休息',
                        startHour: 12,
                        endHour: 13,
                        duration: 60
                    },
                    {
                        activity: 'exercise',
                        activityName: '运动',
                        startHour: 18,
                        endHour: 19,
                        duration: 60
                    }
                );
            }
        }

        return timeSlots;
    }

    renderDailyChart() {
        const chartContainer = document.getElementById('dailyChart');
        if (!chartContainer) return;

        const weekDates = this.getWeekDates(this.currentWeekStart);
        const today = new Date();
        
        let html = '';
        
        const maxHeight = 280; // 图表最大高度，对应24小时
        const hourHeight = maxHeight / 24; // 每小时的像素高度
        
        weekDates.forEach(date => {
            const isToday = date.toDateString() === today.toDateString();
            let timeSlots = this.getDailyData(date);
            

            
            let stackHtml = '';
            
            if (timeSlots.length === 0) {
                // 显示空状态占位符
                stackHtml = `
                    <div class="bar-segment empty" 
                         style="height: 5px; background-color: #e2e8f0; position: absolute; bottom: 0; width: 100%;" 
                         data-tooltip="暂无活动记录">
                    </div>
                `;
            } else {
                // 为每个时间段创建一个段
                timeSlots.forEach(slot => {
                    // 现在0在底部，24在顶部，使用bottom定位
                    // 容器高度是280px，对应24小时
                    // startHour=9的活动应该从底部向上9*hourHeight的位置开始
                    const bottomPosition = slot.startHour * hourHeight;
                    const segmentHeight = (slot.endHour - slot.startHour) * hourHeight;
                    const startTime = Math.floor(slot.startHour) + ':' + String(Math.floor((slot.startHour % 1) * 60)).padStart(2, '0');
                    const endTime = Math.floor(slot.endHour) + ':' + String(Math.floor((slot.endHour % 1) * 60)).padStart(2, '0');
                    
                    stackHtml += `
                        <div class="bar-segment time-slot ${slot.activity}" 
                             style="height: ${segmentHeight}px; background-color: var(--${slot.activity}-color, #ccc); position: absolute; bottom: ${bottomPosition}px; width: 100%; border: 1px solid rgba(255,255,255,0.3); z-index: 1;" 
                             data-tooltip="${slot.activityName}: ${startTime} - ${endTime}">
                        </div>
                    `;
                });
            }
            
            html += `
                <div class="chart-bar ${isToday ? 'today' : ''}" style="height: ${maxHeight}px; position: relative;">
                    ${stackHtml}
                </div>
            `;
        });
        
        chartContainer.innerHTML = html;
        
        // 生成X轴日期标签
            const chartXLabels = document.getElementById('chartXLabels');
            if (chartXLabels) {
                let labelsHtml = '';
                weekDates.forEach(date => {
                    const isToday = date.toDateString() === today.toDateString();
                    const dateStr = this.getDateKey(date); // 使用本地日期键避免UTC偏移
                    labelsHtml += `
                        <div class="x-label ${isToday ? 'today' : ''} clickable-date" data-date="${dateStr}">
                            <div class="label-day">${date.toLocaleDateString('zh-CN', { weekday: 'short' })}</div>
                            <div class="label-date">${date.getMonth() + 1}/${date.getDate()}</div>
                        </div>
                    `;
                });
                chartXLabels.innerHTML = labelsHtml;
                
                // 为日期标签添加点击事件
                this.bindDateClickEvents();
            }
        }

    getActivityName(activityKey) {
        const activityNames = {
            work: '工作',
            study: '学习',
            exercise: '运动',
            rest: '休息',
            entertainment: '娱乐',
            meeting: '会议',
            chores: '杂务',
            other: '其他'
        };
        return activityNames[activityKey] || '其他';
    }

    updateCurrentWeekDisplay() {
        const currentWeekSpan = document.getElementById('currentWeek');
        if (currentWeekSpan) {
            const weekEnd = new Date(this.currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const startStr = this.currentWeekStart.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            const endStr = weekEnd.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            
            currentWeekSpan.textContent = `${startStr} - ${endStr}`;
        }
    }

    // 绑定日期点击事件
    bindDateClickEvents() {
        const dateLabels = document.querySelectorAll('.clickable-date');
        dateLabels.forEach(label => {
            label.addEventListener('click', (e) => {
                const dateStr = e.currentTarget.getAttribute('data-date');
                this.showDailyStats(dateStr);
            });
        });
    }

    // 显示指定日期的统计信息
    showDailyStats(dateStr) {
        // dateStr 为 YYYY-MM-DD 的本地日期键
        const date = this.parseDateKey(dateStr);
        const timeSlots = this.getDailyData(date);
        
        // 计算统计数据
        const stats = this.calculateDailyStats(timeSlots);
        
        // 显示统计弹窗
        this.displayStatsModal(dateStr, stats);
    }

    // 计算当日统计数据
    calculateDailyStats(timeSlots) {
        const stats = {
            totalTime: 0,
            activities: {},
            timeSlots: timeSlots || []
        };

        // 计算各活动的总时间
        timeSlots.forEach(slot => {
            const duration = (slot.endHour - slot.startHour) * 60; // 转换为分钟
            stats.totalTime += duration;
            
            if (!stats.activities[slot.activity]) {
                stats.activities[slot.activity] = {
                    name: slot.activityName || this.getActivityName(slot.activity),
                    duration: 0,
                    percentage: 0
                };
            }
            stats.activities[slot.activity].duration += duration;
        });

        // 计算百分比
        Object.keys(stats.activities).forEach(activity => {
            stats.activities[activity].percentage = 
                stats.totalTime > 0 ? (stats.activities[activity].duration / stats.totalTime * 100).toFixed(1) : 0;
        });

        return stats;
    }

    // 显示统计弹窗
    displayStatsModal(dateStr, stats) {
        // 移除已存在的弹窗
        const existingModal = document.getElementById('dailyStatsModal');
        if (existingModal) {
            existingModal.remove();
        }
        // 兼容传入的本地日期键或旧字符串
        const date = dateStr && dateStr.includes('-') ? this.parseDateKey(dateStr) : new Date(dateStr);
        const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日 (${date.toLocaleDateString('zh-CN', { weekday: 'long' })})`;
        
        // 创建弹窗HTML
        const modalHtml = `
            <div id="dailyStatsModal" class="stats-modal">
                <div class="stats-modal-content">
                    <div class="stats-modal-header">
                        <h3>${formattedDate} 统计</h3>
                        <button class="stats-modal-close">&times;</button>
                    </div>
                    <div class="stats-modal-body">
                        <div class="stats-summary">
                            <div class="total-time">
                                <span class="label">总时间:</span>
                                <span class="value">${this.formatDuration(stats.totalTime * 60 * 1000)}</span>
                            </div>
                        </div>
                        <div class="stats-activities">
                            ${Object.keys(stats.activities).length > 0 ? 
                                Object.keys(stats.activities).map(activity => `
                                    <div class="activity-stat">
                                        <div class="activity-info">
                                            <span class="activity-name ${activity}" style="background-color: var(--${activity}-color, #ccc);">${stats.activities[activity].name}</span>
                                            <span class="activity-percentage">${stats.activities[activity].percentage}%</span>
                                        </div>
                                        <div class="activity-duration">${this.formatDuration(stats.activities[activity].duration * 60 * 1000)}</div>
                                        <div class="activity-bar">
                                            <div class="activity-bar-fill ${activity}" style="width: ${stats.activities[activity].percentage}%"></div>
                                        </div>
                                    </div>
                                `).join('') : 
                                '<div class="no-data">当日无活动记录</div>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 绑定关闭事件
        const modal = document.getElementById('dailyStatsModal');
        const closeBtn = modal.querySelector('.stats-modal-close');
        
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 创建TimeTracker实例并分配给全局变量
    window.timeTracker = new TimeTracker();
    
    // 添加一些提示信息
    console.log('时间记录器已启动！');
    console.log('快捷键: Ctrl/Cmd + S (开始), Ctrl/Cmd + P (暂停), Ctrl/Cmd + Q (停止)');
});