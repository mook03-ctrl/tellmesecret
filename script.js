import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, limit, getDocs, deleteDoc, doc, increment
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUqe-XAbE1XkUh0i511LJ82emllR1AAFQ",
  authDomain: "tellmescret.firebaseapp.com",
  projectId: "tellmescret",
  storageBucket: "tellmescret.firebasestorage.app",
  messagingSenderId: "373304860236",
  appId: "1:373304860236:web:f70646ad6e4c0f68361ee9",
  measurementId: "G-V1V7P6L0RT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const secretsCollection = collection(db, "secrets");

// Pre-populated secrets to establish the mood (Base Data)
const dummySecrets = [
    // English
    { text: "I just saw a stray cat and it made my day. It was so fluffy I wanted to take it home.", category: "To everyone", adult: false },
    { text: "I didn't do anything productive today, but somehow I'm okay with that. Sometimes doing nothing is exactly what you need.", category: "To me", adult: false },
    { text: "Just randomly thought about that one time I tripped in middle school. Why does my brain remember this?", category: "To everyone", adult: false },
    { text: "I really want a pizza right now, but it's 2 AM. The struggle is real.", category: "To everyone", adult: false },
    
    // Korean
    { text: "오늘 길가다가 진짜 귀여운 강아지를 봤다. 꼬리를 살랑살랑 흔드는데 심장 멎는 줄 알았어.", category: "To everyone", adult: false },
    { text: "다이어트 한다고 해놓고 방금 라면 물 올렸다. 뭐 어때, 맛있게 먹으면 0칼로리.", category: "To me", adult: false },
    { text: "비 오는 날 집에서 빗소리 들으면서 커피 마시는 게 세상에서 제일 좋아.", category: "To everyone", adult: false },
    { text: "아무것도 안 하고 누워만 있었는데 벌써 저녁이야. 내 주말 어디 갔지?", category: "To me", adult: false },

    // Japanese
    { text: "今日見た夕焼けがすごく綺麗だった。ただそれだけだけど、誰かにも見せたかったな。", category: "To everyone", adult: false },
    { text: "ダイエット中なのに甘いものを食べてしまった。明日から本気出す…たぶん。", category: "To me", adult: false },
    { text: "昔好きだった曲を久しぶりに聴いたら、あの頃の匂いがした気がする。", category: "To everyone", adult: false },
    { text: "何もしたくない日ってあるよね。今日は一日中パジャマで過ごした。", category: "To me", adult: false },

    // Spanish
    { text: "Hoy vi un perro en la calle y me sonrió. Quizás fue mi imaginación, pero me hizo el día.", category: "To everyone", adult: false },
    { text: "Prometí hacer ejercicio pero aquí estoy, comiendo helado. Mañana será otro día.", category: "To me", adult: false },
    { text: "Qué lindo es dormir mientras llueve. Ese sonido me da una paz increíble.", category: "To everyone", adult: false },
    { text: "Tengo muchas cosas que hacer, pero primero una siesta. Las prioridades son claras.", category: "To me", adult: false },
    
    // Adult Only (19+) Themes (Still random venting but 19+)
    { text: "I went out drinking thinking I'd just have one beer. Woke up on my friend's lawn. Classic.", category: "To everyone", adult: true },
    { text: "어제 술김에 전 애인한테 자니? 라고 보냈다. 진짜 이불킥 오천번 하고 싶다 ㅠㅠ 미쳤지 내가.", category: "To me", adult: true },
    { text: "飲み会で調子に乗って上司のモノマネをしたら、後ろに本人がいた。明日会社に行きたくない。", category: "To everyone", adult: true },
    { text: "Me tomé tres tequilas de más y le escribí a mi ex. ¿Por qué el alcohol me hace hacer estas cosas?", category: "To me", adult: true }
];

let basePostsRegistered = 2400; // Base thematic counter
let totalDisplayedCounter = "...";
let allSecrets = [...dummySecrets];
let currentDisplayed = [];
let availableUnlocks = 0;
let currentSearchQuery = '';

