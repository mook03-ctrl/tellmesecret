// Pre-populated secrets to establish the mood
const dummySecrets = [
    // English
    { text: "The night you left, I sat on the floor until the sun came up. You told me you'd be back. Fifty-two months ago.", category: "To you", adult: false },
    { text: "I lied about why I quit my job. I didn't find a better opportunity. The truth is, I just couldn't handle the emptiness inside anymore.", category: "To everyone", adult: false },
    { text: "I wear the perfume you hated just to remind myself that we were never meant to be. But I still miss you.", category: "To someone", adult: false },
    { text: "Sometimes I type out long messages to you, agonizing over every word, only to delete them entirely. I am too afraid to disturb the silence.", category: "To you", adult: false },
    
    // Korean
    { text: "네가 쓰던 향수와 같은 향을 맡을 때면 하루종일 아무것도 할 수가 없어. 아직도 내 시간은 그때에 멈춰있나 봐.", category: "To you", adult: false },
    { text: "아직도 내 넷플릭스 프로필 네 이름 옆에 있어. 지울 수가 없어서 그냥 놔뒀어. 가끔 네가 로그인했나 확인해.", category: "To someone", adult: false },
    { text: "부모님껜 승진했다고 거짓말했어. 사실 어제 해고당했는데, 다 큰 자식이 우는 모습은 도저히 보여드릴 용기가 안 나.", category: "To everyone", adult: false },
    { text: "미안해. 그때 내가 널 잡지 않은 건, 네가 더 행복해지길 바라서가 아니라 오직 내 이기심 때문이었어.", category: "To you", adult: false },

    // Japanese
    { text: "携帯の番号、わざと消さずにいるの。もう二度とかけてこないって分かってるのに。", category: "To someone", adult: false },
    { text: "誰にも言えない秘密がある。本当は、すべてを捨てて遠くへ逃げ出したいってこと。毎朝、ホームから線路を見つめてしまう。", category: "To everyone", adult: false },
    { text: "あなたの匂いと似た人とすれ違うたび、心臓が止まりそうになる。振り返って違う人だと気づく時の絶望感。", category: "To you", adult: false },
    { text: "「大丈夫」って言うのは、これ以上誰かを信じて傷つきたくないからついた、ただの嘘だよ。", category: "To everyone", adult: false },

    // Spanish
    { text: "Todavía guardo la carta que me diste. A veces la leo en silencio para recordar qué se siente ser amado.", category: "To you", adult: false },
    { text: "Sonrío todo el día con mis amigos, pero en la noche, el silencio y la soledad me consumen por completo.", category: "To everyone", adult: false },
    { text: "Ayer te vi en la estación. Te veías tan feliz con ella que me dolió respirar, así que me di la vuelta antes de que me vieras.", category: "To someone", adult: false },
    { text: "Nadie sabe que lloro en mi auto antes de entrar a mi propia casa. Aparento que mi vida es perfecta, pero estoy roto por dentro.", category: "To everyone", adult: false }
];

let basePostsRegistered = 247;
let totalDisplayedCounter = basePostsRegistered * 100;
let allSecrets = [...dummySecrets];
let currentDisplayed = [];

// DOM references
const secretsContainer = document.getElementById('secrets-container');
const secretCounter = document.getElementById('secret-counter');
const moreBtn = document.getElementById('more-btn');
const adModal = document.getElementById('ad-modal');
const closeModal = document.getElementById('close-modal');
const secretInput = document.getElementById('secret-input');
const categorySelect = document.getElementById('category-select');
const adultOnlyCheckbox = document.getElementById('adult-only');
const submitBtn = document.getElementById('submit-btn');

function init() {
    updateCounter();
    renderSecrets();
}

function updateCounter() {
    secretCounter.textContent = totalDisplayedCounter.toLocaleString();
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function renderSecrets() {
    // Clear current secrets
    secretsContainer.innerHTML = '';
    
    // Pick 3 random secrets that are completely new (not in currentDisplayed)
    let available = allSecrets.filter(s => !currentDisplayed.includes(s));
    if (available.length < 3) {
        available = [...allSecrets];
    }
    
    const shuffled = shuffle(available);
    currentDisplayed = shuffled.slice(0, 3);
    
    currentDisplayed.forEach(secret => {
        const cardNode = document.createElement('div');
        cardNode.className = 'secret-card glass';
        
        let label = secret.category;
        if (secret.adult) {
            label += " (Adult only)";
        }
        
        // Calculate visual length since non-English characters take more horizontal space
        let visualLength = 0;
        for (let i = 0; i < secret.text.length; i++) {
            visualLength += secret.text.charCodeAt(i) > 255 ? 2.2 : 1;
        }

        // Approximate if it needs a "more..." button based on length or newlines
        const linesCount = secret.text.split('\n').length;
        const needsMore = linesCount > 2 || visualLength > 70;
        
        // Sanitize
        const safeText = secret.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');

        cardNode.innerHTML = `
            <div class="category-tag">${label}</div>
            <div class="secret-text">${safeText}</div>
            ${needsMore ? '<button class="btn-more">more...</button>' : ''}
        `;
        
        secretsContainer.appendChild(cardNode);
    });

    // Attach event listeners for expand buttons
    const expandBtns = document.querySelectorAll('.btn-more');
    expandBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const textEl = this.previousElementSibling;
            if (textEl.classList.contains('expanded')) {
                textEl.classList.remove('expanded');
                this.textContent = 'more...';
            } else {
                textEl.classList.add('expanded');
                this.textContent = 'less';
            }
        });
    });
}

// Modal Logic
moreBtn.addEventListener('click', () => {
    // Show Ad Popup
    adModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
    // Close Modal and simulate loading next batch
    adModal.classList.add('hidden');
    
    // Add brief fade away effect before re-rendering
    secretsContainer.style.opacity = '0';
    setTimeout(() => {
        renderSecrets();
        secretsContainer.style.opacity = '1';
        secretsContainer.style.transition = 'opacity 0.4s ease';
    }, 400);
});

// Input handling (Max 5 lines)
secretInput.addEventListener('input', function() {
    const lines = this.value.split('\n');
    if (lines.length > 5) {
        // Enforce maximum exactly 5 lines
        this.value = lines.slice(0, 5).join('\n');
    }
});

// Submit logic
submitBtn.addEventListener('click', () => {
    const text = secretInput.value.trim();
    if (!text) return;
    
    const lines = text.split('\n');
    if (lines.length > 5) {
        alert("Please limit your secret to 5 lines maximum.");
        return;
    }

    const newSecret = {
        text: text,
        category: categorySelect.value,
        adult: adultOnlyCheckbox.checked
    };
    
    // Add to pool
    allSecrets.unshift(newSecret);
    totalDisplayedCounter++;
    
    // Reset view
    updateCounter();
    
    // Reset input form
    secretInput.value = '';
    adultOnlyCheckbox.checked = false;
    categorySelect.value = 'To someone';
    
    // Optionally we can show the new secret right away or just let them stumble upon it
    // We'll show a fresh randomized batch (which has a slightly higher chance to show the new one)
    secretsContainer.style.opacity = '0';
    setTimeout(() => {
        renderSecrets();
        secretsContainer.style.opacity = '1';
    }, 400);
});

// Initialize on load
init();
