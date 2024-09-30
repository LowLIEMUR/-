// Global variables
let userId;
let taps = 0;
let tapsPerSecond = 0;
let upgrades = {};
let dailyTasks = [];

const UPGRADE_EFFECTS = {
    'upgrade1': { name: 'Faster Tapping', effect: 0.1, cost: 100 },
    'upgrade2': { name: 'Double Tap', effect: 1, cost: 500 },
    'upgrade3': { name: 'Auto Tapper', effect: 5, cost: 1000 }
};

document.addEventListener('DOMContentLoaded', () => {
    userId = getUserIdFromUrl();
    console.log('User ID:', userId);
    if (userId) {
        initializeGame();
    } else {
        showError('User ID not found in URL');
    }
});

function getUserIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('userId');
}

async function initializeGame() {
    try {
        await loadUserData();
        setupEventListeners();
        hideLoadingMessage();
        showGameArea();
        setInterval(updateGame, 1000);
    } catch (error) {
        showError('Failed to initialize game: ' + error.message);
    }
}

function setupEventListeners() {
    document.getElementById('arbuz').addEventListener('click', handleTap);
    document.getElementById('navigation').addEventListener('click', handleNavigation);
}

function handleNavigation(event) {
    if (event.target.tagName === 'BUTTON') {
        const section = event.target.dataset.section;
        showSection(section);
    }
}

function handleTap() {
    taps++;
    updateUserData();
    updateDisplay();
}

async function loadUserData() {
    try {
        const response = await fetch(`/get_user_data?userId=${userId}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const data = await response.json();
        taps = data.taps || 0;
        upgrades = data.upgrades || {};
        dailyTasks = data.dailyTasks || [];
        calculateTapsPerSecond();
        updateDisplay();
    } catch (error) {
        console.error('Error loading user data:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

async function updateUserData() {
    const response = await fetch('/update_user_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taps, upgrades, dailyTasks })
    });
    if (!response.ok) throw new Error('Failed to update user data');
}

function calculateTapsPerSecond() {
    tapsPerSecond = Object.entries(upgrades).reduce((total, [upgradeId, count]) => {
        return total + (UPGRADE_EFFECTS[upgradeId].effect * count);
    }, 0);
}

function updateDisplay() {
    document.getElementById('tapCount').textContent = Math.floor(taps);
    document.getElementById('tapsPerSecond').textContent = tapsPerSecond.toFixed(1);
}

function showSection(sectionId) {
    const sections = ['gameArea', 'shop', 'dailyTasks', 'leaderboard'];
    sections.forEach(id => {
        document.getElementById(id).classList.toggle('hidden', id !== sectionId);
    });

    if (sectionId === 'shop') loadShop();
    if (sectionId === 'dailyTasks') loadDailyTasks();
    if (sectionId === 'leaderboard') loadLeaderboard();
}

function loadShop() {
    const shopList = document.getElementById('upgradesList');
    shopList.innerHTML = '';

    Object.entries(UPGRADE_EFFECTS).forEach(([upgradeId, upgradeInfo]) => {
        const li = document.createElement('li');
        const count = upgrades[upgradeId] || 0;
        li.textContent = `${upgradeInfo.name} (${count}) - Cost: ${upgradeInfo.cost} taps`;
        const buyButton = document.createElement('button');
        buyButton.textContent = 'Buy';
        buyButton.addEventListener('click', () => buyUpgrade(upgradeId));
        li.appendChild(buyButton);
        shopList.appendChild(li);
    });
}

async function buyUpgrade(upgradeId) {
    const upgrade = UPGRADE_EFFECTS[upgradeId];
    if (taps >= upgrade.cost) {
        taps -= upgrade.cost;
        upgrades[upgradeId] = (upgrades[upgradeId] || 0) + 1;
        calculateTapsPerSecond();
        updateDisplay();
        loadShop();
        await updateUserData();
    } else {
        alert('Not enough taps to buy this upgrade!');
    }
}

async function loadDailyTasks() {
    const response = await fetch(`/get_daily_tasks?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to load daily tasks');
    const data = await response.json();
    dailyTasks = data.tasks;
    displayDailyTasks();
}

function displayDailyTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '';

    dailyTasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = `${task.description} - Progress: ${task.progress}/${task.target}`;
        if (task.progress >= task.target && !task.completed) {
            const completeButton = document.createElement('button');
            completeButton.textContent = 'Complete';
            completeButton.addEventListener('click', () => completeTask(task.id));
            li.appendChild(completeButton);
        }
        tasksList.appendChild(li);
    });
}

async function completeTask(taskId) {
    const response = await fetch('/complete_daily_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskId })
    });
    if (!response.ok) throw new Error('Failed to complete task');
    const data = await response.json();
    if (data.success) {
        taps += data.reward;
        await loadDailyTasks();
        updateDisplay();
    }
}

async function loadLeaderboard() {
    const response = await fetch('/leaderboard');
    if (!response.ok) throw new Error('Failed to load leaderboard');
    const data = await response.json();
    displayLeaderboard(data.leaderboard);
}

function displayLeaderboard(leaderboardData) {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';

    leaderboardData.forEach((entry, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${entry.name} - ${Math.floor(entry.taps)} taps`;
        leaderboardList.appendChild(li);
    });
}

function updateGame() {
    taps += tapsPerSecond;
    updateDisplay();
    updateUserData();
}

function hideLoadingMessage() {
    document.getElementById('loadingMessage').classList.add('hidden');
}

function showGameArea() {
    document.getElementById('gameArea').classList.remove('hidden');
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error';
    errorElement.textContent = message;
    document.body.innerHTML = '';
    document.body.appendChild(errorElement);
}
