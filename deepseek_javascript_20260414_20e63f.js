/**
 * Қараңғы/ашық тақырыпты ауыстыру функциясы
 * @returns {void}
 */
function initThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;
    // Жүктеу кезінде сақталған тақырыпты тексеру
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        toggleBtn.textContent = '☀️ Ашық тақырып';
    }
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        toggleBtn.textContent = isDark ? '☀️ Ашық тақырып' : '🌙 Қараңғы тақырып';
    });
}

/**
 * Сұраныс санауышын басқару (жергілікті сақтау)
 * @returns {object} { increment, getCount, resetCount }
 */
function createRequestCounter() {
    let count = parseInt(localStorage.getItem('chatRequestCount') || '0');
    const countSpan = document.getElementById('requestCount');
    if (countSpan) countSpan.innerText = count;

    function updateUI() {
        if (countSpan) countSpan.innerText = count;
        localStorage.setItem('chatRequestCount', count);
    }

    return {
        increment: () => { count++; updateUI(); },
        getCount: () => count,
        resetCount: () => { count = 0; updateUI(); }
    };
}

/**
 * Чатқа хабарлама қосу
 * @param {string} text - хабарлама мәтіні
 * @param {'user'|'bot'|'system'} sender - жіберуші түрі
 */
function addChatMessage(text, sender) {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', sender);
    messageDiv.innerText = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * API арқылы жауап алу (OpenAI / Claude стилі)
 * Нақты API кілтін қолдану үшін `apiKey` айнымалысын өзгертіңіз.
 * ЕСКЕРТУ: Өндірісте API кілтін клиентте сақтау ҚАУІПСІЗ ЕМЕС. Бұл тек оқу тапсырмасы.
 * @param {string} userMessage 
 * @returns {Promise<string>}
 */
async function fetchAIResponse(userMessage) {
    // 🔑 ӨЗ API КІЛТІҢІЗДІ МЫНДА ЕНГІЗІҢІЗ (тегін кілт алу үшін platform.openai.com немесе claude.ai)
    const API_KEY = ''; // <--- мысалы: "sk-..." (OpenAI) немесе Антропик кілті
    const USE_CLAUDE = true; // егер Claude API қолдансаңыз true, OpenAI false

    // Егер API кілті жоқ болса, демо-режим (тест жауап)
    if (!API_KEY) {
        console.warn('API кілті жоқ. Демо-режимде жауап беріледі.');
        return `[ДЕМО] Сіздің сұрағыңыз: "${userMessage}". Нақты AI жауабы үшін script.js ішіне API_KEY енгізіңіз.`;
    }

    try {
        let endpoint, headers, body;
        if (USE_CLAUDE) {
            // Claude API (Anthropic) - мысал, нақты эндпоинт v1/messages
            endpoint = 'https://api.anthropic.com/v1/messages';
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'anthropic-version': '2023-06-01'
            };
            body = {
                model: 'claude-3-haiku-20240307',
                max_tokens: 300,
                messages: [{ role: 'user', content: userMessage }]
            };
        } else {
            // OpenAI API
            endpoint = 'https://api.openai.com/v1/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            };
            body = {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: userMessage }],
                max_tokens: 300
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API қатесі ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        // Жауапты парсинг
        if (USE_CLAUDE) {
            return data.content[0].text;
        } else {
            return data.choices[0].message.content;
        }
    } catch (error) {
        console.error('AI сұранысы сәтсіз:', error);
        return `Қате: ${error.message}. API кілтін тексеріңіз.`;
    }
}

/**
 * Жіберу батырмасын өңдеу
 * @param {object} counter - санауыш объектісі
 */
function initChat(counter) {
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    const clearBtn = document.getElementById('clearChatBtn');

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Пайдаланушы хабарын көрсету
        addChatMessage(message, 'user');
        userInput.value = '';
        // Уақытша "жазылуда" индикаторы
        addChatMessage('🤔 Жауап жазылуда...', 'bot');
        counter.increment();

        // AI жауабын алу
        const aiReply = await fetchAIResponse(message);
        // Соңғы "жазылуда" хабарын алып тастап, нақты жауапты қосу
        const chatBox = document.getElementById('chatBox');
        if (chatBox.lastChild && chatBox.lastChild.innerText.includes('Жауап жазылуда')) {
            chatBox.removeChild(chatBox.lastChild);
        }
        addChatMessage(aiReply, 'bot');
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Чатты тазалау (тек хабарларды, system хабарын қалдырады)
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const chatBox = document.getElementById('chatBox');
            while (chatBox.children.length > 1) {
                chatBox.removeChild(chatBox.lastChild);
            }
            // Санауышты қалауыңызша нөлге келтіру (міндетті емес)
            // counter.resetCount();
        });
    }
}

/**
 * Карточкаларды скроллда анимациялау (Intersection Observer)
 */
function initScrollAnimation() {
    const cards = document.querySelectorAll('.card');
    // Бастапқыда карточкаларды мөлдір етіп, анимацияны бақылаушы қосады
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    cards.forEach(card => {
        card.style.opacity = '0';   // CSS анимациясы бұған дейін жүрмеуі үшін
        card.style.transform = 'translateY(20px)';
        observer.observe(card);
    });
}

// Барлығын іске қосу
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    const counter = createRequestCounter();
    initChat(counter);
    initScrollAnimation();
});