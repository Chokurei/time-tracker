// 时间记录器应用
class TimeTracker {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.currentActivity = null;
        this.timer = null;
        this.records = this.loadRecords();
        this.currentMonth = new Date();
        
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
        this.renderCalendar();
        this.renderTodayStats();
        this.renderRecords();
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
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            this.pausedTime = Date.now() - this.startTime;
            this.stopTimer();
            this.updateButtons();
        }
    }

    stop() {
        if (this.isRunning) {
            const duration = this.isPaused ? this.pausedTime : Date.now() - this.startTime;
            
            // 保存记录
            this.saveRecord({
                activity: this.currentActivity,
                type: this.activityTypeEl.value,
                startTime: this.startTime,
                duration: duration,
                date: new Date().toDateString()
            });
            
            // 重置状态
            this.reset();
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

    saveRecord(record) {
        this.records.push(record);
        this.saveRecords();
    }

    loadRecords() {
        try {
            const saved = localStorage.getItem('timeTrackerRecords');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('加载记录失败:', e);
            return [];
        }
    }

    saveRecords() {
        try {
            localStorage.setItem('timeTrackerRecords', JSON.stringify(this.records));
        } catch (e) {
            console.error('保存记录失败:', e);
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

    renderRecords() {
        const recentRecords = this.records.slice(-10).reverse();
        
        if (recentRecords.length === 0) {
            this.recordsListEl.innerHTML = '<div class="record-item"><div class="record-info">暂无记录</div></div>';
            return;
        }
        
        const activityIcons = {
            work: 'fas fa-briefcase',
            study: 'fas fa-book',
            exercise: 'fas fa-dumbbell',
            rest: 'fas fa-bed',
            entertainment: 'fas fa-gamepad',
            other: 'fas fa-circle'
        };
        
        let html = '';
        recentRecords.forEach(record => {
            const date = new Date(record.startTime);
            const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('zh-CN');
            
            html += `
                <div class="record-item">
                    <div class="record-info">
                        <div class="record-icon ${record.type}">
                            <i class="${activityIcons[record.type] || 'fas fa-circle'}"></i>
                        </div>
                        <div class="record-details">
                            <h4>${record.activity}</h4>
                            <p>${dateStr} ${timeStr}</p>
                        </div>
                    </div>
                    <div class="record-duration">${this.formatDuration(record.duration)}</div>
                </div>
            `;
        });
        
        this.recordsListEl.innerHTML = html;
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
        const dayRecords = this.records.filter(record => record.date === dateStr);
        
        if (dayRecords.length === 0) {
            alert('这一天没有记录');
            return;
        }
        
        let details = `${new Date(dateStr).toLocaleDateString('zh-CN')} 的活动记录:\n\n`;
        
        dayRecords.forEach(record => {
            const startTime = new Date(record.startTime).toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            details += `${startTime} - ${record.activity}: ${this.formatDuration(record.duration)}\n`;
        });
        
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
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new TimeTracker();
    
    // 添加一些提示信息
    console.log('时间记录器已启动！');
    console.log('快捷键: Ctrl/Cmd + S (开始), Ctrl/Cmd + P (暂停), Ctrl/Cmd + Q (停止)');
});