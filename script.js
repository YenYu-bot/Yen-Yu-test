// 全局變量
let classes = [];
let schedule = {};
let teacherSchedules = {};

// 初始化時間槽
const timeSlots = [
    '0900-1030', '1030-1200', '1200-1330', '1330-1500', '1500-1630',
    '1630-1800', '1800-1830', '1830-2000', '2000-2130'
];

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
    initializeSchedule();
    loadSavedData();
    setupEventListeners();
});

// 初始化排課表
function initializeSchedule() {
    const timeSlotsContainer = document.querySelector('.time-slots');
    timeSlots.forEach(time => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = time;
        timeSlotsContainer.appendChild(timeSlot);
    });

    document.querySelectorAll('.day-slots').forEach(daySlots => {
        timeSlots.forEach(time => {
            const slot = document.createElement('div');
            slot.className = 'schedule-slot';
            if (time === '1200-1330' || time === '1800-1830') {
                slot.classList.add('break');
            }
            daySlots.appendChild(slot);
        });
    });
}

// 設置事件監聽器
function setupEventListeners() {
    document.getElementById('addClass').addEventListener('click', addNewClass);
    document.getElementById('saveSchedule').addEventListener('click', saveSchedule);
    document.getElementById('downloadSchedule').addEventListener('click', downloadSchedule);
    document.getElementById('copySchedule').addEventListener('click', copySchedule);
}

// 添加新班級
function addNewClass() {
    const className = document.getElementById('className').value;
    const teacherCode = document.getElementById('teacherCode').value;

    if (!className || !teacherCode) {
        alert('請輸入班級名稱和教師代號');
        return;
    }

    if (classes.length >= 30) {
        alert('已達到最大班級數量限制（30個）');
        return;
    }

    const classData = {
        id: Date.now(),
        name: className,
        teacherCode: teacherCode,
        uses: 0
    };

    classes.push(classData);
    createClassBox(classData);
    updateTeacherSchedules();
    saveToLocalStorage();

    document.getElementById('className').value = '';
    document.getElementById('teacherCode').value = '';
}

// 創建班級方塊
function createClassBox(classData) {
    const classBox = document.createElement('div');
    classBox.className = 'class-box';
    classBox.draggable = true;
    classBox.dataset.id = classData.id;
    classBox.style.backgroundColor = getRandomColor();
    classBox.textContent = `${classData.name} (${classData.teacherCode})`;

    setupDragAndDrop(classBox);
    document.getElementById('classList').appendChild(classBox);
}

// 設置拖放功能
function setupDragAndDrop(element) {
    element.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', element.dataset.id);
        element.classList.add('dragging');
    });

    element.addEventListener('dragend', () => {
        element.classList.remove('dragging');
    });
}

// 設置排課表槽的拖放功能
document.querySelectorAll('.schedule-slot').forEach(slot => {
    slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!slot.classList.contains('break')) {
            slot.classList.add('drag-over');
        }
    });

    slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        
        const classId = e.dataTransfer.getData('text/plain');
        const classData = classes.find(c => c.id === parseInt(classId));
        
        if (!classData) return;

        const day = slot.closest('.day-column').dataset.day;
        const timeIndex = Array.from(slot.parentNode.children).indexOf(slot);
        const time = timeSlots[timeIndex];

        if (canPlaceClass(classData, day, time)) {
            placeClass(classData, slot, day, time);
        } else {
            showErrorAnimation(document.querySelector(`[data-id="${classId}"]`));
        }
    });
});

// 檢查是否可以放置班級
function canPlaceClass(classData, day, time) {
    if (classData.uses >= 2) return false;
    
    const teacherCode = classData.teacherCode;
    if (!schedule[day]) schedule[day] = {};
    if (!schedule[day][time]) schedule[day][time] = [];

    // 檢查教師是否在同一天已有課程
    return !schedule[day][time].some(c => c.teacherCode === teacherCode);
}

// 放置班級
function placeClass(classData, slot, day, time) {
    const classBox = document.querySelector(`[data-id="${classData.id}"]`);
    const newClassBox = classBox.cloneNode(true);
    newClassBox.classList.add('success');
    
    slot.innerHTML = '';
    slot.appendChild(newClassBox);
    slot.classList.add('occupied');

    if (!schedule[day]) schedule[day] = {};
    if (!schedule[day][time]) schedule[day][time] = [];
    schedule[day][time].push(classData);

    classData.uses++;
    if (classData.uses >= 2) {
        classBox.style.display = 'none';
    }

    updateTeacherSchedules();
    saveToLocalStorage();
}

