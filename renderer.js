// renderer.js
let allApps = [];
let catalogResults = [];
let activityLog = [];
let operationLog = [];
let appsStatusState = 'idle';
let catalogStatusState = 'idle';
let lastCatalogQuery = '';
const operationsById = new Map();
const operationByAppId = new Map();

let appsStatusEl;
let appsTableBody;
let appsSearchInput;
let appsRefreshBtn;
let appsOnlyUpgradable;
let appsSelectAllUpgradable;
let appsSortSelect;
let appsTotalCount;
let appsUpgradableCount;
let appsLastSync;
let activityList;
let toastStack;
let operationLogList;
let logClearBtn;
let appsUpgradeSelectedBtn;

let catalogStatusEl;
let catalogSearchInput;
let catalogSearchBtn;
let catalogTableBody;
let catalogMeta;
let windowControlButtons;
let languageSelect;

let bulkUpgradeQueue = [];
let bulkUpgradeCurrent = null;
let bulkUpgradeRunning = false;

const translations = {
    it: {
        app: {
            name: 'Winget Studio',
            tagline: 'Esperienza headless e pulita per installare, aggiornare e rimuovere app.',
            windowTitle: 'Winget Studio'
        },
        badge: {
            production: 'Production',
            winget: 'Winget'
        },
        language: {
            label: 'Seleziona lingua'
        },
        window: {
            minimize: 'Minimizza',
            maximize: 'Massimizza',
            close: 'Chiudi'
        },
        sections: {
            installed: 'Programmi installati',
            catalog: 'Catalogo Winget'
        },
        status: {
            initialLoading: 'Caricamento iniziale...',
            loading: 'Caricamento in corso...',
            appsFound: 'Trovati {count} programmi installati.',
            loadError: 'Errore nel caricamento dei programmi.',
            uninstalling: 'Disinstallazione di "{name}" in corso...',
            uninstallDone: 'Disinstallazione di "{name}" completata.',
            uninstallError: 'Errore durante la disinstallazione.',
            uninstallCanceled: 'Disinstallazione di "{name}" annullata.',
            upgrading: 'Aggiornamento di "{name}" in corso...',
            upgradeDone: 'Aggiornamento di "{name}" completato.',
            upgradeError: 'Errore durante l\'aggiornamento.',
            upgradeCanceled: 'Aggiornamento di "{name}" annullato.',
            installing: 'Installazione di "{name}" in corso...',
            installDone: 'Installazione di "{name}" completata.',
            installError: 'Errore durante l\'installazione.'
        },
        stats: {
            total: 'Totale',
            upgradable: 'Aggiornabili',
            lastSync: 'Ultimo sync'
        },
        placeholders: {
            appsSearch: 'Cerca per nome o ID (es. JetBrains, vscode, Steam)',
            catalogSearch: 'Cerca nel catalogo (es. chrome, vscode, docker, 7zip)'
        },
        filters: {
            onlyUpgradable: 'Solo aggiornabili',
            selectAllUpgradable: 'Tutte le aggiornabili',
            sortName: 'Ordina: Nome',
            sortStatus: 'Ordina: Stato',
            sortVersion: 'Ordina: Versione'
        },
        actions: {
            refreshList: 'Aggiorna lista',
            search: 'Cerca',
            install: 'Installa',
            installing: 'Installando...',
            upgrade: 'Aggiorna',
            upgrading: 'Aggiornando...',
            cancelUpgrade: 'Annulla',
            canceling: 'Annullando...',
            cancelUninstall: 'Annulla',
            upgradeSelected: 'Aggiorna selezionate',
            upgradingSelected: 'Aggiornamento in corso...',
            uninstall: 'Disinstalla',
            uninstalling: 'Disinstallando...'
        },
        table: {
            name: 'Nome',
            id: 'ID',
            version: 'Versione',
            status: 'Stato',
            actions: 'Azioni',
            source: 'Source'
        },
        activity: {
            title: 'Attivita recenti',
            subtitle: 'Operazioni winget in corso e completate.',
            empty: 'Nessuna attivita registrata.',
            refreshed: 'Lista aggiornata: {count} app trovate.',
            loadError: 'Errore durante il caricamento dei programmi.',
            uninstallStart: 'Disinstallazione avviata: {name}',
            uninstallDone: 'Disinstallazione completata: {name}',
            uninstallError: 'Errore disinstallazione: {name}',
            uninstallCanceled: 'Disinstallazione annullata: {name}',
            upgradeStart: 'Aggiornamento avviato: {name}',
            upgradeDone: 'Aggiornamento completato: {name}',
            upgradeError: 'Errore aggiornamento: {name}',
            upgradeCanceled: 'Aggiornamento annullato: {name}',
            bulkUpgradeStart: 'Aggiornamento multiplo avviato: {count} app.',
            bulkUpgradeDone: 'Aggiornamento multiplo completato.',
            catalogSearch: 'Ricerca catalogo: {query}',
            catalogError: 'Errore ricerca: {query}',
            installStart: 'Installazione avviata: {name}',
            installDone: 'Installazione completata: {name}',
            installError: 'Errore installazione: {name}'
        },
        tips: {
            title: 'Suggerimenti rapidi',
            body: 'Usa la ricerca per filtrare velocemente pacchetti. I pulsanti azione hanno focus visivo.',
            enterSearch: 'Invio = cerca',
            refresh: 'Aggiorna = refresh',
            confirm: 'Confirm = sicurezza'
        },
        logs: {
            title: 'Log operazioni',
            subtitle: 'Output dei comandi winget in esecuzione.',
            clear: 'Pulisci log',
            empty: 'Nessun log disponibile.'
        },
        catalog: {
            idle: 'Inserisci un nome o un ID per trovare nuove app.',
            metaIdle: 'Nessuna ricerca eseguita.',
            searching: 'Ricerca di "{query}" in corso...',
            results: 'Trovati {count} risultati per "{query}".',
            metaSearching: 'Ricerca attiva...',
            metaResults: 'Ultima ricerca: {count} risultati',
            metaError: 'Ricerca fallita.',
            error: 'Errore durante la ricerca pacchetti.',
            errorRow: 'Errore durante la ricerca. Controlla la connessione o riprova tra poco.',
            empty: 'Nessun risultato.',
            note: 'Nota: alcuni pacchetti del Microsoft Store potrebbero richiedere permessi aggiuntivi.'
        },
        statusLabels: {
            upgradable: 'Aggiornabile',
            updated: 'Aggiornato',
            updating: 'Aggiornamento in corso',
            uninstalling: 'Disinstallazione in corso',
            canceling: 'Annullamento in corso'
        },
        common: {
            notAvailable: 'n/d',
            sourceLabel: 'Sorgente'
        },
        empty: {
            filteredApps: 'Nessun programma trovato con i filtri correnti.'
        },
        notify: {
            appsLoadFail: 'Impossibile caricare la lista delle app.',
            uninstallDone: 'Disinstallato: {name}',
            uninstallError: 'Errore disinstallazione: {name}',
            upgradeDone: 'Aggiornato: {name}',
            upgradeError: 'Errore aggiornamento: {name}',
            upgradeCanceled: 'Aggiornamento annullato: {name}',
            installDone: 'Installato: {name}',
            installError: 'Errore installazione: {name}',
            catalogSearchFail: 'Ricerca catalogo fallita.'
        },
        alerts: {
            missingAppId: 'ID del programma non disponibile, impossibile disinstallare.',
            missingUpgradeId: 'ID del programma non disponibile, impossibile aggiornare.',
            missingPackageId: 'ID del pacchetto non disponibile, impossibile installare.',
            uninstallConfirm: 'Vuoi davvero disinstallare:\n\n{name}\n(ID: {id}) ?',
            upgradeConfirm: 'Vuoi aggiornare:\n\n{name}\n(ID: {id}) ?',
            installConfirm: 'Vuoi installare:\n\n{name}\n(ID: {id}{source}) ?',
            bulkUpgradeConfirm: 'Vuoi aggiornare {count} app selezionate?',
            uninstallError: 'Errore durante la disinstallazione:\n\n{error}',
            upgradeError: 'Errore durante l\'aggiornamento:\n\n{error}',
            installError: 'Errore durante l\'installazione:\n\n{error}'
        }
    },
    en: {
        app: {
            name: 'Winget Studio',
            tagline: 'Headless, clean experience to install, update, and remove apps.',
            windowTitle: 'Winget Studio'
        },
        badge: {
            production: 'Production',
            winget: 'Winget'
        },
        language: {
            label: 'Select language'
        },
        window: {
            minimize: 'Minimize',
            maximize: 'Maximize',
            close: 'Close'
        },
        sections: {
            installed: 'Installed apps',
            catalog: 'Winget catalog'
        },
        status: {
            initialLoading: 'Initial loading...',
            loading: 'Loading...',
            appsFound: 'Found {count} installed apps.',
            loadError: 'Error loading apps.',
            uninstalling: 'Uninstalling "{name}"...',
            uninstallDone: 'Uninstall completed for "{name}".',
            uninstallError: 'Error during uninstall.',
            uninstallCanceled: 'Uninstall canceled for "{name}".',
            upgrading: 'Updating "{name}"...',
            upgradeDone: 'Update completed for "{name}".',
            upgradeError: 'Error during update.',
            upgradeCanceled: 'Update canceled for "{name}".',
            installing: 'Installing "{name}"...',
            installDone: 'Installation completed for "{name}".',
            installError: 'Error during installation.'
        },
        stats: {
            total: 'Total',
            upgradable: 'Upgradable',
            lastSync: 'Last sync'
        },
        placeholders: {
            appsSearch: 'Search by name or ID (e.g., JetBrains, vscode, Steam)',
            catalogSearch: 'Search catalog (e.g., chrome, vscode, docker, 7zip)'
        },
        filters: {
            onlyUpgradable: 'Upgradable only',
            selectAllUpgradable: 'All upgradable',
            sortName: 'Sort: Name',
            sortStatus: 'Sort: Status',
            sortVersion: 'Sort: Version'
        },
        actions: {
            refreshList: 'Refresh list',
            search: 'Search',
            install: 'Install',
            installing: 'Installing...',
            upgrade: 'Update',
            upgrading: 'Updating...',
            cancelUpgrade: 'Cancel',
            canceling: 'Canceling...',
            cancelUninstall: 'Cancel',
            upgradeSelected: 'Update selected',
            upgradingSelected: 'Updating selected...',
            uninstall: 'Uninstall',
            uninstalling: 'Uninstalling...'
        },
        table: {
            name: 'Name',
            id: 'ID',
            version: 'Version',
            status: 'Status',
            actions: 'Actions',
            source: 'Source'
        },
        activity: {
            title: 'Recent activity',
            subtitle: 'Winget operations in progress and completed.',
            empty: 'No activity yet.',
            refreshed: 'List refreshed: {count} apps found.',
            loadError: 'Error while loading apps.',
            uninstallStart: 'Uninstall started: {name}',
            uninstallDone: 'Uninstall completed: {name}',
            uninstallError: 'Uninstall error: {name}',
            uninstallCanceled: 'Uninstall canceled: {name}',
            upgradeStart: 'Update started: {name}',
            upgradeDone: 'Update completed: {name}',
            upgradeError: 'Update error: {name}',
            upgradeCanceled: 'Update canceled: {name}',
            bulkUpgradeStart: 'Bulk update started: {count} apps.',
            bulkUpgradeDone: 'Bulk update completed.',
            catalogSearch: 'Catalog search: {query}',
            catalogError: 'Search error: {query}',
            installStart: 'Install started: {name}',
            installDone: 'Install completed: {name}',
            installError: 'Install error: {name}'
        },
        tips: {
            title: 'Quick tips',
            body: 'Use search to filter packages quickly. Action buttons include focus states.',
            enterSearch: 'Enter = search',
            refresh: 'Refresh = update',
            confirm: 'Confirm = safety'
        },
        logs: {
            title: 'Operation log',
            subtitle: 'Live output from winget commands.',
            clear: 'Clear logs',
            empty: 'No log entries yet.'
        },
        catalog: {
            idle: 'Enter a name or ID to discover new apps.',
            metaIdle: 'No search performed.',
            searching: 'Searching "{query}"...',
            results: 'Found {count} results for "{query}".',
            metaSearching: 'Searching...',
            metaResults: 'Last search: {count} results',
            metaError: 'Search failed.',
            error: 'Error while searching packages.',
            errorRow: 'Search failed. Check connectivity and try again.',
            empty: 'No results.',
            note: 'Note: Microsoft Store packages may require extra permissions.'
        },
        statusLabels: {
            upgradable: 'Upgradable',
            updated: 'Up to date',
            updating: 'Updating',
            uninstalling: 'Uninstalling',
            canceling: 'Canceling'
        },
        common: {
            notAvailable: 'n/a',
            sourceLabel: 'Source'
        },
        empty: {
            filteredApps: 'No apps found with the current filters.'
        },
        notify: {
            appsLoadFail: 'Unable to load the app list.',
            uninstallDone: 'Uninstalled: {name}',
            uninstallError: 'Uninstall error: {name}',
            upgradeDone: 'Updated: {name}',
            upgradeError: 'Update error: {name}',
            upgradeCanceled: 'Update canceled: {name}',
            installDone: 'Installed: {name}',
            installError: 'Install error: {name}',
            catalogSearchFail: 'Catalog search failed.'
        },
        alerts: {
            missingAppId: 'App ID not available, cannot uninstall.',
            missingUpgradeId: 'App ID not available, cannot update.',
            missingPackageId: 'Package ID not available, cannot install.',
            uninstallConfirm: 'Do you really want to uninstall:\n\n{name}\n(ID: {id}) ?',
            upgradeConfirm: 'Do you want to update:\n\n{name}\n(ID: {id}) ?',
            installConfirm: 'Do you want to install:\n\n{name}\n(ID: {id}{source}) ?',
            bulkUpgradeConfirm: 'Do you want to update {count} selected apps?',
            uninstallError: 'Error during uninstall:\n\n{error}',
            upgradeError: 'Error during update:\n\n{error}',
            installError: 'Error during installation:\n\n{error}'
        }
    }
};

