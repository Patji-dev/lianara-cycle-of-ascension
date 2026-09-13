/* Ink & Jade is a presentation layer over the original game objects and controls. */
let inkUI = null;
function initializeInkUI() {
    const byId = id => document.getElementById(id);
    const nav = byId('tabcolumn');
    byId('mainarea').prepend(nav);
    nav.prepend(document.querySelector('.header'));
    document.querySelector('.header h3').innerHTML = 'Lianara<small>Cycle of Ascension</small>';
    nav.setAttribute('aria-label', 'Your path');
    const cultivationLink = document.createElement('a');
    cultivationLink.href = '#cultivationPanel';
    cultivationLink.className = 'ink-cultivation-link';
    cultivationLink.textContent = '◉  Cultivation';
    document.querySelector('.header').after(cultivationLink);
    byId('jobsTabButton').textContent = 'Martial Hall';
    byId('skillsTabButton').textContent = 'Scripture Hall';
    byId('shopTabButton').textContent = 'Residence & Treasury';
    for (const element of document.querySelectorAll('[onclick].tabButton, [onclick].tabButtonSettings, [onclick].tabButtonDarkMatter, [onclick].tabButtonMetaverse')) {
        element.setAttribute('role', 'button'); element.tabIndex = 0;
        element.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); element.click(); }
        });
    }
    const panel = byId('cultivationPanel');
    panel.insertAdjacentHTML('afterbegin', `<img class="ink-landscape" src="img/ink-mountains.svg" alt="">
        <div class="ink-realm-main"><div class="ink-qi-seal" role="img" aria-label="Qi progress">
        <svg viewBox="0 0 160 160" aria-hidden="true"><defs><filter id="inkBrushEdge" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".11 .19" numOctaves="2" seed="8" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter></defs><circle class="ink-seal-outline" cx="80" cy="80" r="76"/><circle class="ink-seal-track" cx="80" cy="80" r="67"/><circle id="inkQiArc" cx="80" cy="80" r="67" pathLength="100" stroke-dasharray="0 100"/><circle class="ink-seal-inner" cx="80" cy="80" r="56"/></svg>
        <div><span aria-hidden="true">氣</span><small id="inkQiPercent">0%</small></div></div>
        <div class="ink-realm-copy"><p class="ink-eyebrow">THE PATH WITHIN</p></div></div>
`);
    panel.querySelector('.ink-realm-copy').append(byId('cultivationRealm'), byId('cultivationQi'), byId('cultivationRate'));
    panel.querySelector('.cultivation-heading').remove();
    byId('happinessDisplay').parentElement.title = 'Inner Harmony affects all XP gain and Qi cultivation.';
    byId('happinessDisplay').parentElement.insertAdjacentHTML('afterend', '<div class="text-caption">Cultivation Technique XP: <span id="inkSkillXp"></span></div><div id="inkPauseSlot"></div>');
    byId('inkPauseSlot').append(byId('pauseButton'));
    panel.querySelector('.ink-realm-copy').append(byId('cultivationBreakthrough'));
    const guide = panel.querySelector('details');
    guide.append(panel.querySelector('.cultivation-actions'), panel.querySelector('.cultivation-auto-major'), byId('cultivationNextEffects'), byId('cultivationRecord'));
    byId('cultivationRate').classList.add('ink-sr-only');
    // Keep the native progress and effects elements for accessibility and existing renderers.
    byId('cultivationProgress').classList.add('ink-sr-only');
    byId('cultivationEffects').classList.add('ink-sr-only');
    panel.querySelector('details').classList.add('ink-cultivation-guide');
    byId('cultivationBreakthrough').onclick = openCultivationBreakthrough;
    const residence = document.createElement('section');
    residence.id = 'inkResidence';
    residence.innerHTML = `<p class="ink-eyebrow">YOUR SANCTUARY</p><img id="inkResidenceArt" src="img/ink-residence.svg" alt="A mountain dwelling beneath a pine tree"><p id="inkResidenceBlurb"></p><h2 id="inkResidenceName"></h2><p id="inkResidenceEffect"></p><div class="ink-residence-cost"><span>Daily upkeep</span><strong id="inkResidenceCost"><span></span><span></span><span></span><span></span><span></span></strong></div><button class="button ink-residence-link" type="button">Manage residence →</button>`;
    residence.querySelector('button').addEventListener('click', () => {
        setTab(gameData.settings.layout == 0 ? 'jobs' : 'shop');
        byId('itemPage').scrollIntoView({block:'start'});
    });
    byId('infoQuickBar').prepend(residence);
    for (const [id, title, text] of [
        ['jobPage', 'Martial Hall', 'All unlocked duties train together. Your highest-paying duty provides income.'],
        ['skillPage', 'Scripture Hall', 'All unlocked techniques train together.'],
        ['itemPage', 'Residence & Treasury', 'Choose a dwelling and supplies to support your cultivation.']
    ]) byId(id).insertAdjacentHTML('afterbegin', `<header class="ink-section-heading"><p class="ink-eyebrow">DAILY PRACTICE</p><h2>${title}</h2><p>${text}</p></header>`);
    for (const name of itemCategories.Properties) {
        const button = getRowByName(name).querySelector('.item-button');
        const image = document.createElement('img');
        image.src = RESIDENCE_ART[name]; image.alt = ''; image.loading = 'lazy';
        image.className = 'ink-residence-thumbnail'; image.width = 90; image.height = 60;
        button.prepend(image);
    }
    const taskRows = [];
    for (const table of [byId('jobTable'), byId('skillTable')]) {
        for (const row of table.querySelectorAll('tr[id^="row"]')) {
            row.classList.add('ink-training-row');
            const description = document.createElement('td');
            description.className = 'ink-training-description';
            description.id = row.id + '-description';
            description.append(row.querySelector('.tooltipText'));
            const cell = document.createElement('td');
            cell.className = 'ink-training-toggle';
            const button = document.createElement('button');
            button.type = 'button'; button.textContent = '+';
            button.setAttribute('aria-label', 'Details for ' + row.querySelector('.name').textContent);
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-controls', description.id);
            button.addEventListener('click', () => {
                const expanded = row.classList.toggle('ink-expanded');
                button.setAttribute('aria-expanded', String(expanded));
                button.textContent = expanded ? '−' : '+';
            });
            cell.append(button); row.append(cell, description);
            taskRows.push(row);
        }
    }
    document.body.insertAdjacentHTML('beforeend', `<dialog id="inkBreakthroughDialog" aria-labelledby="inkBreakthroughTitle"><form method="dialog"><button class="ink-dialog-close" aria-label="Close breakthrough">×</button></form><p class="ink-eyebrow">THE NEXT STEP</p><h2 id="inkBreakthroughTitle"></h2><p id="inkBreakthroughSummary"></p><p id="inkBreakthroughCost"></p><button id="inkConfirmBreakthrough" class="button">Break through</button></dialog>`);
    byId('inkConfirmBreakthrough').addEventListener('click', () => {
        if (breakthroughCultivation()) {
            byId('inkBreakthroughDialog').close();
            renderInkUI();
            panel.classList.remove('ink-breakthrough');
            void panel.offsetWidth;
            panel.classList.add('ink-breakthrough');
        } else if (cultivationAttemptMessage) {
            inkUI.dialog.close();
            renderInkUI();
        }
    });
    inkUI = {panel, taskRows, arc:byId('inkQiArc'), percent:byId('inkQiPercent'), seal:panel.querySelector('.ink-qi-seal'),
        xp:byId('inkSkillXp'), residenceName:byId('inkResidenceName'),
        residenceBlurb:byId('inkResidenceBlurb'), residenceEffect:byId('inkResidenceEffect'), residenceCost:byId('inkResidenceCost'), art:byId('inkResidenceArt'),
        dialog:byId('inkBreakthroughDialog'), confirm:byId('inkConfirmBreakthrough'), title:byId('inkBreakthroughTitle'),
        summary:byId('inkBreakthroughSummary'), cost:byId('inkBreakthroughCost'), previousProperty:null};
}
function openCultivationBreakthrough() {
    if (!inkUI || document.getElementById('cultivationBreakthrough').disabled) return;
    renderInkUI();
    inkUI.dialog.showModal();
}
function renderInkUI() {
    if (!inkUI) return;
    const state = gameData.cultivation;
    const stage = CULTIVATION_STAGES[state.stage];
    const next = CULTIVATION_STAGES[state.stage + 1];
    const percent = next ? Math.min(100, Math.max(0, state.qi / stage.cost * 100)) : 100;
    inkUI.arc.setAttribute('stroke-dasharray', percent + ' 100');
    const percentText = Math.floor(percent) + '%';
    if (inkUI.percent.textContent !== percentText) {
        inkUI.percent.textContent = percentText;
        inkUI.seal.setAttribute('aria-label', 'Qi progress: ' + percentText);
    }
    inkUI.xp.textContent = '+' + getCultivationSkillXpPercent() + '%';
    const property = gameData.currentProperty;
    inkUI.residenceName.textContent = displayName(property.name);
    inkUI.residenceBlurb.textContent = cultivationText(CULTIVATION_TOOLTIP_OVERRIDES[property.name] || tooltips[property.name]);
    inkUI.residenceEffect.textContent = cultivationText(property.getEffectDescription());
    formatCoins(property.getExpense(), inkUI.residenceCost);
    // Every residence has its own painting, shared across the theme palettes.
    const parchment = gameData.settings.theme === 0;
    const artKey = property.name + ':' + gameData.settings.theme;
    if (inkUI.previousProperty !== artKey) {
        inkUI.art.src = RESIDENCE_ART[property.name];
        inkUI.art.alt = 'Ink-wash painting of ' + displayName(property.name);
        inkUI.art.classList.remove('ink-residence-landscape');
        inkUI.art.classList.add('ink-painted-residence');
        inkUI.previousProperty = artKey;
    }
    inkUI.confirm.disabled = !next || state.qi < stage.cost || !canSimulate() || in_offline_progress;
    if (next) {
        inkUI.title.textContent = (stage.major ? 'Break through to ' : 'Advance to ') + next.name;
        inkUI.summary.textContent = 'Technique XP: +' + getCultivationSkillXpPercent() + '% → +' + ((state.stage + 1) * CULTIVATION_SKILL_XP_PERCENT) + '%. ' + (getCultivationStageLifespanFactor(state.stage) > 1 ? 'Lifespan: ' + format(daysToYears(getLifespan()), 1) + ' → ' + format(daysToYears(getLifespan()) * getCultivationStageLifespanFactor(state.stage), 1) + ' years.' : 'Your lifespan remains unchanged.');
        inkUI.cost.textContent = format(stage.cost) + ' Qi · ' + (stage.major ? (getBreakthroughChance() * 100).toFixed(1) + '% success chance. Failure consumes the prepared Qi; your realm is preserved.' : 'Guaranteed advancement');
    } else if (inkUI.dialog.open) inkUI.dialog.close();
}