// 顯示錯誤動畫
function showErrorAnimation(element) {
    element.classList.add('error');
    setTimeout(() => element.classList.remove('error'), 500);
}

// 更新教師課表
function updateTeacherSchedules() {
    const teacherScheduleList = document.getElementById('teacherScheduleList');
    teacherScheduleList.innerHTML = '';

    const teacherSchedule = {};
    
    // 整理教師課表數據
    Object.entries(schedule).forEach(([day, times]) => {
        Object.entries(times).forEach(([time, classes]) => {
            classes.forEach(classData => {
                if (!teacherSchedule[classData.teacherCode]) {
                    teacherSchedule[classData.teacherCode] = {};
                }
                if (!teacherSchedule[classData.teacherCode][day]) {
                    teacherSchedule[classData.teacherCode][day] = [];
                }
                teacherSchedule[classData.teacherCode][day].push({
                    time,
                    className: classData.name
                });
            });
        });
    });

    // 生成教師課表HTML
    Object.entries(teacherSchedule).forEach(([teacherCode, schedule]) => {
        const teacherDiv = document.createElement('div');
        teacherDiv.className = 'teacher-schedule';
        teacherDiv.innerHTML = `
            <h3>教師 ${teacherCode} 課表</h3>
            <div class="schedule-content">
                ${Object.entries(schedule).map(([day, classes]) => `
                    <div class="day-schedule">
                        <h4>星期${day}</h4>
                        ${classes.map(c => `<div>${c.time} - ${c.className}</div>`).join('')}
                    </div>
                `).join('')}
            </div>
        `;
        teacherScheduleList.appendChild(teacherDiv);
    });
}

// 生成隨機顏色
function getRandomColor() {
    const colors = [
        '#FFB6C1', '#98FB98', '#87CEFA', '#DDA0DD', '#F0E68C',
        '#E6E6FA', '#FFA07A', '#B0E0E6', '#98FB98', '#FFC0CB'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 保存到本地存儲
function saveToLocalStorage() {
    localStorage.setItem('scheduleData', JSON.stringify({
        classes,
        schedule
    }));
}

// 從本地存儲加載
function loadSavedData() {
    const savedData = localStorage.getItem('scheduleData');
    if (savedData) {
        const data = JSON.parse(savedData);
        classes = data.classes;
        schedule = data.schedule;

        classes.forEach(classData => {
            createClassBox(classData);
        });
        updateTeacherSchedules();
    }
}

// 保存課表
function saveSchedule() {
    saveToLocalStorage();
    alert('課表已保存');
}

// 下載課表
function downloadSchedule() {
    const scheduleText = generateScheduleText();
    const blob = new Blob([scheduleText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '課表.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 複製課表
function copySchedule() {
    const scheduleText = generateScheduleText();
    navigator.clipboard.writeText(scheduleText).then(() => {
        alert('課表已複製到剪貼板');
    }).catch(err => {
        console.error('複製失敗:', err);
        alert('複製失敗，請手動複製');
    });
}

// 生成課表文本
function generateScheduleText() {
    let text = '排課表\n\n';
    
    // 生成總課表
    text += '總課表：\n';
    Object.entries(schedule).forEach(([day, times]) => {
        text += `星期${day}：\n`;
        Object.entries(times).forEach(([time, classes]) => {
            text += `${time}: ${classes.map(c => `${c.name}(${c.teacherCode})`).join(', ')}\n`;
        });
        text += '\n';
    });

    // 生成教師課表
    text += '\n教師課表：\n';
    const teacherSchedule = {};
    Object.entries(schedule).forEach(([day, times]) => {
        Object.entries(times).forEach(([time, classes]) => {
            classes.forEach(classData => {
                if (!teacherSchedule[classData.teacherCode]) {
                    teacherSchedule[classData.teacherCode] = {};
                }
                if (!teacherSchedule[classData.teacherCode][day]) {
                    teacherSchedule[classData.teacherCode][day] = [];
                }
                teacherSchedule[classData.teacherCode][day].push({
                    time,
                    className: classData.name
                });
            });
        });
    });

    Object.entries(teacherSchedule).forEach(([teacherCode, schedule]) => {
        text += `\n教師 ${teacherCode}：\n`;
        Object.entries(schedule).forEach(([day, classes]) => {
            text += `星期${day}：\n`;
            classes.forEach(c => {
                text += `${c.time} - ${c.className}\n`;
            });
        });
    });

    return text;
} 