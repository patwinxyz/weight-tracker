import './style.css'
import { getTodayDate, loadData, addOrUpdateEntry, deleteFoodItem, loginWithGoogle, logout, subscribeToAuthChanges } from './store.js'
import Chart from 'chart.js/auto'

// DOM Elements
const loginContainer = document.getElementById('login-container');
const appContent = document.getElementById('app-content');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userProfile = document.getElementById('user-profile');
const userNameDisplay = document.getElementById('user-name');

const dateInput = document.getElementById('entry-date');
const weightInput = document.getElementById('weight-input');
const saveWeightBtn = document.getElementById('save-weight-btn');
const foodInput = document.getElementById('food-input');
const mealTypeSelect = document.getElementById('meal-type');
const saveFoodBtn = document.getElementById('save-food-btn');
const currentWeightDisplay = document.getElementById('current-weight-display');
const historyList = document.getElementById('history-list');
const ctx = document.getElementById('weight-chart').getContext('2d');

let weightChart;
let currentUser = null;

// Initialize
const init = async () => {
    dateInput.value = getTodayDate();

    // Check Auth State
    subscribeToAuthChanges(async (user) => {
        currentUser = user;
        if (user) {
            // Logged In
            loginContainer.style.display = 'none';
            appContent.style.display = 'block';
            userProfile.style.display = 'flex';
            userNameDisplay.textContent = user.displayName || user.email;
            await render();
        } else {
            // Logged Out
            loginContainer.style.display = 'block';
            appContent.style.display = 'none';
            userProfile.style.display = 'none';
            userNameDisplay.textContent = '';
        }
    });
};

// Auth Event Listeners
loginBtn.addEventListener('click', async () => {
    try {
        await loginWithGoogle();
    } catch (error) {
        alert("登入失敗: " + error.message);
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await logout();
    } catch (error) {
        alert("登出失敗: " + error.message);
    }
});

// Render UI
const render = async () => {
    if (!currentUser) return;

    // Show loading state if needed, but for now just wait
    const data = await loadData(currentUser.uid);

    // Update Current Weight
    const lastWeightEntry = [...data].reverse().find(entry => entry.weight);
    if (lastWeightEntry) {
        currentWeightDisplay.textContent = `${lastWeightEntry.weight} kg`;
    } else {
        currentWeightDisplay.textContent = '-- kg';
    }

    // Update Chart
    renderChart(data);

    // Update History
    renderHistory(data);
};

// Render Chart
const renderChart = (data) => {
    const labels = data.map(entry => entry.date);
    const weights = data.map(entry => entry.weight);

    if (weightChart) {
        weightChart.destroy();
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '體重 (kg)',
                data: weights,
                borderColor: '#4CAF50',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
};

// Render History
const renderHistory = (data) => {
    historyList.innerHTML = '';

    // Show latest first
    [...data].reverse().forEach(entry => {
        const card = document.createElement('div');
        card.className = 'history-card';

        let foodHtml = '';
        if (entry.food && entry.food.length > 0) {
            foodHtml = '<ul class="food-list">';
            entry.food.forEach((item, index) => {
                foodHtml += `
                <li>
                    <span>${item}</span>
                    <button class="delete-btn" data-date="${entry.date}" data-item="${item}">×</button>
                </li>`;
            });
            foodHtml += '</ul>';
        } else {
            foodHtml = '<p class="no-food">無飲食記錄。</p>';
        }

        card.innerHTML = `
      <div class="history-header">
        <h3>${entry.date}</h3>
        <span class="history-weight">${entry.weight ? entry.weight + ' kg' : '-'}</span>
      </div>
      <div class="history-body">
        ${foodHtml}
      </div>
    `;
        historyList.appendChild(card);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const date = e.target.dataset.date;
            const item = e.target.dataset.item; // Firestore needs exact item to remove from array
            if (confirm('確定要刪除嗎？')) {
                if (!currentUser) return;
                await deleteFoodItem(currentUser.uid, date, item);
                await render();
            }
        });
    });
};

// Event Listeners
saveWeightBtn.addEventListener('click', async () => {
    const date = dateInput.value;
    const weight = weightInput.value;
    if (date && weight) {
        if (!currentUser) return;
        saveWeightBtn.disabled = true;
        saveWeightBtn.textContent = '儲存中...';
        await addOrUpdateEntry(currentUser.uid, date, 'weight', weight);
        weightInput.value = '';
        saveWeightBtn.disabled = false;
        saveWeightBtn.textContent = '儲存體重';
        await render();
    } else {
        alert('請輸入日期和體重。');
    }
});

saveFoodBtn.addEventListener('click', async () => {
    const date = dateInput.value;
    const food = foodInput.value;
    const mealType = mealTypeSelect.value;

    if (date && food) {
        if (!currentUser) return;
        saveFoodBtn.disabled = true;
        saveFoodBtn.textContent = '新增中...';
        const foodDescription = `${mealType}: ${food}`;
        await addOrUpdateEntry(currentUser.uid, date, 'food', foodDescription);
        foodInput.value = '';
        saveFoodBtn.disabled = false;
        saveFoodBtn.textContent = '新增食物';
        await render();
    } else {
        alert('請輸入日期和食物項目。');
    }
});

init();