const supportedLanguages = ['it', 'en'];
let currentLanguage = 'it';

function getLocale() {
    return currentLanguage === 'it' ? 'it-IT' : 'en-US';
}

function resolveInitialLanguage() {
    const stored = window.localStorage.getItem('winget-lang');
    if (stored && supportedLanguages.includes(stored)) {
        return stored;
    }
    const browserLang = (navigator.language || '').toLowerCase();
    if (browserLang.startsWith('it')) {
        return 'it';
    }
    return 'en';
}

function getTranslation(lang, key) {
    const parts = key.split('.');
    let value = translations[lang];
    for (const part of parts) {
        if (!value || typeof value !== 'object') return null;
        value = value[part];
    }
    return typeof value === 'string' ? value : null;
}

function formatMessage(message, vars = {}) {
    return message.replace(/\{(\w+)\}/g, (_, key) => {
        return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : '';
    });
}

function t(key, vars) {
    const raw = getTranslation(currentLanguage, key) || getTranslation('it', key) || key;
    return vars ? formatMessage(raw, vars) : raw;
}

function applyTranslations(lang) {
    currentLanguage = supportedLanguages.includes(lang) ? lang : 'it';
    window.localStorage.setItem('winget-lang', currentLanguage);
    document.documentElement.lang = currentLanguage;
    document.title = t('app.windowTitle');

    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            el.textContent = t(key);
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
            el.setAttribute('placeholder', t(key));
        }
    });

    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
            el.setAttribute('title', t(key));
        }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        const key = el.getAttribute('data-i18n-aria');
        if (key) {
            el.setAttribute('aria-label', t(key));
        }
    });

    if (appsStatusEl) {
        if (appsStatusState === 'loaded') {
            setStatusText(appsStatusEl, t('status.appsFound', { count: allApps.length }));
        } else if (appsStatusState === 'error') {
            setStatusText(appsStatusEl, t('status.loadError'));
        } else if (appsStatusState === 'loading') {
            setStatusText(appsStatusEl, t('status.loading'));
        } else {
            setStatusText(appsStatusEl, t('status.initialLoading'));
        }
    }
    if (catalogStatusEl) {
        if (catalogStatusState === 'results') {
            setStatusText(catalogStatusEl, t('catalog.results', { query: lastCatalogQuery, count: catalogResults.length }));
        } else if (catalogStatusState === 'searching') {
            setStatusText(catalogStatusEl, t('catalog.searching', { query: lastCatalogQuery }));
        } else if (catalogStatusState === 'error') {
            setStatusText(catalogStatusEl, t('catalog.error'));
        } else {
            setStatusText(catalogStatusEl, t('catalog.idle'));
        }
    }
    if (catalogMeta) {
        if (catalogStatusState === 'results') {
            catalogMeta.textContent = t('catalog.metaResults', { count: catalogResults.length });
        } else if (catalogStatusState === 'searching') {
            catalogMeta.textContent = t('catalog.metaSearching');
        } else if (catalogStatusState === 'error') {
            catalogMeta.textContent = t('catalog.metaError');
        } else {
            catalogMeta.textContent = t('catalog.metaIdle');
        }
    }
    renderActivity();
    renderOperationLog();
    renderInstalledTable();
    renderCatalogTable();
}

