document.addEventListener("DOMContentLoaded", function() {
    // 1. Wstrzyknięcie stylów CSS bota na stronę
    const style = document.createElement('style');
    style.innerHTML = `
        .ania-container { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; flex-direction: column; align-items: flex-end; font-family: 'Inter', sans-serif; }
        .ania-avatar { width: 65px; height: 65px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 20px rgba(15, 118, 110, 0.3); cursor: pointer; position: relative; transition: transform 0.3s; background: #fff; overflow: hidden; }
        .ania-avatar:hover { transform: scale(1.1); }
        .ania-avatar img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
        .status-dot { width: 14px; height: 14px; background: #10B981; border: 2px solid white; border-radius: 50%; position: absolute; bottom: 4px; right: 4px; animation: pulse-dot 2s infinite; }
        .status-dot-small { width: 10px; height: 10px; background: #10B981; border: 1.5px solid white; border-radius: 50%; position: absolute; bottom: 0; right: 0; }
        @keyframes pulse-dot { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        .ania-bubble { background: white; padding: 12px 16px; border-radius: 12px 12px 0 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 12px; font-size: 0.9rem; color: #1E293B; font-weight: 500; max-width: 260px; position: relative; opacity: 0; transform: translateY(10px); transition: all 0.4s ease; pointer-events: none; }
        .ania-bubble.visible { opacity: 1; transform: translateY(0); pointer-events: all; }
        .ania-close-bubble { position: absolute; top: -8px; right: -8px; background: #eee; width: 20px; height: 20px; border-radius: 50%; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #666; }
        .ania-chat-window { position: absolute; bottom: 80px; right: 0; width: 360px; height: 500px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow: hidden; opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none; transition: all 0.3s; border: 1px solid #E2E8F0; }
        .ania-chat-window.active { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
        .ania-header { background: #F8FAFC; padding: 16px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; }
        .ania-messages { flex: 1; padding: 16px; overflow-y: auto; background: #fff; display: flex; flex-direction: column; gap: 12px; }
        .msg { padding: 10px 14px; border-radius: 12px; font-size: 0.9rem; line-height: 1.5; max-width: 85%; animation: popIn 0.3s ease; }
        .msg.bot { background: #F1F5F9; color: #1E293B; border-bottom-left-radius: 2px; align-self: flex-start; }
        .msg.user { background: #0F766E; color: white; border-bottom-right-radius: 2px; align-self: flex-end; }
        .ania-options-area { padding: 12px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
        .chat-btn { background: white; border: 1px solid #0F766E; color: #0F766E; padding: 8px 14px; border-radius: 99px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .chat-btn:hover { background: #0F766E; color: white; }
        @keyframes popIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 480px) { .ania-chat-window { width: 300px; right: -10px; height: 450px; } }
    `;
    document.head.appendChild(style);

    // 2. Wstrzyknięcie struktury HTML na stronę
    const widget = document.createElement('div');
    widget.id = 'ania-widget';
    widget.className = 'ania-container';
    widget.innerHTML = `
        <div class="ania-bubble" id="ania-greeting">
            Dzień dobry! ☀️ Jestem Wirtualną Asystentką NCNI. Kliknij we mnie, a odpowiem na Twoje pytania.
            <span class="ania-close-bubble" onclick="closeGreeting(event)">✕</span>
        </div>

        <div class="ania-chat-window glass" id="ania-window">
            <div class="ania-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="position:relative;">
                        <img src="ania.jpg" alt="Ania" style="width:35px; height:35px; border-radius:50%; object-fit:cover; object-position: top;">
                        <div class="status-dot-small"></div>
                    </div>
                    <div>
                        <strong style="display:block; line-height:1.1; color:#1E293B;">Ania NCNI</strong>
                        <span style="font-size: 0.75rem; color: #0F766E;">Wirtualny Asystent</span>
                    </div>
                </div>
                <button onclick="toggleAnia()" style="background:none; border:none; cursor:pointer; font-size:1.2rem; color: #64748B;">✕</button>
            </div>
            <div class="ania-messages" id="ania-messages-area"></div>
            <div class="ania-options-area" id="ania-options-area"></div>
        </div>

        <div class="ania-avatar" onclick="toggleAnia()">
            <img src="ania.jpg" alt="Ania Chat">
            <div class="status-dot"></div>
        </div>
    `;
    document.body.appendChild(widget);

    // 3. Logika działania bota
    initBotLogic();
});

