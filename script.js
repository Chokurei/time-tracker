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
            'other': 'fas fa-circle'
        };
        
        this.initializeElements();
        this.bindEvents();
        
        // 恢复之前保存的计时状态
        this.restoreTimerState();
        
        this.updateDisplay();
        this.renderCalendar();
        this.renderTodayStats();
        // 不在构造函数中渲染记录，等待用户登录后再渲染
        this.renderEmptyRecords();
    }

    // 为用户初始化数据
    async initializeForUser(user) {
        console.log('🔄 初始化用户数据:', user);
        this.currentUser = user;
        await this.loadUserRecords();
        console.log('📊 加载完成，记录数量:', this.records.length);
        this.renderRecords();
        this.renderCalendar();
        this.initializeDailyChart();
        this.renderDailyChart();
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
                date: endTime.toDateString()
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
                createdAt: Timestamp.now()
            };
            
            const recordsRef = collection(window.db, 'timeRecords');
            const docRef = await addDoc(recordsRef, recordData);
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
            
            // 转换日期字符串为Date对象
            return records.map(record => ({
                ...record,
                startTime: new Date(record.startTime),
                endTime: new Date(record.endTime)
            }));
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
            
            // 获取当天的活动
            const dayRecords = this.records.filter(record => record.date === dateStr);
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
                <div class="${classes}" data-date="${dateStr}">
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

    showDayDetails(dateStr) {
        const dayRecords = this.records.filter(record => {
            const recordDate = new Date(record.startTime).toISOString().split('T')[0];
            return recordDate === dateStr;
        });
        
        if (dayRecords.length === 0) {
            alert('这一天没有记录');
            return;
        }
        
        let details = `${new Date(dateStr).toLocaleDateString('zh-CN')} 的活动记录:\n\n`;
        
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

    // 柱状图相关方法
    initializeDailyChart() {
        this.currentWeekStart = this.getWeekStart(new Date());
        this.bindChartEvents();
        this.renderDailyChart();
    }

    bindChartEvents() {
        console.log('🔗 绑定图表事件');
        const prevWeekBtn = document.getElementById('prevWeek');
        const nextWeekBtn = document.getElementById('nextWeek');
        
        console.log('🔍 查找按钮元素:', { prevWeekBtn, nextWeekBtn });

        if (prevWeekBtn) {
            console.log('✅ 绑定上周按钮事件');
            prevWeekBtn.addEventListener('click', () => {
                console.log('🔙 点击上周按钮');
                const newDate = new Date(this.currentWeekStart);
                newDate.setDate(newDate.getDate() - 7);
                this.currentWeekStart = newDate;
                this.renderDailyChart();
            });
        } else {
            console.log('❌ 未找到上周按钮');
        }

        if (nextWeekBtn) {
            console.log('✅ 绑定下周按钮事件');
            nextWeekBtn.addEventListener('click', () => {
                console.log('🔜 点击下周按钮');
                const newDate = new Date(this.currentWeekStart);
                newDate.setDate(newDate.getDate() + 7);
                this.currentWeekStart = newDate;
                this.renderDailyChart();
            });
        } else {
            console.log('❌ 未找到下周按钮');
        }
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

    getDailyData(date) {
        const dateStr = date.toISOString().split('T')[0];
        const dayRecords = this.records.filter(record => {
            const recordDate = new Date(record.startTime).toISOString().split('T')[0];
            return recordDate === dateStr;
        });

        const activityData = {
            work: 0,
            study: 0,
            exercise: 0,
            rest: 0,
            entertainment: 0,
            other: 0
        };

        dayRecords.forEach(record => {
            const activity = record.activity || 'other';
            activityData[activity] += record.duration || 0;
        });

        return activityData;
    }

    renderDailyChart() {
        const chartGrid = document.getElementById('dailyChart');
        const chartXLabels = document.getElementById('chartXLabels');
        const currentWeekSpan = document.getElementById('currentWeek');

        if (!chartGrid || !chartXLabels || !currentWeekSpan) return;

        // 确保currentWeekStart已初始化
        if (!this.currentWeekStart) {
            this.currentWeekStart = this.getWeekStart(new Date());
        }

        const weekDates = this.getWeekDates(this.currentWeekStart);
        
        // 更新周期显示
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        currentWeekSpan.textContent = `${this.currentWeekStart.toLocaleDateString('zh-CN', { 
            month: 'short', 
            day: 'numeric' 
        })} - ${weekEnd.toLocaleDateString('zh-CN', { 
            month: 'short', 
            day: 'numeric' 
        })}`;

        // 清空现有内容
        chartGrid.innerHTML = '';
        chartXLabels.innerHTML = '';

        // 生成每日柱状图
        weekDates.forEach(date => {
            const dailyData = this.getDailyData(date);
            const totalHours = Object.values(dailyData).reduce((sum, duration) => sum + duration, 0) / (1000 * 60 * 60);
            
            // 创建柱状图条
            const chartBar = document.createElement('div');
            chartBar.className = 'chart-bar';
            
            // 按活动类型堆叠
            const activities = ['work', 'study', 'exercise', 'rest', 'entertainment', 'other'];
            activities.forEach(activity => {
                if (dailyData[activity] > 0) {
                    const segment = document.createElement('div');
                    segment.className = `bar-segment activity-${activity}`;
                    
                    const hours = dailyData[activity] / (1000 * 60 * 60);
                    const height = (hours / 24) * 280; // 280px是图表的最大高度
                    segment.style.height = `${height}px`;
                    
                    // 添加工具提示
                    const activityNames = {
                        work: '工作',
                        study: '学习',
                        exercise: '运动',
                        rest: '休息',
                        entertainment: '娱乐',
                        other: '其他'
                    };
                    segment.setAttribute('data-tooltip', 
                        `${activityNames[activity]}: ${this.formatDuration(dailyData[activity])}`);
                    
                    chartBar.appendChild(segment);
                }
            });

            chartGrid.appendChild(chartBar);

            // 创建X轴标签
            const xLabel = document.createElement('div');
            xLabel.className = 'x-label';
            xLabel.textContent = date.toLocaleDateString('zh-CN', { 
                month: 'numeric', 
                day: 'numeric' 
            });
            
            // 添加点击事件，显示当日详情
            const dateStr = date.toISOString().split('T')[0];
            xLabel.style.cursor = 'pointer';
            xLabel.addEventListener('click', () => {
                this.showDayDetails(dateStr);
            });
            
            // 如果有记录，添加视觉提示
            const dayRecords = this.records.filter(record => {
                const recordDate = new Date(record.startTime).toISOString().split('T')[0];
                return recordDate === dateStr;
            });
            
            if (dayRecords.length > 0) {
                xLabel.classList.add('has-records');
                xLabel.title = `点击查看 ${dayRecords.length} 条记录`;
            }
            
            chartXLabels.appendChild(xLabel);
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