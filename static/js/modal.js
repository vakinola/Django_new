// Modal JS moved from inline scripts in index.html
(function () {
    const backdrop = document.querySelector('.sa-backdrop');

    // Main modal
    const mainLoginModal = document.getElementById('loginModal');
    const desktopLoginBtns = document.querySelectorAll('a.sa-open-login, button.sa-open-login[type="button"]');

    function openMainLogin() {
        if (!mainLoginModal) return;
        mainLoginModal.classList.add('active');
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMainLogin() {
        if (!mainLoginModal) return;
        mainLoginModal.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Open main login from desktop Sign in / sidebar Sign in
    desktopLoginBtns.forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); openMainLogin(); }));

    // Email flow
    const openEmailBtns = document.querySelectorAll('.sa-open-email-flow');
    const emailLoginModal = document.getElementById('emailLoginModal');
    const emailSignupModal = document.getElementById('emailSignupModal');

    // Track whether the main modal was open when the email flow started
    let mainWasOpen = false;

    function openModal(modal) {
        closeAllEmailModals();

        // if opening an email modal, hide main login if it was open
        if ((modal === emailLoginModal || modal === emailSignupModal) && mainLoginModal && mainLoginModal.classList.contains('active')) {
            mainWasOpen = true;
            mainLoginModal.classList.remove('active');
            mainLoginModal.classList.add('blended');
            mainLoginModal.setAttribute('data-hidden-by-email', 'true');
        } else if (mainLoginModal) {
            mainLoginModal.classList.remove('blended');
        }

        if (modal) modal.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const forgotPasswordSentModal = document.getElementById('forgotPasswordSentModal');

    function closeAllEmailModals() {
        [emailLoginModal, emailSignupModal, forgotPasswordModal, forgotPasswordSentModal].forEach(m => { if (m) m.classList.remove('active'); });
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
        if (mainLoginModal) mainLoginModal.classList.remove('blended');
    }

    openEmailBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(emailLoginModal);
    }));

    if (emailSignupModal?.querySelector('.flash-error')) {
        openModal(emailSignupModal);
    } else if (
        emailLoginModal?.querySelector('.flash-error') ||
        emailLoginModal?.querySelector('[data-message-tags*="auth-signup-success"]')
    ) {
        openModal(emailLoginModal);
    }

    // Auto-dismiss server-rendered flash messages in auth modals after 7 seconds
    document.querySelectorAll('#emailLoginModal .flash, #emailSignupModal .flash').forEach(function (flash) {
        setTimeout(function () {
            flash.classList.add('fade-out');
            setTimeout(function () { flash.remove(); }, 400);
        }, 7000);
    });

    // Back / navigation
    document.querySelector('.sa-email-login-back')?.addEventListener('click', () => {
        // Hide login modal, restore main modal
        if (emailLoginModal) emailLoginModal.classList.remove('active');
        if (mainLoginModal) {
            mainLoginModal.classList.remove('blended');
            mainLoginModal.classList.add('active');
        }
        if (backdrop) backdrop.classList.add('active');
    });

    document.querySelector('.sa-email-signup-back')?.addEventListener('click', () => {
        // Hide signup modal, restore main modal
        if (emailSignupModal) emailSignupModal.classList.remove('active');
        if (mainLoginModal) {
            mainLoginModal.classList.remove('blended');
            mainLoginModal.classList.add('active');
        }
        if (backdrop) backdrop.classList.add('active');
    });

    // Switch links
    document.querySelectorAll('.sa-email-switch-to-signup').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); openModal(emailSignupModal); }));
    document.querySelectorAll('.sa-email-switch-to-login').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); openModal(emailLoginModal); }));

    // Forgot password link → open forgot modal
    document.querySelector('.sa-forgot-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(forgotPasswordModal);
    });

    // Forgot back → return to email login
    document.querySelector('.sa-forgot-back')?.addEventListener('click', () => {
        if (forgotPasswordModal) forgotPasswordModal.classList.remove('active');
        openModal(emailLoginModal);
    });

    // Forgot sent done / close → close all
    document.querySelector('.sa-forgot-sent-done')?.addEventListener('click', closeAllEmailModals);
    document.querySelectorAll('.sa-forgot-close, .sa-forgot-sent-close').forEach(b => b.addEventListener('click', closeAllEmailModals));

    // Forgot password form AJAX submit
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordFlash = document.getElementById('forgotPasswordFlash');

    forgotPasswordForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(forgotPasswordForm);
        const csrfToken = getCsrfToken(forgotPasswordForm);
        const headers = csrfToken ? { 'X-CSRFToken': csrfToken } : {};

        forgotPasswordFlash.innerHTML = '';

        fetch('/accounts/password-reset/', {
            method: 'POST',
            headers,
            body: data,
            credentials: 'same-origin'
        })
            .then(async res => {
                const result = await res.json();
                if (!res.ok) throw new Error(result?.message || 'Something went wrong');
                return result;
            })
            .then(() => {
                forgotPasswordModal.classList.remove('active');
                if (forgotPasswordSentModal) forgotPasswordSentModal.classList.add('active');
                forgotPasswordForm.reset();
            })
            .catch(err => {
                const flash = document.createElement('div');
                flash.className = 'flash flash-error';
                flash.innerHTML = `<span class="flash-message">${err.message}</span>`;
                forgotPasswordFlash.appendChild(flash);
            });
    });

    // Close buttons
    document.querySelectorAll('.sa-email-login-close').forEach(b => b.addEventListener('click', closeAllEmailModals));
    document.querySelectorAll('.sa-email-signup-close').forEach(b => b.addEventListener('click', closeAllEmailModals));

    // Backdrop click: behave contextually (close main if open, else close email modals)
    if (backdrop) backdrop.addEventListener('click', () => {
        if (mainLoginModal && mainLoginModal.classList.contains('active')) closeMainLogin();
        else closeAllEmailModals();
    });

    // ESC key: similar behavior
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (mainLoginModal && mainLoginModal.classList.contains('active')) closeMainLogin();
            else closeAllEmailModals();
        }
    });

    // Close main login helper used above
    function closeMainLogin() {
        if (!mainLoginModal) return;
        mainLoginModal.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Close main login via close buttons (these have been used elsewhere)
    document.querySelectorAll('.sa-login-close').forEach(btn => btn.addEventListener('click', () => {
        if (mainLoginModal && mainLoginModal.classList.contains('active')) closeMainLogin();
        else closeAllEmailModals();
    }));
    // Feedback modal wiring
    const feedbackBackdrop = document.getElementById('feedback-modal');
    const feedbackForm = document.getElementById('feedbackForm');
    let feedbackFlashContainer = document.getElementById('feedback-modal-flash');
    const openFeedbackBtns = document.querySelectorAll('.sa-open-feedback, .feedback-open');
    window.__feedbackModalWired = true;

    function getCookie(name) {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1];
        return cookieValue ? decodeURIComponent(cookieValue) : '';
    }

    function getCsrfToken(form) {
        const tokenFromForm = form?.querySelector('input[name="csrfmiddlewaretoken"]')?.value;
        const tokenFromMeta = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        return tokenFromForm || tokenFromMeta || getCookie('csrftoken');
    }

    function getFeedbackFlashContainer() {
        if (feedbackFlashContainer) return feedbackFlashContainer;
        if (!feedbackForm) return null;
        feedbackFlashContainer = document.createElement('div');
        feedbackFlashContainer.id = 'feedback-modal-flash';
        feedbackFlashContainer.className = 'feedback-modal-flash flash-container';
        feedbackFlashContainer.setAttribute('aria-live', 'polite');
        feedbackForm.prepend(feedbackFlashContainer);
        return feedbackFlashContainer;
    }

    function clearFeedbackFlash() {
        if (feedbackFlashContainer) feedbackFlashContainer.innerHTML = '';
    }

    function showFeedbackFlash(message, type) {
        const container = getFeedbackFlashContainer();
        if (!container) return;
        const flash = document.createElement('div');
        flash.className = `flash flash-${type}`;
        flash.innerHTML = `
            <span class="flash-message">${message}</span>
            <button class="flash-close" onclick="this.parentElement.remove()" aria-label="Dismiss">×</button>
        `;
        container.appendChild(flash);
        flash.scrollIntoView();
        setTimeout(() => {
            flash.classList.add('fade-out');
            setTimeout(() => flash.remove(), 400);
        }, 6000);
    }

    function openFeedbackModal() {
        if (!feedbackBackdrop) return;
        feedbackBackdrop.classList.add('active');
        feedbackBackdrop.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        clearFeedbackFlash();
    }

    function closeFeedbackModal() {
        if (!feedbackBackdrop) return;
        feedbackBackdrop.classList.remove('active');
        feedbackBackdrop.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    openFeedbackBtns.forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); openFeedbackModal(); }));
    document.getElementById('feedback-close')?.addEventListener('click', (e) => { e.preventDefault(); closeFeedbackModal(); });

    // Close when clicking backdrop (outside form)
    if (feedbackBackdrop) feedbackBackdrop.addEventListener('click', (e) => {
        if (e.target === feedbackBackdrop) closeFeedbackModal();
    });

    // ESC closes feedback modal if open
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (feedbackBackdrop && feedbackBackdrop.classList.contains('active')) closeFeedbackModal();
        }
    });

    // Stubbed submit handler
    feedbackForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(feedbackForm);
        const csrfToken = getCsrfToken(feedbackForm);
        const headers = csrfToken ? { 'X-CSRFToken': csrfToken } : {};
        const endpoint = feedbackForm.getAttribute('action') || '/send-feedback';

        // Ensure csrfmiddlewaretoken is present in multipart payload too.
        if (csrfToken && !data.has('csrfmiddlewaretoken')) {
            data.append('csrfmiddlewaretoken', csrfToken);
        }

        fetch(endpoint, {
            method: 'POST',
            headers,
            body: data,
            credentials: 'same-origin'
        })
            .then(async response => {
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result?.message || 'Request failed');
                }
                return result;
            })
            .then(result => {
                const flashType = result.status === 'success' ? 'success' : 'error';
                showFeedbackFlash(result.message, flashType);

                if (result.status === 'success') {
                    feedbackForm.reset();
                }
            })
            .catch(error => {
                showFeedbackFlash(`Error sending feedback: ${error.message}`, 'error');
            });
    });

    // Close button inside modal
    document.querySelector('.feedback-modal-close')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeFeedbackModal();
    });
})();