// DOM references
const secretsContainer = document.getElementById('secrets-container');
const secretCounter = document.getElementById('secret-counter');
const moreBtn = document.getElementById('more-btn');
const adModal = document.getElementById('ad-modal');
const closeModal = document.getElementById('close-modal');
const secretInput = document.getElementById('secret-input');
const recipientSelect = document.getElementById('recipient-select');
const categorySelect = document.getElementById('category-select');
const adultOnlyCheckbox = document.getElementById('adult-only');
const submitBtn = document.getElementById('submit-btn');
const filterAdultView = document.getElementById('filter-adult-view');
const authorInput = document.getElementById('author-input');
const authorSearch = document.getElementById('author-search');
const searchBtn = document.getElementById('search-btn');
const secretsCarousel = document.querySelector('.secrets-carousel');

// Admin DOM
const adminDashboard = document.getElementById('admin-dashboard');
const exitAdminBtn = document.getElementById('exit-admin-btn');
const adminLoading = document.getElementById('admin-loading');
const adminContent = document.getElementById('admin-content');
const adminTotalPosts = document.getElementById('admin-total-posts');
const statPersonal = document.getElementById('stat-personal');
const statSociety = document.getElementById('stat-society');
const statCompany = document.getElementById('stat-company');
const adminDailyChart = document.getElementById('admin-daily-chart');
const moderationList = document.getElementById('moderation-list');

let currentLang = 'en';
const userLang = navigator.language || navigator.userLanguage || '';
if (userLang.toLowerCase().includes('ko')) {
    currentLang = 'ko';
    document.body.setAttribute('data-lang', 'ko');
} else if (userLang.toLowerCase().includes('ja')) {
    currentLang = 'ja';
    document.body.setAttribute('data-lang', 'ja');
}
const langEnBtn = document.getElementById('lang-en');
const langKoBtn = document.getElementById('lang-ko');
const langJaBtn = document.getElementById('lang-ja');

// Sync button states on load
if (langEnBtn && langKoBtn && langJaBtn) {
    langEnBtn.classList.remove('active');
    langKoBtn.classList.remove('active');
    langJaBtn.classList.remove('active');
    if (currentLang === 'ko') langKoBtn.classList.add('active');
    else if (currentLang === 'ja') langJaBtn.classList.add('active');
    else langEnBtn.classList.add('active');
}

const placeholderPrompts = {
    en: [
        "What are you thinking right now?",
        "Did anything fun happen today?",
        "Leave a random note about literally anything.",
        "What do you want to eat right now?",
        "Just doodle whatever comes to mind."
    ],
    ko: [
        "지금 머릿속에 떠오르는 생각은 뭐예요?",
        "오늘 하루 중 가장 재밌었던 일은?",
        "아무 이유 없이 그냥 흔적을 남겨보세요.",
        "지금 제일 먹고 싶은 음식이 뭐예요?",
        "생각나는 대로 아무거나 끄적여보세요."
    ],
    ja: [
        "今何を考えていますか？",
        "今日何か面白いことあった？",
        "ただ理由もなく、メモを残してみてください。",
        "今一番食べたいものは何ですか？",
        "思い浮かんだことをそのまま書いてみてください。"
    ]
};