function initBotLogic() {
    const chatKnowledge = {
        'start': { text: "Cześć! 👋 W czym mogę Ci pomóc?", options: [{ label: "🧠 ADHD / ADD", next: 'adhd_info' }, { label: "🧩 Autyzm (ASD)", next: 'asd_info' }, { label: "💰 Cennik / Oferta", next: 'oferta' }, { label: "📅 Umów wizytę", action: 'booking' }] },
        'adhd_info': { text: "Oferujemy pełną diagnozę (DIVA-5, MOXO) oraz treningi VR i Biofeedback.", options: [{ label: "Jak wygląda diagnoza?", next: 'adhd_diagnoza' }, { label: "Na czym polega terapia?", next: 'adhd_terapia' }, { label: "Wróć", next: 'start' }] },
        'adhd_diagnoza': { text: "1. Wywiad kliniczny (DIVA-5).\n2. Test MOXO.\n3. Raport końcowy.", options: [{ label: "Chcę się zapisać", action: 'booking' }, { label: "Co to jest MOXO?", next: 'moxo' }] },
        'moxo': { text: "MOXO to komputerowy test badający uwagę, czas reakcji i impulsywność.", options: [{ label: "Rozumiem", next: 'start' }, { label: "Umów badanie", action: 'booking' }] },
        'adhd_terapia': { text: "Wykorzystujemy VR (Wirtualną Rzeczywistość) i Biofeedback HRV do treningu skupienia.", options: [{ label: "Zapisz mnie", action: 'booking' }, { label: "Wróć", next: 'start' }] },
        'asd_info': { text: "Jesteśmy miejscem przyjaznym osobom w spektrum (Neurodiversity Affirming).", options: [{ label: "Umów konsultację", action: 'booking' }, { label: "Wróć", next: 'start' }] },
        'oferta': { text: "Oferujemy diagnozę, psychoterapię, VR, Biofeedback i dietetykę.", options: [{ label: "Adres?", next: 'adres' }, { label: "Umów wizytę", action: 'booking' }] },
        'adres': { text: "Wrocław, ul. Stefana Żeromskiego 60/5a.", options: [{ label: "Dzięki!", next: 'start' }] }
    };

    const chatWindow = document.getElementById('ania-window');
    const messagesArea = document.getElementById('ania-messages-area');
    const optionsArea = document.getElementById('ania-options-area');
    const bubble = document.getElementById('ania-greeting');
    let isChatOpen = false;

    window.toggleAnia = function() {
        isChatOpen = !isChatOpen;
        chatWindow.classList.toggle('active', isChatOpen);
        bubble.classList.remove('visible');
        if(isChatOpen && messagesArea.children.length === 0) loadScenario('start');
    };

    window.closeGreeting = function(e) { 
        e.stopPropagation(); 
        bubble.classList.remove('visible'); 
    };

    setTimeout(() => { if(!isChatOpen) bubble.classList.add('visible'); }, 3000);

    function addMessage(text, sender) {
        const div = document.createElement('div'); 
        div.classList.add('msg', sender);
        div.innerHTML = text.replace(/\n/g, '<br>');
        messagesArea.appendChild(div); 
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function loadScenario(key) {
        const data = chatKnowledge[key]; if(!data) return;
        showTypingIndicator();
        setTimeout(() => { 
            removeTypingIndicator(); 
            addMessage(data.text, 'bot'); 
            renderOptions(data.options); 
        }, 600);
    }

    function renderOptions(options) {
        optionsArea.innerHTML = '';
        if(!options) return;
        options.forEach(opt => {
            const btn = document.createElement('button'); 
            btn.classList.add('chat-btn'); 
            btn.innerText = opt.label;
            btn.onclick = () => handleUserChoice(opt); 
            optionsArea.appendChild(btn);
        });
    }

    function handleUserChoice(opt) {
        addMessage(opt.label, 'user'); 
        optionsArea.innerHTML = '';
        if (opt.action === 'booking') {
            window.location.href = 'index.html#rezerwacja';
            if(window.innerWidth < 480) toggleAnia();
            setTimeout(() => { addMessage("Przeniosłam Cię do sekcji kontaktu na stronie głównej. Powodzenia! 😊", 'bot'); }, 500);
        } else if (opt.next) { 
            loadScenario(opt.next); 
        }
    }

    function showTypingIndicator() {
        const loader = document.createElement('div'); 
        loader.id = 'typing-loader'; 
        loader.className = 'msg bot';
        loader.style.color = '#aaa'; 
        loader.innerText = '...';
        messagesArea.appendChild(loader); 
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function removeTypingIndicator() { 
        const loader = document.getElementById('typing-loader'); 
        if(loader) loader.remove(); 
    }
}
