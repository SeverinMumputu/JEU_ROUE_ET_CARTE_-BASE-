// -------------------------
// getAnimationTarget (fiabilisé)
// -------------------------
function getAnimationTarget(player, targetType, cardId) {
  const arena = document.getElementById('arena');
  // fallback générique
  const handEl = document.querySelector(`.hand.${player}`);
  const statusEl = document.querySelector(`.player-indicator.${player}`) || document.querySelector(`.status.${player}`);

  try {
    switch (targetType) {
      case 'slot': {
        if (!arena) return null;
        // Priorité : slot contenant l'image précise (si présent)
        let img = arena.querySelector(`.drop-slots.${player} .slot.occupied img.arena-card[src*="${cardId}"]`);
        if (img) return img;
        // sinon renvoyer première image occupée
        img = arena.querySelector(`.drop-slots.${player} .slot.occupied img.arena-card`);
        return img || null;
      }
      case 'hand': {
        // cherche image exacte puis case contenant data-cardKey
        const byImg = document.querySelector(`.hand.${player} .card[data-cardkey="${cardId}"]`);
        if (byImg) return byImg;
        const cardImg = document.querySelector(`.hand.${player} .card img[src*="${cardId}"]`);
        if (cardImg) return cardImg;
        // fallback: première carte visible
        const anyCard = document.querySelector(`.hand.${player} .card`);
        return anyCard || null;
      }
      case 'player-indicator':
        return statusEl || handEl || document.getElementById('arena');
      case 'arena':
        return arena ? arena.querySelector(`.drop-slots.${player}`) || arena : null;
      default:
        return null;
    }
  } catch (err) {
    console.warn('getAnimationTarget err', err);
    return null;
  }
}