function updateLanguageUI() {
    // Dropdowns
    if (currentLang === 'ko') {
        recipientSelect.options[0].text = "누군가에게";
        recipientSelect.options[1].text = "당신에게";
        categorySelect.options[0].text = "개인";
        categorySelect.options[1].text = "사회";
        categorySelect.options[2].text = "회사";
    } else if (currentLang === 'ja') {
        recipientSelect.options[0].text = "誰かへ";
        recipientSelect.options[1].text = "あなたへ";
        categorySelect.options[0].text = "個人";
        categorySelect.options[1].text = "社会";
        categorySelect.options[2].text = "会社";
    } else {
        recipientSelect.options[0].text = "To someone";
        recipientSelect.options[1].text = "To you";
        categorySelect.options[0].text = "Personal";
        categorySelect.options[1].text = "Society";
        categorySelect.options[2].text = "Company";
    }
    
    // Placeholder
    const prompts = placeholderPrompts[currentLang];
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    if (currentLang === 'ko') {
        secretInput.placeholder = `아무 얘기나 끄적여보세요...\n${randomPrompt}`;
        authorSearch.placeholder = '글쓴이로 검색하기';
        authorInput.placeholder = '내가';
    } else if (currentLang === 'ja') {
        secretInput.placeholder = `何でも気軽に書いてみてください...\n${randomPrompt}`;
        authorSearch.placeholder = '作成者で検索';
        authorInput.placeholder = '私';
    } else {
        secretInput.placeholder = `Jot down whatever is on your mind...\n${randomPrompt}`;
        authorSearch.placeholder = 'Search by author';
        authorInput.placeholder = 'SB';
    }
    // Clear any hardcoded default text to reveal the gray placeholder
    if (authorInput.value === '누군가' || authorInput.value === '누구가' || authorInput.value === '내가' || authorInput.value === '私' || authorInput.value === 'SB' || authorInput.value === '익명') {
        authorInput.value = '';
    }
}

if (langEnBtn && langKoBtn && langJaBtn) {
    langEnBtn.addEventListener('click', () => {
        currentLang = 'en';
        document.body.setAttribute('data-lang', 'en');
        langEnBtn.classList.add('active');
        langKoBtn.classList.remove('active');
        langJaBtn.classList.remove('active');
        updateLanguageUI();
    });
    
    langKoBtn.addEventListener('click', () => {
        currentLang = 'ko';
        document.body.setAttribute('data-lang', 'ko');
        langKoBtn.classList.add('active');
        langEnBtn.classList.remove('active');
        langJaBtn.classList.remove('active');
        updateLanguageUI();
    });
    
    langJaBtn.addEventListener('click', () => {
        currentLang = 'ja';
        document.body.setAttribute('data-lang', 'ja');
        langJaBtn.classList.add('active');
        langEnBtn.classList.remove('active');
        langKoBtn.classList.remove('active');
        updateLanguageUI();
    });
}

function init() {
    updateCounter();
    updateLanguageUI();
    
    renderSecrets(); // Render immediately using local secrets
    setupFirebaseListener(); // Sync with real-time DB
}

function setupFirebaseListener() {
    // Query recently added secrets
    const q = query(secretsCollection, orderBy("createdAt", "desc"), limit(150));
    
    // Real-time listener
    onSnapshot(q, (snapshot) => {
        const fetchedSecrets = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Legacy likes migration
            let reactMap = data.reactions || {};
            if (data.likes !== undefined && !reactMap.heart) {
                reactMap.heart = data.likes;
            }
            
            fetchedSecrets.push({
                id: doc.id,
                text: data.text,
                category: data.category,
                recipient: data.recipient,
                adult: data.adult || false,
                author: data.author || (currentLang === 'ko' ? '내가' : (currentLang === 'ja' ? '私' : 'SB')),
                reactions: {
                    heart: reactMap.heart || 0,
                    todac: reactMap.todac || 0,
                    hug: reactMap.hug || 0,
                    sad: reactMap.sad || 0,
                    angry: reactMap.angry || 0
                },
                isFirebase: true
            });
        });

        // Initialize dummy properties safely once
        dummySecrets.forEach((sec, idx) => {
            if (!sec.id) {
                sec.id = 'dummy_' + idx;
                sec.reactions = {
                    heart: Math.floor(Math.random() * 20),
                    hug: Math.floor(Math.random() * 10),
                    sad: Math.floor(Math.random() * 5)
                };
                sec.isFirebase = false;
            }
        });

        // Combine DB secrets and dummy secrets to guarantee a good pool
        allSecrets = [...fetchedSecrets, ...dummySecrets];
        
        // Exact real-time counter! Base + number of actual secrets in DB
        totalDisplayedCounter = basePostsRegistered + snapshot.size;
        updateCounter();

        // Initial render if empty
        if (currentDisplayed.length === 0) {
            renderSecrets();
        }
    });
}

