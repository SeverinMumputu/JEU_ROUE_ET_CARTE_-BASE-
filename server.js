// server.js (version debug & auto-init)
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIG DB - remplace par tes identifiants ou utilises process.env
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '8748Mkrs',
  database: 'game_db',
  waitForConnections: true,
  connectionLimit: 10
});

// ---------- Helper: création tables si besoin (utile en dev) ----------
async function initDbIfNeeded() {
  try {
    // wheel_selections
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wheel_selections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id VARCHAR(100) NOT NULL,
        player ENUM('player','ia') NOT NULL,
        card_key VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4;
    `);
    // hands
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hands (
        game_id VARCHAR(100) NOT NULL,
        player ENUM('player','ia') NOT NULL,
        slot TINYINT NOT NULL,
        card_key VARCHAR(255),
        PRIMARY KEY (game_id, player, slot)
      ) CHARACTER SET utf8mb4;
    `);
    console.log('[DB] Tables existantes OK (wheel_selections, hands).');
  } catch (err) {
    console.error('[DB INIT ERROR]', err);
    throw err;
  }
}

// Lance l'initialisation asynchrone
initDbIfNeeded().catch(e => {
  console.error('Impossible d\'initialiser la base :', e);
  // on continue, mais les requêtes échoueront si la DB est inacessible
});

// ---------- Utilitaires ----------
function normalizeTextToKey(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '') // enlever accents
    .replace(/[^a-zA-Z0-9]+/g, '_')
    //.replace(/^+|+$/g, '')
    .toLowerCase();
}

async function ensureSlots(gameId, player) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM hands WHERE game_id = ? AND player = ?',
    [gameId, player]
  );
  const cnt = rows[0].cnt;
  if (cnt >= 4) return;
  const inserts = [];
  for (let s = cnt + 1; s <= 4; s++) inserts.push([gameId, player, s, null]);
  if (inserts.length) {
    await pool.query('INSERT INTO hands (game_id, player, slot, card_key) VALUES ?', [inserts]);
  }
}

// ---------- Routes ----------
app.get('/', (req, res) => res.json({ ok: true, msg: 'Game API running' }));

// Debug echo endpoint (facultatif)
app.post('/api/debug-echo', (req, res) => {
  console.log('[DEBUG ECHO] body:', req.body);
  res.json({ ok: true, received: req.body });
});

// POST /api/wheel/select
app.post('/api/wheel/select', async (req, res) => {
  try {
    console.log('--- /api/wheel/select payload ---');
    console.log(req.body);

    // Accept many shapes for incoming data
    const raw = req.body || {};
    const gameId = raw.gameId || raw.game_id || raw.matchId || raw.match_id;
    const player = raw.player || raw.user || raw.actor || 'player';

    // Attempt to find cardKey in multiple places
    let cardKey = raw.cardKey || raw.card_key || raw.card?.key || raw.selectedCardKey || raw.selected?.key;

    // If the wheel sent a full card object, try to build a key:
    if (!cardKey && raw.card) {
      const card = raw.card;
      const titlePart = card.title || card.type || raw.title || raw.segmentTitle || '';
      const idPart = card.label || card.image || card.name || card.description || '';
      cardKey = normalizeTextToKey(titlePart + '_' + idPart);
    }

    // As a last resort, construct from provided fields
    if (!cardKey && raw.segmentTitle && (raw.image || raw.label || raw.description)) {
      cardKey = normalizeTextToKey(raw.segmentTitle + '_' + (raw.label || raw.image || raw.description));
    }

    // If still missing, respond with helpful error but log full payload
    if (!gameId || !player || !cardKey) {
      console.warn('[wheel/select] Missing required fields. Computed:', { gameId, player, cardKey });
      return res.status(400).json({
        error: 'Missing required field(s) (gameId/player/cardKey). Server attempted to compute cardKey from payload.',
        computed: { gameId, player, cardKey },
        received: raw
      });
    }

    console.log(`[wheel/select] storing selection for game=${gameId} player=${player} cardKey=${cardKey}`);

    // 1) insert historique
    await pool.query(
      'INSERT INTO wheel_selections (game_id, player, card_key) VALUES (?, ?, ?)',
      [gameId, player, cardKey]
    );

    // 2) ensure slots exist
    await ensureSlots(gameId, player);

    // 3) find first empty slot (NULL or empty string)
    const [empty] = await pool.query(
      'SELECT slot FROM hands WHERE game_id = ? AND player = ? AND (card_key IS NULL OR card_key = "") ORDER BY slot LIMIT 1',
      [gameId, player]
    );

    if (empty.length > 0) {
      const slot = empty[0].slot;
      await pool.query(
        'UPDATE hands SET card_key = ? WHERE game_id = ? AND player = ? AND slot = ?',
        [cardKey, gameId, player, slot]
      );

      // return updated hand
      const [handRows] = await pool.query(
        'SELECT slot, card_key FROM hands WHERE game_id = ? AND player = ? ORDER BY slot',
        [gameId, player]
      );

      console.log(`[wheel/select] assigned slot ${slot} for ${player} in game ${gameId}`);
      return res.json({ ok: true, assignedSlot: slot, hand: handRows });
    } else {
      console.warn(`[wheel/select] No free slot for ${player} in game ${gameId}`);
      return res.status(400).json({ error: 'No free slot available for player' });
    }

  } catch (err) {
    console.error('[wheel/select] ERROR', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /api/hands?gameId=xxx
app.get('/api/hands', async (req, res) => {
  try {
    const gameId = req.query.gameId || req.query.game_id;
    if (!gameId) return res.status(400).json({ error: 'Missing gameId' });

    await ensureSlots(gameId, 'player');
    await ensureSlots(gameId, 'ia');

    const [rows] = await pool.query(
      'SELECT player, slot, card_key FROM hands WHERE game_id = ? ORDER BY player, slot',
      [gameId]
    );

    const result = { player: [], ia: [] };
    for (const r of rows) result[r.player].push(r.card_key);

    res.json(result);
  } catch (err) {
    console.error('[api/hands] ERROR', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /api/game/reset
app.post('/api/game/reset', async (req, res) => {
  try {
    const { gameId } = req.body;
    if (!gameId) return res.status(400).json({ error: 'Missing gameId' });
    await pool.query('DELETE FROM wheel_selections WHERE game_id = ?', [gameId]);
    await pool.query('DELETE FROM hands WHERE game_id = ?', [gameId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[api/game/reset] ERROR', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur node.js lancé sur le port ${PORT}`));