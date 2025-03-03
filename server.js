const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Roblox group settings
const GROUP_ID = 6057393; // Change if needed
const REQUIRED_RANK = 8;  // Must be >= 8

// Pool of 30 emojis
const emojiPool = [
  "🔥", "💎", "🚀", "😎", "🎮", "👑", "⚡", "🌟", "🍀", "🐱",
  "🐶", "🎉", "🎁", "🥳", "🍕", "🍔", "🍟", "🍦", "🍩", "🍪",
  "🏀", "⚽", "🎲", "🎯", "🧩", "🎸", "📸", "💻", "📱", "🚗"
];

// Helper: Pick N random emojis
function pickRandomEmojis(num = 7) {
  const copy = [...emojiPool];
  const result = [];
  for (let i = 0; i < num; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

// Endpoint 1: Verify Username => Return userId + random emoji combo
app.post('/verify-username', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  try {
    const response = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: [username],
      excludeBannedUsers: false
    });
    const userData = response.data.data[0];
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate random emojis
    const emojiCombo = pickRandomEmojis(7);

    return res.json({
      userId: userData.id,
      username: userData.name,
      emojiCombo
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to verify username' });
  }
});

// Endpoint 2: Check Bio for emojis
// Expects body: { expectedEmojis: ["emoji1", "emoji2", ...] }
app.post('/check-bio/:userId', async (req, res) => {
  const { userId } = req.params;
  const { expectedEmojis } = req.body;

  if (!expectedEmojis || !Array.isArray(expectedEmojis)) {
    return res.status(400).json({ error: 'Expected emojis array is required' });
  }

  try {
    const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    const bio = response.data.description || "";

    // Check if all required emojis are in the bio
    const allFound = expectedEmojis.every(emoji => bio.includes(emoji));
    if (!allFound) {
      return res.status(400).json({ error: 'Not all required emojis found in bio' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to check bio' });
  }
});

// Endpoint 3: Check Group Rank
app.get('/check-rank/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const response = await axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
    const groupRole = response.data.data.find(g => g.group.id === GROUP_ID);

    if (!groupRole) {
      return res.status(403).json({ error: 'User is not in the required group' });
    }

    if (groupRole.role.rank < REQUIRED_RANK) {
      return res.status(403).json({ error: 'User rank too low' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to check group rank' });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