// helper spinner
function setButtonLoading(buttonEl, isLoading, idleLabel, loadingLabel) {
    if (!buttonEl) return;

    if (isLoading) {
        buttonEl.dataset.originalInnerHTML = buttonEl.innerHTML;
        buttonEl.disabled = true;
        buttonEl.classList.add('opacity-60', 'cursor-wait');

        buttonEl.innerHTML = `
      <span class="inline-flex items-center gap-1">
        <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" stroke-width="4" fill="none"></circle>
          <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span>${loadingLabel}</span>
      </span>
    `;
    } else {
        const original = buttonEl.dataset.originalInnerHTML;
        if (original) {
            buttonEl.innerHTML = original;
        } else if (idleLabel) {
            buttonEl.textContent = idleLabel;
        }
        buttonEl.disabled = false;
        buttonEl.classList.remove('opacity-60', 'cursor-wait');
    }
}

function renderLoadingRows(bodyEl, columns, rows = 6) {
    if (!bodyEl) return;
    bodyEl.innerHTML = '';
    for (let i = 0; i < rows; i += 1) {
        const tr = document.createElement('tr');
        const cells = Array.from({ length: columns }).map(() =>
            `<td class="px-4 py-3">
        <div class="h-3 rounded-full bg-white/5 animate-pulse"></div>
       </td>`
        );
        tr.innerHTML = cells.join('');
        bodyEl.appendChild(tr);
    }
}

