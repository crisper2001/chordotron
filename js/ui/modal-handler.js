import * as DomElements from '../dom/dom-elements.js';

const HELP_MODAL_SHOWN_KEY = 'chordotronHelpShown_v4';

function openHelpModal() {
    if (DomElements.helpModalOverlay) {
        DomElements.helpModalOverlay.style.display = 'flex';
    }
}

function closeHelpModal() {
    if (DomElements.helpModalOverlay) {
        DomElements.helpModalOverlay.style.display = 'none';
    }
}

export function initHelpGuideModalLogic() {
    if (DomElements.helpButton) {
        DomElements.helpButton.addEventListener('click', openHelpModal);
    }
    if (DomElements.modalCloseButton) {
        DomElements.modalCloseButton.addEventListener('click', closeHelpModal);
    }
    if (DomElements.helpModalOverlay) {
        DomElements.helpModalOverlay.addEventListener('click', (event) => {
            if (event.target === DomElements.helpModalOverlay) {
                closeHelpModal();
            }
        });
    }

    try {
        const helpShown = localStorage.getItem(HELP_MODAL_SHOWN_KEY);
        if (!helpShown) {
            openHelpModal();
            localStorage.setItem(HELP_MODAL_SHOWN_KEY, 'true');
        }
    } catch (e) {
        openHelpModal();
    }
}
