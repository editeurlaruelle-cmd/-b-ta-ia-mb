document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatContainer = document.getElementById('chatContainer');
    const welcomeSection = document.getElementById('welcomeSection');
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const reportBugBtn = document.getElementById('reportBugBtn');
    
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const API_URL = 'https://unsupercilious-carma-unsymbolized.ngrok-free.dev/';

    userInput.addEventListener('input', () => {
        if (userInput.value.trim() !== "") {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });

    async function sendMessage() {
        const text = userInput.value.trim();
        if (text === "") return;

        if (welcomeSection && welcomeSection.style.display !== 'none') {
            welcomeSection.style.display = 'none';
        }

        appendMessage(text, 'user');
        userInput.value = "";
        userInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        await callVeyrosAPI(text);
    }

    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        if (sender === 'ai') {
            messageDiv.innerHTML = `<b>Veyros AI :</b> <div class="ai-content">${formaterReponse(text)}</div>`;
        } else {
            messageDiv.textContent = text;
        }

        chatContainer.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv.querySelector('.ai-content') || messageDiv;
    }

    function formaterReponse(texte) {
        let html = texte.replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const codeId = 'code_' + Math.random().toString(36).substr(2, 9);
            return `<div class="code-box-wrapper" style="background:#090d16; border:1px solid #334155; border-radius:6px; margin:10px 0; overflow:hidden;">
                <div class="code-header" style="background:#162032; padding:6px 12px; display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#94a3b8;">
                    <span>${lang ? lang.toUpperCase() : 'CODE'}</span>
                    <button class="copy-btn" onclick="copierCode('${codeId}')" style="background:#334155; color:white; border:none; padding:3px 8px; border-radius:4px; font-size:11px; cursor:pointer;">Copier</button>
                </div>
                <pre><code id="${codeId}" style="font-family:'Courier New',Courier,monospace; display:block; padding:12px; overflow-x:auto; color:#38bdf8; font-size:14px; margin:0;">${escapedCode}</code></pre>
            </div>`;
        });

        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/^[•\-]\s+(.*)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="margin: 5px 0 5px 20px; padding-left: 0;">$1</ul>');
        html = html.replace(/<\/ul>\s*<ul[^>]*>/g, '');
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    async function callVeyrosAPI(promptText) {
        const aiContentDiv = appendMessage('...', 'ai');
        let texteComplet = "";

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText })
            });

            const contentType = response.headers.get("content-type");
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Erreur HTTP ${response.status}: ${errText}`);
            }

            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                aiContentDiv.innerHTML = formaterReponse(data.response || data.error || "Réponse vide");
            } else if (contentType && (contentType.includes("ndjson") || contentType.includes("stream"))) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                aiContentDiv.innerHTML = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    const lignes = chunk.split('\n');
                    
                    for (let ligne of lignes) {
                        if (ligne.trim() !== "") {
                            try {
                                const jsonPart = JSON.parse(ligne);
                                if (jsonPart.response) {
                                    texteComplet += jsonPart.response;
                                    aiContentDiv.innerHTML = formaterReponse(texteComplet);
                                    scrollToBottom();
                                }
                            } catch (e) {}
                        }
                    }
                }
            } else {
                const rawText = await response.text();
                aiContentDiv.innerHTML = formaterReponse(rawText);
            }
        } catch (error) {
            aiContentDiv.innerHTML = `⚠️ Erreur de connexion avec l'API : ${error.message}.`;
        }
    }

    window.copierCode = function(id) {
        const codeEl = document.getElementById(id);
        if (codeEl) {
            navigator.clipboard.writeText(codeEl.innerText).then(() => {
                alert("✅ Code copié dans le presse-papier !");
            });
        }
    };

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function openMenu() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
        }
    }

    function closeMenu() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        }
    }

    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', openMenu);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMenu);

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            closeMenu();
            chatContainer.querySelectorAll('.message').forEach(msg => msg.remove());
            if (welcomeSection) welcomeSection.style.display = 'flex';
            userInput.value = "";
            userInput.style.height = 'auto';
            sendBtn.setAttribute('disabled', 'true');
        });
    }

    if (reportBugBtn) {
        reportBugBtn.addEventListener('click', async () => {
            closeMenu();
            const bugDescription = prompt("Décris le bug rencontré :");
            if (!bugDescription) return;

            if (welcomeSection && welcomeSection.style.display !== 'none') {
                welcomeSection.style.display = 'none';
            }
            appendMessage(`🐞 Signalement de bug : ${bugDescription}`, 'user');

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'bug_report', content: bugDescription })
                });
                
                if (response.ok) {
                    appendMessage("🛠️ **Merci !** Ton rapport de bug a bien été transmis à l'équipe technique.", 'ai');
                } else {
                    appendMessage("⚠️ Erreur lors de l'envoi du rapport.", 'ai');
                }
            } catch (err) {
                appendMessage("⚠️ Impossible de contacter le serveur pour envoyer le bug.", 'ai');
            }
        });
    }

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            closeMenu();
            settingsModal.style.display = 'flex';
        });
    }

    if (closeModalBtn && settingsModal) {
        closeModalBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }
});