function setStatusText(el, message) {
    if (!el) return;
    el.textContent = message;
}

function updateStats() {
    if (!appsTotalCount || !appsUpgradableCount || !appsLastSync) return;
    const upgradableCount = allApps.filter(app => app.upgradeAvailable).length;
    appsTotalCount.textContent = String(allApps.length);
    appsUpgradableCount.textContent = String(upgradableCount);

    const now = new Date();
    const time = now.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
    appsLastSync.textContent = time;
}

function addActivity(message, type = 'info') {
    const entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message,
        type,
        time: new Date()
    };
    activityLog = [entry, ...activityLog].slice(0, 12);
    renderActivity();
}

function renderActivity() {
    if (!activityList) return;
    activityList.innerHTML = '';

    if (activityLog.length === 0) {
        activityList.innerHTML = `<li class="text-slate-500">${t('activity.empty')}</li>`;
        return;
    }

    for (const entry of activityLog) {
        const time = entry.time.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
        const color =
            entry.type === 'error' ? 'text-rose-400' :
                entry.type === 'success' ? 'text-mint' :
                    'text-slate-300';

        const li = document.createElement('li');
        li.className = `flex items-start gap-2 ${color}`;
        li.innerHTML = `
      <span class="text-[11px] text-slate-500">${time}</span>
      <span class="flex-1">${entry.message}</span>
    `;
        activityList.appendChild(li);
    }
}

function addOperationLogEntry(entry) {
    operationLog.push(entry);
    if (operationLog.length > 200) {
        operationLog.shift();
    }
    renderOperationLog(true);
}