function updateCounter() {
    if (typeof totalDisplayedCounter === 'number') {
        secretCounter.textContent = totalDisplayedCounter.toLocaleString();
    } else {
        secretCounter.textContent = totalDisplayedCounter;
    }
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

function renderSecrets(searchQuery = currentSearchQuery) {
    currentSearchQuery = searchQuery;
    secretsContainer.innerHTML = '';
    
    // Filter target secrets based on the Adult Only toggle
    let targetSecrets = filterAdultView.checked ? 
                        allSecrets.filter(s => s.adult === true) : 
                        allSecrets.filter(s => s.adult !== true);

    // Apply Author search filter
    const isSearching = searchQuery.trim().length > 0;
    if (isSearching) {
        const queryLower = searchQuery.toLowerCase();
        let matchAnonym = false;
        if (queryLower === '내가' || queryLower === '누구가' || queryLower === 'sb' || queryLower === '익명' || queryLower === '누군가' || queryLower === '私') matchAnonym = true;

        targetSecrets = targetSecrets.filter(s => {
            const auth = (s.author || '').toLowerCase();
            return auth.includes(queryLower) || (matchAnonym && (!auth || auth === 'sb' || auth === '익명' || auth === '누군가' || auth === '누구가' || auth === '내가' || auth === '私' || auth === 'anonymous')); // Keep anonymous for legacy posts
        });
        
        secretsCarousel.classList.add('search-mode');
        secretsContainer.classList.add('search-mode');
        moreBtn.style.display = 'none';
    } else {
        secretsCarousel.classList.remove('search-mode');
        secretsContainer.classList.remove('search-mode');
        moreBtn.style.display = 'flex';
    }

    if (targetSecrets.length === 0) {
        currentDisplayed = [];
        secretsContainer.innerHTML = `
            <div class="secret-card glass" style="justify-content: center; align-items: center; text-align: center; max-height: 200px; margin: auto;">
                <i class="fas fa-ghost" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="color: var(--text-dim); font-style: italic;">
                    <span class="en-only">No adult secrets discovered yet...</span>
                    <span class="ko-only">등록된 성인 비밀이 없습니다...</span>
                </p>
            </div>
        `;
        return;
    }

    // Display Logic
    let toDisplay = [];
    if (isSearching) {
        toDisplay = targetSecrets; // Show all matching search
    } else {
        // Pick 3 random secrets that are completely new from target pool
        let available = targetSecrets.filter(s => {
            return !currentDisplayed.some(cd => cd.text === s.text);
        });
        
        if (available.length < 3) {
            available = [...targetSecrets];
        }
        
        toDisplay = shuffle(available).slice(0, 3);
    }
    
    currentDisplayed = isSearching ? [] : toDisplay;
    
    toDisplay.forEach(secret => {
        const cardNode = document.createElement('div');
        cardNode.className = 'secret-card glass';
        
        let repEn = secret.recipient || "";
        let catEn = secret.category || "";
        let repKo = repEn === "To someone" ? "누군가에게" : (repEn === "To you" ? "당신에게" : repEn);
        let catKo = catEn === "Personal" ? "개인" : (catEn === "Society" ? "사회" : (catEn === "Company" ? "회사" : catEn));

        let repJa = repEn === "To someone" ? "誰かへ" : (repEn === "To you" ? "あなたへ" : repEn);
        let catJa = catEn === "Personal" ? "個人" : (catEn === "Society" ? "社会" : (catEn === "Company" ? "会社" : catEn));
        
        const safeAuthor = (secret.author || (currentLang === 'ko' ? '내가' : (currentLang === 'ja' ? '私' : 'SB'))).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        let labelEn = `from ${safeAuthor} • ` + (repEn ? `${repEn} • ${catEn}` : catEn);
        let labelKo = `from ${safeAuthor} • ` + (repKo ? `${repKo} • ${catKo}` : catKo);
        let labelJa = `from ${safeAuthor} • ` + (repJa ? `${repJa} • ${catJa}` : catJa);
        
        if (secret.adult) {
            labelEn += " (Adult only)";
            labelKo += " (성인 게시물)";
            labelJa += " (大人モード)";
        }
        
        const labelSafe = `<span class="en-only">${labelEn}</span><span class="ko-only">${labelKo}</span><span class="ja-only">${labelJa}</span>`;
        
        let visualLength = 0;
        for (let i = 0; i < secret.text.length; i++) {
            visualLength += secret.text.charCodeAt(i) > 255 ? 2.2 : 1;
        }

        const linesCount = secret.text.split('\n').length;
        const needsMore = linesCount > 2 || visualLength > 70;
        
        const safeText = secret.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');

        // Reaction State Setup
        const effectiveId = secret.id || ('temp_' + Math.random().toString(36).substr(2, 9));
        const currentVote = localStorage.getItem('react_' + effectiveId) || (localStorage.getItem('liked_' + effectiveId) ? 'heart' : null);
        
        const reactConfig = [
            { key: 'heart', icon: 'fa-heart', c: 'r-heart' },
            { key: 'hug', icon: 'fa-hands', c: 'r-hug' },
            { key: 'sad', icon: 'fa-sad-tear', c: 'r-sad' }
        ];

        let reactionsHTML = '<div class="reaction-bar">';
        reactConfig.forEach(r => {
            const count = (secret.reactions && secret.reactions[r.key]) ? secret.reactions[r.key] : 0;
            const isActive = (currentVote === r.key);
            const activeClass = isActive ? 'active' : '';
            const displayCount = count > 0 ? count : '';
            
            reactionsHTML += `
                <button class="react-btn ${activeClass} ${r.c}" data-id="${effectiveId}" data-key="${r.key}" data-isfirebase="${secret.isFirebase}">
                    <i class="fas ${r.icon}"></i> 
                    <span class="react-count">${displayCount}</span>
                </button>
            `;
        });
        reactionsHTML += '</div>';

        cardNode.innerHTML = `
            <div class="category-tag">${labelSafe}</div>
            <div class="secret-text">${safeText}</div>
            <div class="card-footer">
                ${reactionsHTML}
                ${needsMore ? '<button class="btn-more"><span class="en-only">more...</span><span class="ko-only">더보기...</span></button>' : '<div></div>'}
            </div>
        `;
        
        secretsContainer.appendChild(cardNode);
    });

    const expandBtns = document.querySelectorAll('.btn-more');
    expandBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const textEl = this.closest('.secret-card').querySelector('.secret-text');
            if (textEl.classList.contains('expanded')) {
                textEl.classList.remove('expanded');
                this.innerHTML = '<span class="en-only">more...</span><span class="ko-only">더보기...</span>';
            } else {
                textEl.classList.add('expanded');
                this.innerHTML = '<span class="en-only">less</span><span class="ko-only">접기</span>';
            }
        });
    });

    const reactBtns = document.querySelectorAll('.react-btn');
    reactBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            const key = this.getAttribute('data-key');
            const isFb = this.getAttribute('data-isfirebase') === 'true';
            
            // One Reaction Per Post Logic
            const legacyLiked = localStorage.getItem('liked_' + id);
            const existingVote = localStorage.getItem('react_' + id);
            
            if (legacyLiked || existingVote) {
                // To keep it simple, we don't allow swapping yet, just notify them.
                if (existingVote !== key) {
                    alert("하나의 글에는 하나의 감정만 남길 수 있습니다.\n(You can only leave one emotion per post.)");
                }
                return;
            }
            
            // Optimistic Local Save
            localStorage.setItem('react_' + id, key);
            
            // Visual Update
            this.classList.add('active');
            const countSpan = this.querySelector('.react-count');
            const currentNum = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = currentNum + 1;
            
            // Firebase Update
            if (isFb) {
                try {
                    await updateDoc(doc(db, "secrets", id), {
                        [`reactions.${key}`]: increment(1)
                    });
                } catch(e) {
                    console.error("Reaction sync failed:", e);
                }
            } else {
                // Update Local Dummy Array
                const target = dummySecrets.find(s => s.id === id);
                if(target) {
                    if(!target.reactions) target.reactions = {};
                    target.reactions[key] = (target.reactions[key] || 0) + 1;
                }
            }
        });
    });
}