// -------------------------
// applyCardEffect (avec toast repositionné par cible + titre)
// -------------------------
function applyCardEffect(player, cardId) {
  const opponent = getOpponent(player);
  safeLog(`${player} joue ${cardId}`);

  // -----------------------
  // HELPERS POUR LES TOASTS
  // -----------------------
  function getCardDescription(id) {
    if (!id || !CARD_MANAGER) return null;
    for (const groupName in CARD_MANAGER) {
      const arr = CARD_MANAGER[groupName];
      if (!Array.isArray(arr)) continue;
      const found = arr.find(c => c.id === id);
      if (found) return found.description || found.label || found.id;
    }
    return null;
  }

  function getCardTypeFromId(id) {
    if (!id || typeof id !== 'string') return 'neutral';
    if (id.startsWith('pt_')) return 'point';
    if (id.startsWith('malus_')) return 'malus';
    if (id.startsWith('atk_')) return 'attack';
    if (id.startsWith('def_')) return 'defense';
    if (id.startsWith('joker_')) return 'joker';
    if (id.startsWith('bonus_')) return 'bonus';
    return 'neutral';
  }

  function normalizeEntity(e) {
    if (e === 'player') return 'Joueur';
    if (e === 'ia' || e === 'IA') return 'IA';
    return String(e);
  }

  /**
   * showMagicToast(...parts)
   * - Si l'un des args fait référence à 'player' ou 'ia' (ou correspond à la variable player/opponent),
   *   la toast sera affichée à côté de l'arène/slot de cette entité.
   * - Sinon, fallback : toast en haut à droite (comportement legacy).
   * - Ajoute un petit titre indiquant le propriétaire (Joueur / IA).
   */
  function showMagicToast(...parts) {
    try {
      // Détection de la cible (player/ia) dans les arguments du toast
      let anchorKey = null;
      for (const p of parts) {
        if (p === player) { anchorKey = player; break; }
        if (p === opponent) { anchorKey = opponent; break; }
        if (typeof p === 'string') {
          const low = p.toLowerCase();
          if (low === 'player' || low === 'joueur') { anchorKey = player; break; }
          if (low === 'ia' || low === 'i.a.' ) { anchorKey = opponent; break; }
        }
      }

      // description de la carte / texte utilisateur
      const cardDesc = getCardDescription(cardId) || '';
      const userText = parts
        .filter(p => p !== undefined && p !== null)
        .map(p => (p === player || p === opponent) ? normalizeEntity(p) : String(p))
        .join(' ')
        .trim();
      const finalText = cardDesc ? (cardDesc + (userText ? ` — ${userText}` : '')) : (userText || 'Effet appliqué');

      // choix du conteneur selon anchorKey (par joueur) ou global fallback
      const containerId = anchorKey ? `game-toast-container-${anchorKey}` : 'game-toast-container-global';
      let container = document.getElementById(containerId);

      // If container not found, create and position it.
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.zIndex = 99999;
        container.style.pointerEvents = 'none';
        // Positioning: if anchored to a player, position close to that player's arena slot row
        if (anchorKey) {
          // Attempt to anchor near arena drop slots row, otherwise near the hand, otherwise fallback top-right
          const arenaRow = document.querySelector(`#arena .drop-slots.${anchorKey}`);
          const someSlot = document.querySelector(`#arena .drop-slots.${anchorKey} .slot`) || null;
          const fallbackHand = document.querySelector(`.hand.${anchorKey}`) || null;
          let rect = null;
          if (someSlot) rect = someSlot.getBoundingClientRect();
          else if (arenaRow) rect = arenaRow.getBoundingClientRect();
          else if (fallbackHand) rect = fallbackHand.getBoundingClientRect();

          if (rect) {
            // position fixed next to the slot row (to the right)
            container.style.position = 'fixed';
            // We'll set left/top approximatively, then after DOM insertion we adjust vertically to center the container.
            container.style.left = Math.min(window.innerWidth - 20, rect.right + 12) + 'px';
            container.style.top = Math.max(6, rect.top + (rect.height / 2) - 40) + 'px';
            container.dataset.anchorRectTop = rect.top;
          } else {
            // fallback top-right
            Object.assign(container.style, { position: 'fixed', right: '20px', top: '20px' });
          }
        } else {
          // global fallback
          Object.assign(container.style, { position: 'fixed', right: '20px', top: '20px' });
        }
        document.body.appendChild(container);
      } else {
        // if container exists and anchored, try to keep it next to the anchor (update position in case of resize)
        if (anchorKey) {
          const someSlot = document.querySelector(`#arena .drop-slots.${anchorKey} .slot`) || document.querySelector(`#arena .drop-slots.${anchorKey}`) || null;
          if (someSlot) {
            const rect = someSlot.getBoundingClientRect();
            container.style.left = Math.min(window.innerWidth - 20, rect.right + 12) + 'px';
            container.style.top = Math.max(6, rect.top + (rect.height / 2) - (container.offsetHeight/2)) + 'px';
          }
        }
      }

      // choose style based on card type
      const type = getCardTypeFromId(cardId);
      const styleMap = {
        point: { bg: 'linear-gradient(135deg,#2ecc71,#27ae60)', glow: '0 6px 20px rgba(46,204,113,0.28)' }, // vert
        malus: { bg: 'linear-gradient(135deg,#e74c3c,#c0392b)', glow: '0 6px 20px rgba(231,76,60,0.28)' }, // rouge
        attack: { bg: 'linear-gradient(135deg,#f39c12,#e67e22)', glow: '0 6px 20px rgba(243,156,18,0.22)' }, // orange
        defense: { bg: 'linear-gradient(135deg,#3498db,#2980b9)', glow: '0 6px 20px rgba(52,152,219,0.20)' }, // bleu
        joker: { bg: 'linear-gradient(135deg,#8e44ad,#9b59b6)', glow: '0 6px 20px rgba(142,68,173,0.18)' }, // violet
        bonus: { bg: 'linear-gradient(135deg,#f1c40f,#f39c12)', glow: '0 6px 20px rgba(241,196,15,0.18)' }, // or
        neutral: { bg: 'linear-gradient(135deg,#ffffff,#ececec)', glow: '0 6px 20px rgba(0,0,0,0.06)' }
      };
      const s = styleMap[type] || styleMap.neutral;

      // Build the toast element with owner/title
      const toast = document.createElement('div');
      toast.className = 'game-toast';
      Object.assign(toast.style, {
        pointerEvents: 'auto',
        minWidth: '220px',
        maxWidth: '360px',
        padding: '10px 14px',
        borderRadius: '12px',
        color: (type === 'neutral' ? '#222' : '#fff'),
        background: s.bg,
        boxShadow: s.glow,
        fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '13px',
        lineHeight: '1.2',
        transform: 'translateY(-6px)',
        opacity: '0',
        transition: 'transform .25s ease, opacity .25s ease',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-start'
      });

      // Header with owner name (title)
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.width = '100%';

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '8px';

      const typeDot = document.createElement('span');
      typeDot.style.width = '10px';
      typeDot.style.height = '10px';
      typeDot.style.borderRadius = '50%';
      typeDot.style.display = 'inline-block';
      const dotColorMap = {
        point: '#2ecc71', malus: '#e74c3c', attack: '#f39c12',
        defense: '#3498db', joker: '#8e44ad', bonus: '#f1c40f', neutral: '#999'
      };
      typeDot.style.background = dotColorMap[type] || '#999';

      // owner badge (player/IA) shown prominently
      const ownerBadge = document.createElement('span');
      ownerBadge.style.fontSize = '12px';
      ownerBadge.style.fontWeight = 700;
      ownerBadge.style.opacity = '0.95';
      ownerBadge.style.padding = '2px 8px';
      ownerBadge.style.borderRadius = '999px';
      ownerBadge.style.background = 'rgba(0,0,0,0.08)';
      ownerBadge.style.color = (type === 'neutral' ? '#222' : '#fff');
      // if anchorKey exists we display an owner (Joueur/IA), else a generic title
      ownerBadge.textContent = anchorKey ? normalizeEntity(anchorKey) : (cardDesc ? cardDesc.split(' ')[0] : 'Info');

      const title = document.createElement('div');
      title.style.fontSize = '13px';
      title.style.fontWeight = 600;
      title.style.opacity = '0.95';
      title.textContent = cardDesc ? (cardDesc.length < 36 ? cardDesc : cardDesc.slice(0,34) + '…') : (userText || 'Effet');

      left.appendChild(typeDot);
      left.appendChild(ownerBadge);
      left.appendChild(title);
      header.appendChild(left);

      // close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      Object.assign(closeBtn.style, {
        background: 'transparent',
        border: 'none',
        color: (type === 'neutral' ? '#555' : 'rgba(255,255,255,0.9)'),
        cursor: 'pointer',
        fontSize: '12px',
        padding: '2px 6px',
        borderRadius: '6px',
      });
      closeBtn.addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 220);
      });
      header.appendChild(closeBtn);

      const body = document.createElement('div');
      body.style.fontSize = '12px';
      body.style.opacity = '0.95';
      body.style.maxHeight = '120px';
      body.style.overflow = 'hidden';
      body.textContent = finalText;

      toast.appendChild(header);
      toast.appendChild(body);

      // add toast to container (newest on top)
      container.prepend(toast);

      // animate in
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });

      // after append, if anchored, adjust vertical centering relative to anchor
      if (anchorKey) {
        const anchorSlot = document.querySelector(`#arena .drop-slots.${anchorKey} .slot`) ||
                           document.querySelector(`#arena .drop-slots.${anchorKey}`) ||
                           document.querySelector(`.hand.${anchorKey}`);
        if (anchorSlot) {
          const rect = anchorSlot.getBoundingClientRect();
          // center the container vertically around the slot center
          const newTop = Math.max(6, rect.top + (rect.height / 2) - (container.offsetHeight / 2));
          // ensure it stays on viewport
          container.style.top = Math.min(Math.max(6, newTop), window.innerHeight - container.offsetHeight - 8) + 'px';
          // adjust left again (in case of window resizing)
          container.style.left = Math.min(window.innerWidth - 20 - container.offsetWidth, rect.right + 12) + 'px';
        }
      }

      // auto remove after TTL, pause on hover
      let ttl = 3000;
      let removal = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 220);
      }, ttl);

      toast.addEventListener('mouseenter', () => clearTimeout(removal));
      toast.addEventListener('mouseleave', () => {
        removal = setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-8px)';
          setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 220);
        }, 1500);
      });

    } catch (e) {
      console.warn('showMagicToast erreur', e);
    }
  } // end showMagicToast

  // ---------- reste de applyCardEffect (inchangé) ----------
  // helpers locaux (computeGain, resolveDefenses, animate, DOM helpers ...)
  const now = () => Date.now();

  function computeGain(targetPlayer, basePoints) {
    let pts = Math.floor(basePoints || 0);
    if (effects[targetPlayer].limitGainUntil && effects[targetPlayer].limitGainUntil > Date.now()) {
      const f = effects[targetPlayer].limitedGainFactor || 1;
      pts = Math.floor(pts * f);
    }
    if (effects[targetPlayer].reducedGainFactor) {
      pts = Math.floor(pts * effects[targetPlayer].reducedGainFactor);
    }
    if (effects[targetPlayer].plus30) {
      pts = Math.ceil(pts * 1.30);
      effects[targetPlayer].plus30 = false;
    }
    if (effects[targetPlayer].doubleNext) {
      pts = pts * 2;
      effects[targetPlayer].doubleNext = false;
    }
    if (effects[targetPlayer].x3Next) {
      pts = pts * 3;
      effects[targetPlayer].x3Next = false;
    }
    return Math.floor(pts);
  }

  function resolveDefenses(attacker, defender) {
    const tDef = effects[defender] || {};
    const targetDom = getAnimationTarget(defender, 'player-indicator');
    if (tDef.immunityUntil && Date.now() < tDef.immunityUntil) {
      glow(targetDom, { color: 'lime' });
      safeLog(defender, 'immunisé — attaque bloquée.');
      return { status: 'blocked', reason: 'immunity' };
    }
    if (tDef.shield && tDef.shield > 0) {
      tDef.shield = Math.max(0, tDef.shield - 1);
      pulse(targetDom, { color: 'aqua', scale: 1.15 });
      safeLog(defender, 'bouclier consommé — attaque bloquée.');
      return { status: 'blocked', reason: 'shield' };
    }
    if (tDef.blockNext) {
      tDef.blockNext = false;
      flash(targetDom, { color: 'white', repeats: 2 });
      safeLog(defender, 'blockNext consommé — attaque bloquée.');
      return { status: 'blocked', reason: 'blockNext' };
    }
    if (tDef.masked) {
      tDef.masked = false;
      pulse(targetDom, { color: 'silver' });
      safeLog(defender, 'masque consommé — attaque bloquée.');
      return { status: 'blocked', reason: 'masked' };
    }
    if (tDef.reflectNext) {
      tDef.reflectNext = false;
      flash(getAnimationTarget(defender, 'player-indicator'), { color: 'lime', repeats: 3 });
      safeLog(defender, 'reflectNext consommé — attaque renvoyée.');
      return { status: 'reflected', reason: 'reflect' };
    }
    if (tDef.absorbNext) {
      tDef.absorbNext = false;
      glow(getAnimationTarget(defender, 'player-indicator'), { color: 'purple' });
      safeLog(defender, 'absorbNext consommé — attaque absorbée.');
      return { status: 'absorbed', reason: 'absorb' };
    }
    return { status: 'ok' };
  }

  const animate = (type, whoOrDom, opt = {}) => {
    if (!whoOrDom) return;
    let dom = null;
    if (typeof whoOrDom === 'string') {
      dom = getAnimationTarget(whoOrDom, 'player-indicator', cardId);
    } else dom = whoOrDom;
    if (!dom) return;
    switch (type) {
      case 'pulse': pulse(dom, opt); break;
      case 'shake': shake(dom, opt); break;
      case 'glow': glow(dom, opt); break;
      case 'flash': flash(dom, opt); break;
      case 'explode': explode(dom, opt); break;
      case 'slide': slideToOpponent(dom, opt.player || player); break;
    }
  };

  const domPlayer = getAnimationTarget(player, 'player-indicator', cardId);
  const domOpponent = getAnimationTarget(opponent, 'player-indicator', cardId);
  const domArenaPlayer = getAnimationTarget(player, 'arena', cardId);
  const domArenaOpponent = getAnimationTarget(opponent, 'arena', cardId);

  // =========================
  // Switch pour toutes cartes
  // =========================
 
  switch (cardId) {

    // -------- POINTS (s'appliquent au joueur qui joue) ----------
    case 'pt_25':
    case 'pt_50':
    case 'pt_75':
    case 'pt_100':
    case 'pt_150':
    case 'pt_200': {
      const base = parseInt(cardId.split('_')[1]) || 0;
      const gain = computeGain(player, base);
      scoreUpdater(player, gain);
      // animation claire : badge joueur + arène
      animate('pulse', domPlayer, { color: 'gold', scale: 1.3 });
      animate('flash', domArenaPlayer, { color: 'gold', repeats: 3 });
      // toast: show description
      showMagicToast(player);
      break;
    }

    // -------- ATTAQUES ----------
    case 'atk_vision': {
      effects[player].vision = (effects[player].vision || 0) + 1;
      safeLog(player, 'vision activée (flag).');
      showMagicToast(player, 'vision activée');
      animate('glow', domPlayer, { color: 'cyan', duration: 12000 });
      break;
    }

    case 'atk_stop': {
      // cible : opponent (peut être renvoyé / bloqué)
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent, { color: 'orange' }); showMagicToast('Roue stoppée bloquée', opponent); break; }
      if (res.status === 'reflected') {
        // stop l'attaquant à la place
        effects[player].wheelStopped = true;
        animate('shake', domPlayer, { color: 'orange' });
        safeLog('Stop renvoyé — roue stoppée pour', player);
        showMagicToast('Stop renvoyé — roue stoppée pour', player);
        break;
      }
      if (res.status === 'absorbed') {
        // l'adversaire absorbe : on donne un petit bonus au défenseur
        scoreUpdater(opponent, 20);
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, 'a absorbé l\'effet et gagne +20 pts');
        break;
      }
      // attaque réussie
      effects[opponent].wheelStopped = true;
      safeLog('Roue stoppée pour', opponent);
      showMagicToast('Roue stoppée pour', opponent);
      animate('shake', domOpponent, { color: 'orange' });
      break;
    }

    case 'atk_echange': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('flash', domOpponent); showMagicToast('Échange bloqué', opponent); break; }
      // déterminer cible logique
      const actualTarget = (res.status === 'reflected') ? player : opponent;
      const other = getOpponent(actualTarget);

      // tenter échange d'arène
      const mySlot = findRandomOccupiedArenaSlotDOM(actualTarget);
      const hisSlot = findRandomOccupiedArenaSlotDOM(other);
      if (mySlot && hisSlot) {
        const myImg = mySlot.querySelector('img.arena-card');
        const hisImg = hisSlot.querySelector('img.arena-card');
        const tmp = myImg.src;
        myImg.src = hisImg.src;
        hisImg.src = tmp;
        animate('flash', mySlot);
        animate('flash', hisSlot);
        safeLog('Échange d’arène entre', actualTarget, 'et', other);
        showMagicToast(actualTarget, 'échange d’arène avec', other);
      } else {
        // échange mains (fallback)
        const handA = document.querySelector(`.hand.${actualTarget}`);
        const handB = document.querySelector(`.hand.${other}`);
        if (handA && handB) {
          const cardsA = Array.from(handA.querySelectorAll('.card')).filter(c => c.style.backgroundImage);
          const cardsB = Array.from(handB.querySelectorAll('.card')).filter(c => c.style.backgroundImage);
          if (cardsA.length && cardsB.length) {
            const a = cardsA[Math.floor(Math.random()*cardsA.length)];
            const b = cardsB[Math.floor(Math.random()*cardsB.length)];
            const tmpbg = a.style.backgroundImage;
            a.style.backgroundImage = b.style.backgroundImage;
            b.style.backgroundImage = tmpbg;
            animate('flash', a);
            animate('flash', b);
            safeLog('Échange forcé de mains entre', actualTarget, 'et', other);
            showMagicToast(actualTarget, 'échange forcé de mains avec', other);
          } else {
            safeLog('Aucun échange possible — pas de cartes trouvées.');
            showMagicToast('Aucun échange possible — pas de cartes trouvées.');
          }
        }
      }
      break;
    }

    case 'atk_vol': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Vol bloqué', opponent); break; }
      if (res.status === 'reflected') {
        // vol renvoyé : l'attaquant se fait voler
        stealArenaCard(player, opponent); // from player to opponent
        animate('slide', getAnimationTarget(player, 'hand', cardId));
        safeLog('Vol renvoyé : attaquant volé à son tour.');
        showMagicToast('Vol renvoyé : attaquant volé à son tour.');
        break;
      }
      if (res.status === 'absorbed') {
        // défenseur absorbe : défenseur gagne petit bonus
        scoreUpdater(opponent, 25);
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, 'a absorbé le vol et gagne +25 pts');
        break;
      }
      // vol classique : voler 50 points (ou carte)
      const stolen = stealArenaCard(opponent, player);
      if (!stolen) {
        const gain = computeGain(player, 50);
        scoreUpdater(player, gain);
        showMagicToast(player, `+${gain} points (crédit car pas d'emplacement)`);
      } else {
        safeLog('Carte volée depuis arène adverse.');
        showMagicToast('Carte volée depuis arène adverse.');
      }
      animate('slide', getAnimationTarget(player, 'arena', cardId));
      break;
    }

    case 'atk_destruction': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('explode', domOpponent); showMagicToast('Destruction bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      const destroyed = destroyArenaCard(targetName);
      if (!destroyed) {
        const hisHand = document.querySelector(`.hand.${targetName}`);
        if (hisHand) {
          const hisCards = Array.from(hisHand.querySelectorAll('.card')).filter(c => c.style.backgroundImage);
          if (hisCards.length) {
            const victim = hisCards[Math.floor(Math.random()*hisCards.length)];
            victim.style.backgroundImage = '';
            victim.style.opacity = 0.5;
            victim.style.pointerEvents = 'none';
            animate('explode', victim);
            safeLog('Carte détruite dans la main de', targetName);
            showMagicToast('Carte détruite dans la main de', targetName);
          }
        }
      } else {
        animate('explode', getAnimationTarget(targetName, 'arena', cardId));
        showMagicToast('Carte détruite en arène de', targetName);
      }
      if (res.status === 'absorbed') {
        scoreUpdater(opponent, 60);
        showMagicToast(opponent, '+60 points (absorption)');
      } else {
        scoreUpdater(targetName, -60);
        showMagicToast(targetName, '-60 points appliqués');
      }
      break;
    }

    case 'atk_reduction': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Réduction bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        timers[opponent] = Math.max(0, (timers[opponent] || 0) + 10);
        animate('pulse', domOpponent, { color: 'purple' });
        updateTimersUI();
        safeLog('Reduction absorbée : défenseur récupère du temps.');
        showMagicToast(opponent, 'Reduction absorbée : +10s pour défenseur');
      } else {
        timers[targetName] = Math.max(0, (timers[targetName] || 0) - 30);
        animate('shake', (targetName === player) ? domPlayer : domOpponent, { color: 'red' });
        updateTimersUI();
        safeLog(targetName, 'a perdu 30s (atk_reduction).');
        showMagicToast(targetName, 'a perdu 30s (atk_reduction).');
      }
      checkVictoryOrTimeout();
      break;
    }

    case 'atk_limitation': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('glow', domOpponent); showMagicToast('Limitation bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        scoreUpdater(opponent, 15);
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, '+15 points (absorption)');
      } else {
        effects[targetName].limitedInventory = (effects[targetName].limitedInventory || 0) + 1;
        effects[targetName].limitedGainFactor = 0.75; // -25%
        safeLog(targetName, 'limité (inventory, -25% gains).');
        showMagicToast(targetName, 'limitation : -25% sur gains (flag)');
        animate('glow', (targetName === player) ? domPlayer : domOpponent, { color: 'orange' });
      }
      break;
    }

    // -------- DEFENSES ----------
    case 'def_masque':
      effects[player].masked = true;
      safeLog(player, 'masque activé.');
      showMagicToast(player, 'Masque activé — bloque la prochaine attaque');
      animate('glow', domPlayer, { color: 'lightblue' });
      break;

    case 'def_blocage':
      effects[player].blockNext = true;
      safeLog(player, 'blockNext activé.');
      showMagicToast(player, 'Blocage activé — bloque la prochaine attaque');
      animate('pulse', domPlayer, { color: 'silver' });
      break;

    case 'def_renvoi':
      effects[player].reflectNext = true;
      safeLog(player, 'reflectNext activé.');
      showMagicToast(player, 'Renvoi activé — renvoie la prochaine attaque');
      animate('flash', domPlayer, { color: 'lime', repeats: 3 });
      break;

    case 'def_explosion': {
      const doms = getArenaSlotDOMs(opponent);
      doms.forEach(s => {
        if (s.classList.contains('occupied')) {
          removeArenaCardAtSlot(s, opponent);
          animate('explode', s);
        }
      });
      safeLog('Explosion : arène de', opponent, 'nettoyée.');
      showMagicToast('Explosion : arène de', opponent, 'nettoyée.');
      scoreUpdater(opponent, -100);
      animate('flash', domPlayer, { color: 'red' });
      break;
    }

    case 'def_bouclier':
      effects[player].shield = (effects[player].shield || 0) + 1;
      safeLog(player, 'bouclier ajouté (stack).');
      showMagicToast(player, 'Bouclier ajouté (consomme 1 attaque)');
      animate('glow', domPlayer, { color: 'aqua' });
      break;

    case 'def_restauration':
      timers[player] = (timers[player] || 0) + 30;
      updateTimersUI();
      safeLog(player, '+30s timer restauré.');
      showMagicToast(player, '+30s restaurés');
      animate('pulse', domPlayer, { color: 'lime' });
      break;

    case 'def_suppression':
      effects[player] = {};
      safeLog(player, 'tous malus supprimés (reset).');
      showMagicToast(player, 'Tous les malus supprimés');
      animate('flash', domPlayer, { color: 'yellow', repeats: 4 });
      break;

    // -------- MALUS ----------
    case 'malus_hasard': {
      const maluses = ['malus_perte50', 'malus_reduction1', 'malus_perte30'];
      const pick = maluses[Math.floor(Math.random()*maluses.length)];
      safeLog('Malus hasard choisi :', pick);
      showMagicToast('Malus hasard choisi :', pick);
      applyCardEffect(player, pick);
      break;
    }

    case 'malus_division': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Division bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        scoreUpdater(opponent, 30);
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, '+30 points (absorption)');
      } else {
        scores[targetName] = Math.floor((scores[targetName] || 0) / 2);
        updateScoresUI();
        checkVictoryOrTimeout();
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        safeLog(targetName, 'points divisés par 2.');
        showMagicToast(targetName, 'points divisés par 2.');
      }
      break;
    }

    case 'malus_perteTour': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Perte de tour bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        effects[player].skipNextTurn = true;
        animate('pulse', domPlayer, { color: 'purple' });
        showMagicToast(player, 'Skip appliqué à l\'attaquant (absorption)');
      } else {
        effects[targetName].skipNextTurn = true;
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        safeLog(targetName, 'va perdre son prochain tour.');
        showMagicToast(targetName, 'va perdre son prochain tour.');
      }
      break;
    }

    case 'malus_reductionInv': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Réduction inventaire bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        scoreUpdater(opponent, 20);
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, '+20 points (absorption)');
      } else {
        effects[targetName].reducedInventory = (effects[targetName].reducedInventory || 0) + 1;
        effects[targetName].reducedGainFactor = 0.8; // -20%
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        safeLog(targetName, 'réduction des gains (-20%).');
        showMagicToast(targetName, 'réduction des gains (-20%).');
      }
      break;
    }

    case 'malus_perte50': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Perte 50s bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        timers[opponent] = Math.max(0, (timers[opponent] || 0) + 20);
        updateTimersUI();
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, '+20s (absorption)');
      } else {
        timers[targetName] = Math.max(0, (timers[targetName] || 0) - 50);
        updateTimersUI();
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        safeLog(targetName, '-50s.');
        showMagicToast(targetName, '-50s.');
      }
      checkVictoryOrTimeout();
      break;
    }

    case 'malus_disparition': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('flash', domOpponent); showMagicToast('Disparition bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      const hisHand = document.querySelector(`.hand.${targetName}`);
      if (hisHand) {
        const jokersIds = CARD_MANAGER.JOKERS.map(j => j.id);
        const hisCards = Array.from(hisHand.querySelectorAll('.card'));
        for (const c of hisCards) {
          const bg = (c.style.backgroundImage || '').toLowerCase();
          if (!bg) continue;
          if (jokersIds.some(id => bg.includes(id.toLowerCase()) || bg.includes('joker'))) {
            c.style.backgroundImage = '';
            c.style.opacity = 0.5;
            c.style.pointerEvents = 'none';
            animate('explode', c);
            safeLog('Joker retiré de la main de', targetName);
            showMagicToast('Joker retiré de la main de', targetName);
            break;
          }
        }
      }
      break;
    }

    case 'malus_reduction1': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Réduction 1 bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        scoreUpdater(opponent, 5);
        animate('pulse', domOpponent);
        showMagicToast(opponent, '+5 pts (absorption)');
      } else {
        effects[targetName].reducedInventory = (effects[targetName].reducedInventory || 0) + 1;
        scoreUpdater(targetName, -10);
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        showMagicToast(targetName, '-10 points (réduction inventaire)');
      }
      break;
    }

    case 'malus_perte30': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Perte30 bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        timers[opponent] = Math.max(0, (timers[opponent] || 0) + 10);
        updateTimersUI();
        animate('pulse', domOpponent);
        showMagicToast(opponent, '+10s (absorption)');
      } else {
        const lost = Math.floor((timers[targetName] || 0) * 0.30);
        timers[targetName] = Math.max(0, (timers[targetName] || 0) - lost);
        updateTimersUI();
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        safeLog(targetName, `-30% du temps (${lost}s).`);
        showMagicToast(targetName, `-30% du temps (${lost}s).`);
      }
      checkVictoryOrTimeout();
      break;
    }

    case 'malus_limitGain': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('glow', domOpponent); showMagicToast('LimitGain bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        scoreUpdater(opponent, 20);
        animate('pulse', domOpponent);
        showMagicToast(opponent, '+20 pts (absorption)');
      } else {
        effects[targetName].limitGainUntil = Date.now() + 45 * 1000;
        effects[targetName].limitedGainFactor = 0.5;
        safeLog(targetName, 'limitation -50% pour 45s.');
        showMagicToast(targetName, 'limitation -50% pour 45s.');
        animate('glow', (targetName === player) ? domPlayer : domOpponent, { color: 'orange' });
      }
      break;
    }

    case 'malus_blocJoker': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('pulse', domOpponent); showMagicToast('BlocJoker bloqué', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      effects[targetName].blockJokerUntil = Date.now() + 3 * 60 * 1000;
      safeLog(targetName, 'blocage des jokers pour 3 minutes.');
      showMagicToast(targetName, 'blocage des jokers pour 3 minutes.');
      animate('flash', (targetName === player) ? domPlayer : domOpponent, { color: 'gray', repeats: 3 });
      break;
    }

    // -------- BONUS ----------
    case 'bonus_supprMalus':
      effects[player] = {};
      safeLog(player, 'Tous les malus supprimés.');
      showMagicToast(player, 'Tous les malus supprimés.');
      animate('flash', domPlayer, { color: 'yellow', repeats: 4 });
      break;

    case 'bonus_x3':
      effects[player].x3Next = true;
      safeLog(player, 'x3 activé pour la prochaine action de gain.');
      showMagicToast(player, 'x3 activé pour la prochaine action de gain.');
      animate('glow', domPlayer, { color: 'lime' });
      break;

    case 'bonus_jokerHasard': {
      const jr = CARD_MANAGER.JOKERS[Math.floor(Math.random()*CARD_MANAGER.JOKERS.length)];
      const placed = placeCardInHand(player, getCardImagePath(jr.id));
      if (!placed) scoreUpdater(player, 25);
      safeLog(player, 'a reçu un joker aléatoire:', jr.id);
      showMagicToast(player, 'a reçu un joker aléatoire:', jr.id);
      animate('pulse', domPlayer, { color: 'cyan' });
      break;
    }

    case 'bonus_carteHasard': {
      const gain = computeGain(player, 50);
      scoreUpdater(player, gain);
      const any = randomCardFromAll();
      placeCardInHand(player, getCardImagePath(any.id));
      safeLog(player, 'a reçu une carte aléatoire:', any.id);
      showMagicToast(player, 'a reçu une carte aléatoire:', any.id);
      animate('pulse', domPlayer, { color: 'gold' });
      break;
    }

    case 'bonus_plus30':
      effects[player].plus30 = true;
      safeLog(player, 'plus30 activé (prochain gain +30%).');
      showMagicToast(player, 'plus30 activé (prochain gain +30%).');
      animate('glow', domPlayer, { color: 'lime' });
      break;

    case 'bonus_slots':
      effects[player].extraSlots = (effects[player].extraSlots || 0) + 2;
      scoreUpdater(player, 40);
      safeLog(player, '2 slots additionnels accordés (+40 points appliqués).');
      showMagicToast(player, '2 slots additionnels accordés (+40 points appliqués).');
      animate('pulse', domPlayer, { color: 'blue' });
      break;

    case 'bonus_double':
      effects[player].doubleNext = true;
      safeLog(player, 'doublePoints activé pour le prochain gain.');
      showMagicToast(player, 'doublePoints activé pour le prochain gain.');
      animate('glow', domPlayer, { color: 'lime' });
      break;

    // -------- JOKERS ----------
    case 'joker_limite':
      effects[opponent].jokerLimited = true;
      safeLog('Joker : limitation appliquée sur', opponent);
      showMagicToast('Joker : limitation appliquée sur', opponent);
      animate('shake', domOpponent);
      break;

    case 'joker_retourne':
      effects[player].returnAttackNext = true;
      safeLog(player, 'joker_retourne activé (renvoi d’attaque).');
      showMagicToast(player, 'joker_retourne activé (renvoi d’attaque).');
      animate('glow', domPlayer, { color: 'lime' });
      break;

    case 'joker_neutralise':
      effects[player].neutralizePickpocket = true;
      safeLog(player, 'joker_neutralise activé (neutralise pickpocket/autodestruction).');
      showMagicToast(player, 'joker_neutralise activé (neutralise pickpocket/autodestruction).');
      animate('pulse', domPlayer, { color: 'aqua' });
      break;

    case 'joker_parade':
      effects[player].parade = true;
      safeLog(player, 'joker_parade activé (parade échanges/mine).');
      showMagicToast(player, 'joker_parade activé (parade échanges/mine).');
      animate('flash', domPlayer, { color: 'gold', repeats: 3 });
      break;

    case 'joker_immunite':
      effects[player].immunityUntil = Date.now() + (2 * 60 * 1000); // 2 minutes
      safeLog(player, 'joker_immunite activé (immunité temporaire).');
      showMagicToast(player, 'joker_immunite activé (immunité temporaire).');
      animate('glow', domPlayer, { color: 'lime' });
      break;

    case 'joker_annule':
      effects[player] = {};
      safeLog(player, 'joker_annule : toutes limitations annulées.');
      showMagicToast(player, 'joker_annule : toutes limitations annulées.');
      animate('flash', domPlayer, { color: 'yellow', repeats: 3 });
      break;

    case 'joker_absorbe':
      effects[player].absorbNext = true;
      safeLog(player, 'joker_absorbe : absorbera la prochaine attaque.');
      showMagicToast(player, 'joker_absorbe : absorbera la prochaine attaque.');
      animate('glow', domPlayer, { color: 'purple' });
      break;

    default:
      safeLog('Carte sans règle implémentée pour', cardId);
      showMagicToast('Carte sans règle implémentée pour', cardId);
      animate('pulse', domPlayer, { color: 'white' });
      break;
  }

  // Mise à jour UI & vérifications (inchangées)
  updateScoresUI();
  updateTimersUI();
  checkVictoryOrTimeout();
}