function renderOperationLog(scrollToBottom = false) {
    if (!operationLogList) return;
    operationLogList.innerHTML = '';

    if (operationLog.length === 0) {
        operationLogList.innerHTML = `<div class="text-slate-500">${t('logs.empty')}</div>`;
        return;
    }

    for (const entry of operationLog) {
        const time = entry.time.toLocaleTimeString(getLocale(), {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const messageColor =
            entry.stream === 'stderr' ? 'text-rose-300' :
                entry.stream === 'meta' ? 'text-slate-400' :
                    'text-slate-200';

        const row = document.createElement('div');
        row.className = 'flex items-start gap-2 text-[11px]';
        row.innerHTML = `
      <span class="text-[11px] text-slate-500">${time}</span>
      <span class="text-[10px] uppercase tracking-widest text-slate-500">${entry.label}</span>
      <span class="flex-1 log-line ${messageColor}">${entry.message}</span>
    `;
        operationLogList.appendChild(row);
    }

    if (scrollToBottom) {
        const container = operationLogList.parentElement;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
}

function handleOperationLog(payload) {
    if (!payload || !payload.message) return;
    const labelBase = (payload.type || 'winget').toUpperCase();
    const label = payload.appId ? `${labelBase}:${payload.appId}` : labelBase;
    const lines = String(payload.message).split(/\r?\n/);
    for (const line of lines) {
        if (!line.trim()) continue;
        addOperationLogEntry({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            label,
            message: line,
            stream: payload.stream || 'stdout',
            time: new Date()
        });
    }
}

function clearOperationLog() {
    operationLog = [];
    renderOperationLog();
}

function notify(type, message) {
    if (!toastStack) return;
    const toast = document.createElement('div');
    const color =
        type === 'error' ? 'border-rose bg-rose/10 text-rose-200' :
            type === 'success' ? 'border-mint bg-mint/10 text-mint' :
                'border-white/10 bg-white/5 text-slate-200';
    toast.className = `px-4 py-3 rounded-xl border ${color} text-xs shadow-glow`;
    toast.textContent = message;
    toastStack.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3200);
}

function getUpgradableApps() {
    return allApps.filter(app => app.upgradeAvailable);
}

function updateBulkUpgradeButton() {
    if (!appsUpgradeSelectedBtn) return;
    const enabled =
        !!(appsSelectAllUpgradable && appsSelectAllUpgradable.checked) &&
        getUpgradableApps().length > 0 &&
        !bulkUpgradeRunning;

    appsUpgradeSelectedBtn.disabled = !enabled;
    appsUpgradeSelectedBtn.classList.toggle('opacity-60', !enabled);
    appsUpgradeSelectedBtn.classList.toggle('cursor-not-allowed', !enabled);
}

function finishBulkUpgrade() {
    bulkUpgradeRunning = false;
    bulkUpgradeQueue = [];
    bulkUpgradeCurrent = null;
    setButtonLoading(appsUpgradeSelectedBtn, false, t('actions.upgradeSelected'), t('actions.upgradingSelected'));
    addActivity(t('activity.bulkUpgradeDone'), 'success');
    updateBulkUpgradeButton();
}

function processNextBulkUpgrade() {
    if (!bulkUpgradeRunning) return;
    const next = bulkUpgradeQueue.shift();
    if (!next) {
        finishBulkUpgrade();
        return;
    }

    setStatusText(appsStatusEl, t('status.upgrading', { name: next.name || next.id }));
    window.electronAPI.startUpgrade(next.id)
        .then((result) => {
            if (!result || !result.opId) {
                throw new Error('Operazione non avviata');
            }
            bulkUpgradeCurrent = { opId: result.opId, appId: next.id };
            trackOperation({
                opId: result.opId,
                type: 'upgrade',
                appId: next.id,
                appName: next.name,
                status: 'running'
            });
            renderInstalledTable();
        })
        .catch((err) => {
            console.error('Bulk upgrade error (renderer):', err);
            addActivity(t('activity.upgradeError', { name: next.name || next.id }), 'error');
            processNextBulkUpgrade();
        });
}

function startBulkUpgrade() {
    if (bulkUpgradeRunning) return;
    if (!appsSelectAllUpgradable || !appsSelectAllUpgradable.checked) return;

    const upgradable = getUpgradableApps();
    if (upgradable.length === 0) return;

    const ok = confirm(t('alerts.bulkUpgradeConfirm', { count: upgradable.length }));
    if (!ok) return;

    bulkUpgradeQueue = upgradable.map(app => ({ id: app.id, name: app.name }));
    bulkUpgradeRunning = true;
    setButtonLoading(appsUpgradeSelectedBtn, true, t('actions.upgradeSelected'), t('actions.upgradingSelected'));
    addActivity(t('activity.bulkUpgradeStart', { count: upgradable.length }), 'info');
    processNextBulkUpgrade();
}

function trackOperation(operation) {
    operationsById.set(operation.opId, operation);
    if (operation.appId) {
        operationByAppId.set(operation.appId, operation.opId);
    }
}

function clearOperation(opId) {
    const operation = operationsById.get(opId);
    if (!operation) return;
    operationsById.delete(opId);
    if (operation.appId && operationByAppId.get(operation.appId) === opId) {
        operationByAppId.delete(operation.appId);
    }
}

function getOperationForApp(appId) {
    const opId = operationByAppId.get(appId);
    if (!opId) return null;
    return operationsById.get(opId) || null;
}

function handleOperationUpdate(payload) {
    if (!payload || !payload.opId) return;
    const existing = operationsById.get(payload.opId);
    const operation = existing || {
        opId: payload.opId,
        type: payload.type,
        appId: payload.appId,
        status: payload.status
    };
    operation.status = payload.status;
    trackOperation(operation);

    if (payload.type === 'upgrade') {
        const appName = operation.appName || payload.appName;
        if (payload.status === 'completed') {
            if (appName) {
                setStatusText(appsStatusEl, t('status.upgradeDone', { name: appName }));
                addActivity(t('activity.upgradeDone', { name: appName }), 'success');
                notify('success', t('notify.upgradeDone', { name: appName }));
            }
            clearOperation(payload.opId);
            loadApps();
        } else if (payload.status === 'failed') {
            if (appName) {
                setStatusText(appsStatusEl, t('status.upgradeError'));
                addActivity(t('activity.upgradeError', { name: appName }), 'error');
                notify('error', t('notify.upgradeError', { name: appName }));
            }
            clearOperation(payload.opId);
        } else if (payload.status === 'canceled') {
            if (appName) {
                setStatusText(appsStatusEl, t('status.upgradeCanceled', { name: appName }));
                addActivity(t('activity.upgradeCanceled', { name: appName }), 'info');
                notify('info', t('notify.upgradeCanceled', { name: appName }));
            }
            clearOperation(payload.opId);
            loadApps();
        }
    }

    if (payload.type === 'uninstall') {
        const appName = operation.appName || payload.appName;
        if (payload.status === 'completed') {
            if (appName) {
                setStatusText(appsStatusEl, t('status.uninstallDone', { name: appName }));
                addActivity(t('activity.uninstallDone', { name: appName }), 'success');
                notify('success', t('notify.uninstallDone', { name: appName }));
            }
            clearOperation(payload.opId);
            loadApps();
        } else if (payload.status === 'failed') {
            if (appName) {
                setStatusText(appsStatusEl, t('status.uninstallError'));
                addActivity(t('activity.uninstallError', { name: appName }), 'error');
                notify('error', t('notify.uninstallError', { name: appName }));
            }
            clearOperation(payload.opId);
        } else if (payload.status === 'canceled') {
            if (appName) {
                setStatusText(appsStatusEl, t('status.uninstallCanceled', { name: appName }));
                addActivity(t('activity.uninstallCanceled', { name: appName }), 'info');
            }
            clearOperation(payload.opId);
        }
    }

    if (
        bulkUpgradeRunning &&
        bulkUpgradeCurrent &&
        payload.opId === bulkUpgradeCurrent.opId &&
        ['completed', 'failed', 'canceled'].includes(payload.status)
    ) {
        bulkUpgradeCurrent = null;
        processNextBulkUpgrade();
    }

    renderInstalledTable();
}

async function loadApps() {
    if (!appsStatusEl || !appsTableBody) return;

    appsStatusState = 'loading';
    setStatusText(appsStatusEl, t('status.loading'));
    renderLoadingRows(appsTableBody, 5, 7);

    try {
        const apps = await window.electronAPI.getApps();
        allApps = apps;
        appsStatusState = 'loaded';
        updateStats();
        setStatusText(appsStatusEl, t('status.appsFound', { count: apps.length }));
        addActivity(t('activity.refreshed', { count: apps.length }), 'success');
        renderInstalledTable();
        updateBulkUpgradeButton();
    } catch (err) {
        console.error('Errore get-apps (renderer):', err);
        appsStatusState = 'error';
        setStatusText(appsStatusEl, t('status.loadError'));
        addActivity(t('activity.loadError'), 'error');
        notify('error', t('notify.appsLoadFail'));
    }
}

function sortApps(apps) {
    const sortValue = appsSortSelect ? appsSortSelect.value : 'name';
    const sorted = [...apps];

    if (sortValue === 'status') {
        sorted.sort((a, b) => Number(b.upgradeAvailable) - Number(a.upgradeAvailable));
    } else if (sortValue === 'version') {
        sorted.sort((a, b) => (b.version || '').localeCompare(a.version || ''));
    } else {
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return sorted;
}

function renderInstalledTable() {
    if (!appsTableBody || !appsSearchInput) return;

    const query = appsSearchInput.value.trim().toLowerCase();
    const onlyUpgradable = appsOnlyUpgradable ? appsOnlyUpgradable.checked : false;

    const filtered = allApps.filter(app => {
        if (onlyUpgradable && !app.upgradeAvailable) return false;
        if (!query) return true;
        return (
            (app.name && app.name.toLowerCase().includes(query)) ||
            (app.id && app.id.toLowerCase().includes(query))
        );
    });

    const ordered = sortApps(filtered);
    appsTableBody.innerHTML = '';

    if (ordered.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td colspan="5" class="px-4 py-6 text-center text-slate-400">
        ${t('empty.filteredApps')}
      </td>
    `;
        appsTableBody.appendChild(tr);
        return;
    }

    for (const app of ordered) {
        const tr = document.createElement('tr');

        const activeOp = getOperationForApp(app.id);
        let statusBadge = '';
        if (activeOp && activeOp.type === 'upgrade') {
            const isCanceling = activeOp.status === 'canceling';
            const label = isCanceling ? t('statusLabels.canceling') : t('statusLabels.updating');
            statusBadge = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]
                 bg-sky-500/10 text-sky-300 border border-sky-500/50">
          <span class="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse"></span>
          ${label}
        </span>`;
        } else if (activeOp && activeOp.type === 'uninstall') {
            const label = t('statusLabels.uninstalling');
            statusBadge = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]
                 bg-rose/10 text-slate-200 border border-rose">
          <span class="h-1.5 w-1.5 rounded-full bg-rose/80 animate-pulse"></span>
          ${label}
        </span>`;
        } else if (app.upgradeAvailable) {
            statusBadge = `
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                 bg-orange-500/10 text-orange-300 border border-orange-500/60">
          ${t('statusLabels.upgradable')}
        </span>`;
        } else {
            statusBadge = `
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                 bg-emerald-500/10 text-emerald-300 border border-emerald-500/60">
          ${t('statusLabels.updated')}
        </span>`;
        }

        const versionPill = app.version
            ? `<span
        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                bg-slate-800 text-slate-200 border border-slate-700
                max-w-[130px] overflow-hidden text-ellipsis whitespace-nowrap"
        title="${app.version}"
        >
        ${app.version}
        </span>`
            : `<span class="text-xs text-slate-500">${t('common.notAvailable')}</span>`;


        const isUpgrading = !!(activeOp && activeOp.type === 'upgrade');
        const isUninstalling = !!(activeOp && activeOp.type === 'uninstall');

        let updateButton = '';
        if (isUpgrading) {
            updateButton = `
     <button
       class="inline-flex items-center gap-1 px-3 py-1 rounded-full
              bg-slate-700/70 hover:bg-slate-600 text-[11px] font-semibold
              uppercase tracking-wide shadow-sm shadow-slate-900/40
              transition-colors"
       data-action="cancel-upgrade"
       data-op-id="${activeOp.opId}"
       data-id="${app.id}"
       data-name="${app.name}"
     >
       <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
         <path stroke-linecap="round" stroke-linejoin="round"
               d="M6 6l12 12M18 6l-12 12" />
       </svg>
       <span>${t('actions.cancelUpgrade')}</span>
     </button>`;
        } else if (app.upgradeAvailable && !isUninstalling) {
            updateButton = `
     <button
       class="inline-flex items-center gap-1 px-3 py-1 rounded-full
              bg-orange-500 hover:bg-orange-400 text-[11px] font-semibold
              uppercase tracking-wide shadow-sm shadow-orange-900/40
              transition-colors"
       data-action="upgrade"
       data-id="${app.id}"
       data-name="${app.name}"
     >
       <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
         <path stroke-linecap="round" stroke-linejoin="round"
               d="M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0012.9 2M19 9A7 7 0 006.1 7" />
       </svg>
       <span>${t('actions.upgrade')}</span>
     </button>`;
        }

        const uninstallDisabled = isUpgrading;
        const uninstallDisabledAttr = uninstallDisabled ? 'disabled' : '';
        const uninstallClass = `inline-flex items-center gap-1 px-3 py-1 rounded-full
                bg-rose/80 hover:bg-rose text-[11px] font-semibold
                uppercase tracking-wide shadow-sm shadow-rose-900/40
                transition-colors ${uninstallDisabled ? 'opacity-50 cursor-not-allowed' : ''}`;

        let uninstallButton = `
                <button
        class="${uninstallClass}"
        data-action="uninstall"
        data-id="${app.id}"
        data-name="${app.name}"
        ${uninstallDisabledAttr}
        >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                d="M6 7h12M10 11v6M14 11v6M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12" />
        </svg>
        <span>${t('actions.uninstall')}</span>
        </button>`;

        if (isUninstalling) {
            uninstallButton = `
                <button
        class="inline-flex items-center gap-1 px-3 py-1 rounded-full
               bg-slate-700/70 hover:bg-slate-600 text-[11px] font-semibold
               uppercase tracking-wide shadow-sm shadow-slate-900/40
               transition-colors"
        data-action="cancel-uninstall"
        data-op-id="${activeOp.opId}"
        data-id="${app.id}"
        data-name="${app.name}"
        >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                d="M6 6l12 12M18 6l-12 12" />
        </svg>
        <span>${t('actions.cancelUninstall')}</span>
        </button>`;
        }

        tr.innerHTML = `
      <td class="px-4 py-2">${app.name || ''}</td>
      <td class="px-4 py-2 text-xs text-slate-300">
        <span
            class="inline-block max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap align-middle"
            title="${app.id || ''}"
        >
            ${app.id || ''}
        </span>
      </td>
      <td class="px-4 py-2">${versionPill}</td>
      <td class="px-4 py-2">${statusBadge}</td>
      <td class="px-4 py-2 actions-col">
        <div class="flex flex-wrap items-center justify-end gap-2 actions-wrap">
          ${updateButton}
          ${uninstallButton}
        </div>
      </td>
    `;

        const updateBtn = tr.querySelector('button[data-action="upgrade"]');
        const cancelBtn = tr.querySelector('button[data-action="cancel-upgrade"]');
        const uninstallBtn = tr.querySelector('button[data-action="uninstall"]');
        const cancelUninstallBtn = tr.querySelector('button[data-action="cancel-uninstall"]');

        if (updateBtn) {
            updateBtn.addEventListener('click', (e) => onUpgradeClick(app, e.currentTarget));
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => onCancelUpgradeClick(app, e.currentTarget));
        }
        if (uninstallBtn) {
            uninstallBtn.addEventListener('click', (e) => onUninstallClick(app, e.currentTarget));
        }
        if (cancelUninstallBtn) {
            cancelUninstallBtn.addEventListener('click', (e) => onCancelUninstallClick(app, e.currentTarget));
        }

        appsTableBody.appendChild(tr);
    }
}

async function onUninstallClick(app, buttonEl) {
    if (!app.id) {
        alert(t('alerts.missingAppId'));
        return;
    }

    if (getOperationForApp(app.id)) {
        return;
    }

    const msg = t('alerts.uninstallConfirm', { name: app.name, id: app.id });
    const ok = confirm(msg);
    if (!ok) return;

    setStatusText(appsStatusEl, t('status.uninstalling', { name: app.name }));
    addActivity(t('activity.uninstallStart', { name: app.name }), 'info');

    try {
        const result = await window.electronAPI.startUninstall(app.id);
        if (!result || !result.opId) {
            throw new Error('Operazione non avviata');
        }
        trackOperation({
            opId: result.opId,
            type: 'uninstall',
            appId: app.id,
            appName: app.name,
            status: 'running'
        });
        renderInstalledTable();
    } catch (err) {
        console.error('Uninstall error (renderer):', err);
        alert(
            t('alerts.uninstallError', {
                error: err && err.message ? err.message : String(err)
            })
        );
        setStatusText(appsStatusEl, t('status.uninstallError'));
        addActivity(t('activity.uninstallError', { name: app.name }), 'error');
        notify('error', t('notify.uninstallError', { name: app.name }));
    }
}

async function onCancelUninstallClick(app, buttonEl) {
    const operation = getOperationForApp(app.id);
    if (!operation) return;

    setButtonLoading(buttonEl, true, t('actions.cancelUninstall'), t('actions.canceling'));
    try {
        await window.electronAPI.cancelOperation(operation.opId);
        operation.status = 'canceling';
        trackOperation(operation);
        renderInstalledTable();
    } catch (err) {
        console.error('Cancel uninstall error (renderer):', err);
        notify('error', t('notify.uninstallError', { name: app.name }));
    } finally {
        setButtonLoading(buttonEl, false, t('actions.cancelUninstall'), t('actions.cancelUninstall'));
    }
}

async function onUpgradeClick(app, buttonEl) {
    if (!app.id) {
        alert(t('alerts.missingUpgradeId'));
        return;
    }

    if (getOperationForApp(app.id)) {
        return;
    }

    const msg = t('alerts.upgradeConfirm', { name: app.name, id: app.id });
    const ok = confirm(msg);
    if (!ok) return;

    setStatusText(appsStatusEl, t('status.upgrading', { name: app.name }));
    addActivity(t('activity.upgradeStart', { name: app.name }), 'info');

    try {
        const result = await window.electronAPI.startUpgrade(app.id);
        if (!result || !result.opId) {
            throw new Error('Operazione non avviata');
        }
        trackOperation({
            opId: result.opId,
            type: 'upgrade',
            appId: app.id,
            appName: app.name,
            status: 'running'
        });
        renderInstalledTable();
    } catch (err) {
        console.error('Upgrade error (renderer):', err);
        alert(
            t('alerts.upgradeError', {
                error: err && err.message ? err.message : String(err)
            })
        );
        setStatusText(appsStatusEl, t('status.upgradeError'));
        addActivity(t('activity.upgradeError', { name: app.name }), 'error');
        notify('error', t('notify.upgradeError', { name: app.name }));
    }
}

async function onCancelUpgradeClick(app, buttonEl) {
    const operation = getOperationForApp(app.id);
    if (!operation) return;

    setButtonLoading(buttonEl, true, t('actions.cancelUpgrade'), t('actions.canceling'));
    try {
        await window.electronAPI.cancelOperation(operation.opId);
        operation.status = 'canceling';
        trackOperation(operation);
        renderInstalledTable();
    } catch (err) {
        console.error('Cancel upgrade error (renderer):', err);
        notify('error', t('notify.upgradeError', { name: app.name }));
    } finally {
        setButtonLoading(buttonEl, false, t('actions.cancelUpgrade'), t('actions.cancelUpgrade'));
    }
}

async function onCatalogSearch() {
    if (!catalogSearchInput || !catalogTableBody || !catalogStatusEl) return;

    const query = catalogSearchInput.value.trim();
    if (!query) {
        catalogResults = [];
        lastCatalogQuery = '';
        catalogStatusState = 'idle';
        catalogTableBody.innerHTML = '';
        setStatusText(catalogStatusEl, t('catalog.idle'));
        if (catalogMeta) {
            catalogMeta.textContent = t('catalog.metaIdle');
        }
        return;
    }

    lastCatalogQuery = query;
    catalogStatusState = 'searching';
    setStatusText(catalogStatusEl, t('catalog.searching', { query }));
    renderLoadingRows(catalogTableBody, 5, 6);
    if (catalogMeta) {
        catalogMeta.textContent = t('catalog.metaSearching');
    }
    addActivity(t('activity.catalogSearch', { query }), 'info');

    try {
        const results = await window.electronAPI.searchPackages(query);
        catalogResults = results;
        catalogStatusState = 'results';
        setStatusText(catalogStatusEl, t('catalog.results', { query, count: results.length }));
        if (catalogMeta) {
            catalogMeta.textContent = t('catalog.metaResults', { count: results.length });
        }
        renderCatalogTable();
    } catch (err) {
        console.error('Search-packages error (renderer):', err);
        catalogStatusState = 'error';
        setStatusText(catalogStatusEl, t('catalog.error'));
        if (catalogMeta) {
            catalogMeta.textContent = t('catalog.metaError');
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td colspan="5" class="px-4 py-4 text-center text-rose-400">
        ${t('catalog.errorRow')}
      </td>
    `;
        catalogTableBody.innerHTML = '';
        catalogTableBody.appendChild(tr);
        addActivity(t('activity.catalogError', { query }), 'error');
        notify('error', t('notify.catalogSearchFail'));
    }
}

function renderCatalogTable() {
    if (!catalogTableBody) return;

    catalogTableBody.innerHTML = '';

    if (!catalogResults || catalogResults.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td colspan="5" class="px-4 py-4 text-center text-slate-400">
        ${t('catalog.empty')}
      </td>
    `;
        catalogTableBody.appendChild(tr);
        return;
    }

    for (const pkg of catalogResults) {
        const tr = document.createElement('tr');

        const versionPill = pkg.version
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                       bg-slate-800 text-slate-200 border border-slate-700">
           ${pkg.version}
         </span>`
            : `<span class="text-xs text-slate-500">${t('common.notAvailable')}</span>`;

        const sourcePill = pkg.source
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                       bg-slate-800 text-slate-200 border border-slate-700">
           ${pkg.source}
         </span>`
            : `<span class="text-xs text-slate-500">${t('common.notAvailable')}</span>`;

        tr.innerHTML = `
      <td class="px-4 py-2">${pkg.name || ''}</td>
      <td class="px-4 py-2 text-xs text-slate-300">
        <span
            class="inline-block max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap align-middle"
            title="${pkg.id || ''}"
        >
            ${pkg.id || ''}
        </span>
      </td>
      <td class="px-4 py-2">${versionPill}</td>
      <td class="px-4 py-2">${sourcePill}</td>
      <td class="px-4 py-2 text-right">
        <button
          class="inline-flex items-center gap-1 px-3 py-1 rounded-full
                 bg-mint hover:bg-teal-400 text-[11px] font-semibold
                 uppercase tracking-wide shadow-sm shadow-teal-900/40
                 transition-colors"
          data-action="install"
          data-id="${pkg.id}"
          data-name="${pkg.name || ''}"
        >
          ${t('actions.install')}
        </button>
      </td>
    `;

        const installBtn = tr.querySelector('button[data-action="install"]');
        if (installBtn) {
            installBtn.addEventListener('click', (e) => onInstallClick(pkg, e.currentTarget));
        }

        catalogTableBody.appendChild(tr);
    }
}

async function onInstallClick(pkg, buttonEl) {
    if (!pkg.id) {
        alert(t('alerts.missingPackageId'));
        return;
    }

    const sourceLabel = t('common.sourceLabel');
    const source = pkg.source ? ` | ${sourceLabel}: ${pkg.source}` : '';
    const msg = t('alerts.installConfirm', { name: pkg.name, id: pkg.id, source });
    const ok = confirm(msg);
    if (!ok) return;

    setButtonLoading(buttonEl, true, t('actions.install'), t('actions.installing'));
    setStatusText(catalogStatusEl, t('status.installing', { name: pkg.name }));
    addActivity(t('activity.installStart', { name: pkg.name }), 'info');

    try {
        await window.electronAPI.installPackage({
            id: pkg.id,
            source: pkg.source || ''
        });
        setStatusText(catalogStatusEl, t('status.installDone', { name: pkg.name }));
        addActivity(t('activity.installDone', { name: pkg.name }), 'success');
        notify('success', t('notify.installDone', { name: pkg.name }));
        await loadApps();
    } catch (err) {
        console.error('Install error (renderer):', err);
        alert(
            t('alerts.installError', {
                error: err && err.message ? err.message : String(err)
            })
        );
        setStatusText(catalogStatusEl, t('status.installError'));
        addActivity(t('activity.installError', { name: pkg.name }), 'error');
        notify('error', t('notify.installError', { name: pkg.name }));
    } finally {
        setButtonLoading(buttonEl, false, t('actions.install'), t('actions.install'));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    appsStatusEl = document.getElementById('appsStatus');
    appsTableBody = document.getElementById('appsTableBody');
    appsSearchInput = document.getElementById('appsSearchInput');
    appsRefreshBtn = document.getElementById('appsRefreshBtn');
    appsOnlyUpgradable = document.getElementById('appsOnlyUpgradable');
    appsSelectAllUpgradable = document.getElementById('appsSelectAllUpgradable');
    appsSortSelect = document.getElementById('appsSortSelect');
    appsTotalCount = document.getElementById('appsTotalCount');
    appsUpgradableCount = document.getElementById('appsUpgradableCount');
    appsLastSync = document.getElementById('appsLastSync');
    activityList = document.getElementById('activityList');
    toastStack = document.getElementById('toastStack');
    operationLogList = document.getElementById('operationLogList');
    logClearBtn = document.getElementById('logClearBtn');
    appsUpgradeSelectedBtn = document.getElementById('appsUpgradeSelectedBtn');

    catalogStatusEl = document.getElementById('catalogStatus');
    catalogSearchInput = document.getElementById('catalogSearchInput');
    catalogSearchBtn = document.getElementById('catalogSearchBtn');
    catalogTableBody = document.getElementById('catalogTableBody');
    catalogMeta = document.getElementById('catalogMeta');
    windowControlButtons = document.querySelectorAll('[data-window-control]');
    languageSelect = document.getElementById('languageSelect');

    if (!appsStatusEl || !appsTableBody || !appsSearchInput || !appsRefreshBtn) {
        console.error('Elementi DOM mancanti per la sezione installati.');
        return;
    }
    if (!catalogStatusEl || !catalogSearchInput || !catalogSearchBtn || !catalogTableBody) {
        console.error('Elementi DOM mancanti per la sezione catalogo.');
    }

    appsSearchInput.addEventListener('input', renderInstalledTable);
    if (appsOnlyUpgradable) {
        appsOnlyUpgradable.addEventListener('change', renderInstalledTable);
    }
    if (appsSelectAllUpgradable) {
        appsSelectAllUpgradable.addEventListener('change', updateBulkUpgradeButton);
    }
    if (appsSortSelect) {
        appsSortSelect.addEventListener('change', renderInstalledTable);
    }
    appsRefreshBtn.addEventListener('click', loadApps);
    if (appsUpgradeSelectedBtn) {
        appsUpgradeSelectedBtn.addEventListener('click', startBulkUpgrade);
        updateBulkUpgradeButton();
    }

    catalogSearchBtn.addEventListener('click', onCatalogSearch);
    catalogSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            onCatalogSearch();
        }
    });

    if (windowControlButtons && window.electronAPI && window.electronAPI.windowControl) {
        windowControlButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-window-control');
                if (action) {
                    window.electronAPI.windowControl(action);
                }
            });
        });
    }

    if (logClearBtn) {
        logClearBtn.addEventListener('click', clearOperationLog);
    }

    if (window.electronAPI && window.electronAPI.onOperationLog) {
        window.electronAPI.onOperationLog(handleOperationLog);
    }

    const initialLanguage = resolveInitialLanguage();
    applyTranslations(initialLanguage);
    if (languageSelect) {
        languageSelect.value = initialLanguage;
        languageSelect.addEventListener('change', () => {
            applyTranslations(languageSelect.value);
        });
    }

    loadApps();
});