// Modal
let adLoaded = false;
moreBtn.addEventListener('click', () => {
    if (availableUnlocks <= 0) return;
    
    // Consume a ticket
    availableUnlocks--;
    if (availableUnlocks === 0) {
        moreBtn.classList.add('disabled');
    }
    
    adModal.classList.remove('hidden');
    if (!adLoaded) {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            adLoaded = true;
        } catch (e) {
            console.error("AdSense Error: ", e);
        }
    }
});

closeModal.addEventListener('click', () => {
    adModal.classList.add('hidden');
    secretsContainer.style.opacity = '0';
    setTimeout(() => {
        renderSecrets();
        secretsContainer.style.opacity = '1';
        secretsContainer.style.transition = 'opacity 0.4s ease';
    }, 400);
});

// Max 5 lines
secretInput.addEventListener('input', function() {
    const lines = this.value.split('\n');
    if (lines.length > 5) {
        this.value = lines.slice(0, 5).join('\n');
    }
});

// Submit to Database
submitBtn.addEventListener('click', async () => {
    const text = secretInput.value.trim();
    
    // Admin interception
    if (text === "170924 관리자") {
        secretInput.value = '';
        openAdminDashboard();
        return;
    }

    // Hidden trigger to explicitly show the adult only toggle
    if (text.toLowerCase() === "show adult only") {
        secretInput.value = '';
        document.querySelector('.filter-adult-control').style.display = 'flex';
        return;
    }
    
    if (!text) return;
    
    const adultKeywords = [
        '섹스', '야동', '자위', '조건만남', '음란', '성관계', '오르가즘', '페티쉬', '모텔', 
        '신음', '정액', '삽입', '보지', '고추', '자지', '성기', '클리토리스', '지스팟', '처녀막',
        'sex', 'porn', 'nude', 'fuck'
    ];
    const isAdultContent = adultKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    if (isAdultContent && !adultOnlyCheckbox.checked) {
        alert("성적인 표현이나 관련 단어가 포함된 글은 'Adult only'를 체크해야 등록할 수 있습니다.\n(Posts containing adult keywords must have 'Adult only' checked.)");
        return;
    }

    // Violent Crime Filter
    const violentKeywords = ['살인', '강간', '살해', '성폭행', '토막', '암살', '납치', '시체', 'rape', 'murder'];
    const isViolentContent = violentKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    if (isViolentContent) {
        alert("살인, 성범죄 등 극단적인 범죄와 관련된 이야기는 플랫폼 정책상 절대 등록할 수 없습니다.\n(Stories related to extreme crimes cannot be shared.)");
        return;
    }

    // Spam Filter
    const spamKeywords = ['바카라', '카지노', '토토', '사다리', '대출', '도박', '스포츠토토', 'http://', 'https://', 'www.'];
    const isSpamContent = spamKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    if (isSpamContent) {
        alert("스팸, 광고성 내용 또는 링크가 포함된 글은 등록할 수 없습니다.\n(Spam, ads, or links are not allowed.)");
        return;
    }

    // Duplicate Check
    const lastPosted = localStorage.getItem('lastPostedSecret');
    if (lastPosted && lastPosted.toLowerCase() === text.toLowerCase()) {
        alert("방금 작성하신 글과 동일한 내용을 반복해서 올릴 수 없습니다.\n(You cannot post the exact same scribble repeatedly.)");
        return;
    }
    
    const isGlobalDuplicate = allSecrets.some(secret => secret.text.toLowerCase() === text.toLowerCase());
    if (isGlobalDuplicate) {
        alert("이미 누군가가 작성했거나 방금 등록된 동일한 내용입니다.\n(This scribble has already been shared recently.)");
        return;
    }

    const lines = text.split('\n');
    if (lines.length > 5) {
        alert("Please limit your scribble to 5 lines maximum.");
        return;
    }

    submitBtn.disabled = true;
    if (currentLang === 'ko') submitBtn.innerHTML = '<span class="ko-only">끄적이는 중...</span>';
    else if (currentLang === 'ja') submitBtn.innerHTML = '<span class="ja-only">書き込み中...</span>';
    else submitBtn.innerHTML = '<span class="en-only">Scribbling...</span>';

    const newSecret = {
        text: text,
        recipient: recipientSelect.value,
        category: categorySelect.value,
        adult: adultOnlyCheckbox.checked,
        author: authorInput.value.trim() || (currentLang === 'ko' ? '내가' : (currentLang === 'ja' ? '私' : 'SB')),
        createdAt: serverTimestamp()
    };
    
    try {
        await addDoc(secretsCollection, newSecret);
        
        // Grant unlock for writing a secret
        availableUnlocks++;
        moreBtn.classList.remove('disabled');
        
        // Save to local storage to prevent immediate duplicate
        localStorage.setItem('lastPostedSecret', text);
        
        // Reset input form
        secretInput.value = '';
        adultOnlyCheckbox.checked = false;
        recipientSelect.value = 'To someone';
        categorySelect.value = 'Personal';
        
        // Show new secrets view visually
        secretsContainer.style.opacity = '0';
        setTimeout(() => {
            // Because onSnapshot is real-time, the data is already updated in allSecrets!
            renderSecrets();
            secretsContainer.style.opacity = '1';
        }, 400);
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Sorry, your scribble couldn't be saved... Try later.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="en-only">Leave Scribble</span><span class="ko-only">끄적이기</span><span class="ja-only">書き込む</span>';
    }
});

// Toggle adult view filter
filterAdultView.addEventListener('change', () => {
    secretsContainer.style.opacity = '0';
    setTimeout(() => {
        renderSecrets();
        secretsContainer.style.opacity = '1';
    }, 400);
});

// Search by Author Logic
authorSearch.addEventListener('input', (e) => {
    renderSecrets(e.target.value);
});
searchBtn.addEventListener('click', () => {
    if (!authorSearch.value.trim()) {
        authorSearch.value = currentLang === 'ko' ? '내가' : 'SB';
        renderSecrets(authorSearch.value);
    }
});

// --- Admin Logic ---
async function openAdminDashboard() {
    adminDashboard.classList.remove('hidden');
    adminLoading.classList.remove('hidden');
    adminContent.classList.add('hidden');
    
    // Set up dummy states
    let total = dummySecrets.length;
    let counts = {
        Personal: 0,
        Society: 0,
        Company: 0
    };
    
    const dateCounts = {};
    const DUMMY_DATE = '2026-04-18';
    dateCounts[DUMMY_DATE] = total; 

    // Categorize dummy secrets safely
    dummySecrets.forEach(s => {
        let cat = s.category;
        if (!['Personal', 'Society', 'Company'].includes(cat)) {
            cat = 'Personal';
        }
        counts[cat] = (counts[cat] || 0) + 1;
    });

    try {
        moderationList.innerHTML = '';
        const snap = await getDocs(secretsCollection);
        
        let fetchedDocs = []; // Array to sort documents newly

        snap.forEach(documentSnap => {
            const data = documentSnap.data();
            total++;
            
            // Category aggregation
            let cat = data.category;
            if (!['Personal', 'Society', 'Company'].includes(cat)) {
                cat = 'Personal'; // fallback for legacy items
            }
            counts[cat] = (counts[cat] || 0) + 1;
            
            // Date aggregation
            let dateStrMeta = DUMMY_DATE;
            let dateObjForSort = new Date('2026-04-18T00:00:00Z');
            
            if (data.createdAt) {
                const dateObj = data.createdAt.toDate();
                dateObjForSort = dateObj;
                const yyyy = dateObj.getFullYear();
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dd = String(dateObj.getDate()).padStart(2, '0');
                dateStrMeta = `${yyyy}-${mm}-${dd}`;
                dateCounts[dateStrMeta] = (dateCounts[dateStrMeta] || 0) + 1;
            } else {
                dateCounts[DUMMY_DATE] = (dateCounts[DUMMY_DATE] || 0) + 1;
            }
            
            // Push for sorting and rendering
            fetchedDocs.push({
                id: documentSnap.id,
                data: data,
                dateObj: dateObjForSort,
                dateStr: dateStrMeta
            });
        });
        
        // Sort newest first
        fetchedDocs.sort((a, b) => b.dateObj - a.dateObj);
        
        fetchedDocs.forEach(item => {
            const modItem = document.createElement('div');
            modItem.className = 'mod-item';
            if (item.data.adult) modItem.setAttribute('data-adult', 'true');
            
            const isAdultFlag = item.data.adult ? `<span style="color:#ff6b6b; font-weight:bold;">[19+] </span>` : '';
            const safeText = (item.data.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            modItem.innerHTML = `
                <div class="mod-meta">
                    <span>${item.data.category || 'Personal'}</span>
                    <span>${item.dateStr}</span>
                </div>
                <div class="mod-text">${isAdultFlag}${safeText}</div>
                <div class="mod-action">
                    <button class="btn-delete" data-id="${item.id}">Delete</button>
                </div>
            `;
            moderationList.appendChild(modItem);
        });
        
        // Bind Delete Events
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idToDelete = e.target.getAttribute('data-id');
                if (confirm("경고: 악성, 명예훼손, 도배 등의 사유로 이 글을 영구 삭제하시겠습니까?\n(Are you sure you want to delete this?)")) {
                    try {
                        await deleteDoc(doc(db, "secrets", idToDelete));
                        // Remove from DOM immediately
                        e.target.closest('.mod-item').remove();
                        // Update basic counter roughly
                        adminTotalPosts.textContent = (parseInt(adminTotalPosts.textContent.replace(/,/g, '')) - 1).toLocaleString();
                    } catch (err) {
                        alert("Deletion failed: " + err.message);
                    }
                }
            });
        });
        
        // Render UI values
        adminTotalPosts.textContent = total.toLocaleString();
        statPersonal.textContent = counts.Personal.toLocaleString();
        statSociety.textContent = counts.Society.toLocaleString();
        statCompany.textContent = counts.Company.toLocaleString();
        
        // Render Chart
        adminDailyChart.innerHTML = '';
        const dates = Object.keys(dateCounts).sort();
        
        let maxCount = 0;
        dates.forEach(d => { if(dateCounts[d] > maxCount) maxCount = dateCounts[d]; });
        if (maxCount === 0) maxCount = 1;
        
        dates.forEach(d => {
            const val = dateCounts[d];
            const heightPerc = Math.max((val / maxCount) * 100, 5); // Minimum 5% visible height
            
            const group = document.createElement('div');
            group.className = 'chart-bar-group';
            
            const labelStr = d.substring(5); // Format: MM-DD
            
            group.innerHTML = `
                <div class="chart-bar" style="height: ${heightPerc}%">
                    <span class="bar-value">${val}</span>
                </div>
                <div class="chart-label">${labelStr}</div>
            `;
            adminDailyChart.appendChild(group);
        });
        
        adminLoading.classList.add('hidden');
        adminContent.classList.remove('hidden');
        
    } catch (e) {
        console.error("Admin fetch error", e);
        adminLoading.innerHTML = `<span style="color:red">Failed to load data: ${e.message}</span>`;
    }
}

exitAdminBtn.addEventListener('click', () => {
    adminDashboard.classList.add('hidden');
});

init();
