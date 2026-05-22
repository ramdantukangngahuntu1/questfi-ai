import { NextRequest, NextResponse } from "next/server";

// ── Provider config ──────────────────────────────────────────
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const MIMO_API_URL = "https://api.xiaomimimo.com/v1/chat/completions";
const MIMO_API_KEY = process.env.MIMO_API_KEY || "";
const USE_GROQ = !!GROQ_API_KEY;
const USE_MIMO = !USE_GROQ && !!MIMO_API_KEY;
const DEMO_MODE = !USE_GROQ && !USE_MIMO;

// ── Enemy database ───────────────────────────────────────────
const ENEMIES = [
  { name: "Goblin Scout", hp: 30, attack: 6, defense: 3, xp: 15, tier: "common" as const, emoji: "👺" },
  { name: "Skeleton Warrior", hp: 45, attack: 8, defense: 5, xp: 25, tier: "common" as const, emoji: "💀" },
  { name: "Dark Bat Swarm", hp: 25, attack: 10, defense: 2, xp: 20, tier: "common" as const, emoji: "🦇" },
  { name: "Cave Troll", hp: 80, attack: 14, defense: 8, xp: 50, tier: "rare" as const, emoji: "👹" },
  { name: "Shadow Wraith", hp: 60, attack: 12, defense: 4, xp: 40, tier: "rare" as const, emoji: "👻" },
  { name: "Venomous Spider", hp: 50, attack: 15, defense: 3, xp: 35, tier: "rare" as const, emoji: "🕷️" },
  { name: "Dragon Whelp", hp: 120, attack: 18, defense: 12, xp: 80, tier: "epic" as const, emoji: "🐲" },
  { name: "Lich Sorcerer", hp: 100, attack: 20, defense: 6, xp: 90, tier: "epic" as const, emoji: "🧙" },
  { name: "Ancient Golem", hp: 150, attack: 16, defense: 18, xp: 100, tier: "epic" as const, emoji: "🗿" },
  { name: "Demon Lord", hp: 200, attack: 25, defense: 15, xp: 150, tier: "legendary" as const, emoji: "😈" },
  { name: "Elder Dragon", hp: 250, attack: 28, defense: 20, xp: 200, tier: "legendary" as const, emoji: "🐉" },
];

// ── Boss database ────────────────────────────────────────────
const BOSSES = [
  { name: "The Goblin King", hp: 180, attack: 16, defense: 10, xp: 120, tier: "rare" as const, emoji: "👺", abilities: ["Royal Guard Summon", "Cleave"], room: 5, lore: "Ruler of the goblin hordes, crowned in blood and bone." },
  { name: "Necromancer Malachar", hp: 280, attack: 22, defense: 8, xp: 200, tier: "epic" as const, emoji: "🧙", abilities: ["Raise Dead", "Dark Bolt", "Life Drain"], room: 10, lore: "Ancient sorcerer who cheated death itself. His phylactery pulses with sickly green light." },
  { name: "The Iron Golem", hp: 400, attack: 20, defense: 25, xp: 280, tier: "epic" as const, emoji: "🗿", abilities: ["Stomp", "Iron Fist", "Immovable"], room: 15, lore: "Forged by dwarven masters, this sentinel has guarded the deep halls for millennia." },
  { name: "Shadow Dragon Vexxarion", hp: 550, attack: 30, defense: 18, xp: 400, tier: "legendary" as const, emoji: "🐉", abilities: ["Shadow Breath", "Wing Buffet", "Dark Realm", "Tail Whip"], room: 20, lore: "The final guardian. An ancient dragon corrupted by shadow, its scales absorb light itself." },
];

// ── Crafting recipes ─────────────────────────────────────────
const RECIPES = [
  { result: "Fire Sword", type: "weapon", power: 12, emoji: "🔥", rarity: "rare", ingredients: ["Enchanted Blade", "Fire Scroll"], description: "A blade wreathed in eternal flame." },
  { result: "Mithril Plate", type: "armor", power: 14, emoji: "🛡️", rarity: "rare", ingredients: ["Mithril Armor", "Iron Shield"], description: "Lightweight yet incredibly strong." },
  { result: "Grand Health Potion", type: "consumable", power: 60, emoji: "🧪", rarity: "rare", ingredients: ["Health Potion", "Health Potion"], description: "Twice the healing power." },
  { result: "Dragonbane", type: "weapon", power: 20, emoji: "⚔️", rarity: "epic", ingredients: ["Dragonbone Sword", "Fire Sword"], description: "Forged specifically to slay dragons." },
  { result: "Void Set", type: "armor", power: 18, emoji: "🌑", rarity: "epic", ingredients: ["Shadow Cloak", "Void Amulet"], description: "Armor from the space between worlds." },
  { result: "Phoenix Armor", type: "armor", power: 22, emoji: "🔥", rarity: "epic", ingredients: ["Phoenix Shield", "Mithril Plate"], description: "Grants rebirth once per battle." },
  { result: "Godslayer", type: "weapon", power: 30, emoji: "⚡", rarity: "legendary", ingredients: ["Excalibur", "Dragonbane"], description: "A blade that can fell even gods." },
  { result: "Aegis Eternal", type: "armor", power: 28, emoji: "👑", rarity: "legendary", ingredients: ["Aegis of the Gods", "Phoenix Armor"], description: "The ultimate defense, blessed by the divine." },
  { result: "Elixir of Rebirth", type: "consumable", power: 200, emoji: "✨", rarity: "legendary", ingredients: ["Phoenix Tear", "Elixir of Life"], description: "Fully restores HP and grants temporary invincibility." },
];

// ── Dungeon map rooms ────────────────────────────────────────
// Room types handled in map generation

// ── Loot tables ──────────────────────────────────────────────
/* const LOOT_TABLES = {
  common: [
    { name: "Health Potion", type: "consumable", power: 25, emoji: "🧪" },
    { name: "Iron Shield", type: "armor", power: 3, emoji: "🛡️" },
    { name: "Steel Dagger", type: "weapon", power: 4, emoji: "🗡️" },
    { name: "Gold Coins", type: "currency", power: 10, emoji: "🪙" },
  ],
  rare: [
    { name: "Enchanted Blade", type: "weapon", power: 8, emoji: "⚔️" },
    { name: "Mithril Armor", type: "armor", power: 7, emoji: "🛡️" },
    { name: "Mana Crystal", type: "consumable", power: 40, emoji: "💎" },
    { name: "Rare Gems", type: "currency", power: 50, emoji: "💎" },
  ],
  epic: [
    { name: "Dragonbone Sword", type: "weapon", power: 15, emoji: "⚔️" },
    { name: "Phoenix Shield", type: "armor", power: 12, emoji: "🛡️" },
    { name: "Elixir of Life", type: "consumable", power: 80, emoji: "🧪" },
    { name: "Epic Gems", type: "currency", power: 150, emoji: "💎" },
  ],
  legendary: [
    { name: "Excalibur", type: "weapon", power: 25, emoji: "⚔️" },
  ],
}; */

// ── System prompts ───────────────────────────────────────────
const COMBAT_SYSTEM = `You are a combat narrator in a fantasy RPG called "QuestFi AI".
RULES:
- Write vivid, action-packed combat descriptions (2-3 sentences)
- Track damage and describe effects dramatically
- Always end with combat choices
- Use **bold** for enemy names, items, and special moves
- Keep responses under 150 tokens
FORMAT:
[Combat action]
**What do you do?**
1. Attack
2. Use a health potion
3. Defend
4. Try to flee`;

const BOSS_SYSTEM = `You are a boss encounter narrator in a fantasy RPG called "QuestFi AI".
RULES:
- Write EPIC boss encounter descriptions (3-4 sentences)
- Bosses have special abilities — describe them dramatically
- Boss fights should feel like major events
- Include phase transitions when HP drops below 50%
- Use **bold** for boss names, abilities, and key moments
- Keep responses under 200 tokens
FORMAT:
[Boss encounter narrative with ability usage]
**What do you do?**
1. Attack
2. Use a health potion
3. Defend
4. Use special ability`;

const EXPLORE_SYSTEM = `You are a Dungeon Master in a fantasy RPG called "QuestFi AI".
RULES:
- Write immersive dungeon descriptions (2-4 sentences)
- Track the party's journey
- Include dangers, treasures, NPCs, and moral dilemmas
- Use **bold** for important items, NPCs, and locations
- Keep responses under 200 tokens
- Always end with 2-4 numbered choices
FORMAT:
[Narrative]
**What do you do?**
1. [Choice A]
2. [Choice B]
3. [Choice C]`;

const CRAFT_SYSTEM = `You are a crafting master in a fantasy RPG called "QuestFi AI".
RULES:
- Describe the crafting process vividly (2-3 sentences)
- Mention the ingredients being combined
- Describe the result with excitement
- Use **bold** for item names and materials
- Keep responses under 100 tokens
FORMAT:
[Crafting narrative]
**Result:** [item created]`;

// ── LLM caller ──────────────────────────────────────────────
async function callLLM(messages: { role: string; content: string }[], maxTokens: number): Promise<{ text: string; provider: string }> {
  const providers = [];
  if (USE_GROQ) providers.push({ url: GROQ_API_URL, key: GROQ_API_KEY, model: "llama-3.3-70b-versatile", name: "Groq" });
  if (USE_MIMO) providers.push({ url: MIMO_API_URL, key: MIMO_API_KEY, model: "mimo-v2.5", name: "MiMo" });
  for (const p of providers) {
    try {
      const response = await fetch(p.url, { method: "POST", headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: p.model, messages, max_tokens: maxTokens, temperature: 0.85 }) });
      if (!response.ok) continue;
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (text) return { text, provider: p.name };
    } catch { continue; }
  }
  return { text: "", provider: "" };
}

// ── Mock responses ───────────────────────────────────────────
function mockCombatResponse(action: string, enemy: string): string {
  const attacks = [
    `You swing your weapon at the **${enemy}**! Your blade connects with a satisfying crack. The creature staggers back.`,
    `You lunge forward and strike the **${enemy}**! Dark blood spills as it howls in pain.`,
    `With a battle cry, you slash at the **${enemy}**! The force of your blow sends it stumbling.`,
  ];
  const hit = Math.random() > 0.2;
  const text = hit ? attacks[Math.floor(Math.random() * attacks.length)] : `You swing at the **${enemy}** but it dodges! The creature hisses menacingly.`;
  const enemyAttacks = [`The **${enemy}** retaliates with a vicious strike!`, `The **${enemy}** lunges at you with claws extended!`, `The **${enemy}** spits dark energy at you!`];
  const eText = enemyAttacks[Math.floor(Math.random() * enemyAttacks.length)];
  return `${text}\n\n${eText}\n\n**What do you do?**\n1. Attack again\n2. Use a health potion\n3. Defend\n4. Try to flee`;
}

function mockBossResponse(bossName: string, abilities: string[], phase: number): string {
  const ability = abilities[Math.floor(Math.random() * abilities.length)];
  const intro = phase === 1
    ? `The ground shakes as **${bossName}** rises to its full height! Its eyes burn with ancient fury.\n\n`
    : `**${bossName}** enters its second phase! Its power intensifies, the air crackling with energy!\n\n`;
  const abilityText = `It unleashes **${ability}**! The very walls tremble before its might.`;
  const response = phase === 1
    ? `${intro}${abilityText}\n\n**What do you do?**\n1. Attack with everything\n2. Use a health potion\n3. Defend and wait for opening\n4. Use a special ability`
    : `${intro}${abilityText}\n\n**What do you do?**\n1. All-out attack\n2. Use Elixir of Life\n3. Desperate defense\n4. Try to escape`;
  return response;
}

function mockCraftResponse(recipe: string, ingredients: string[]): string {
  return `You carefully combine **${ingredients.join("** and **")}** at the ancient forge. The materials glow with an inner light as they merge...\n\nWith a flash of brilliance, the **${recipe}** materializes! A masterwork of magical engineering.\n\n**Crafting complete!** The item has been added to your inventory.`;
}

function mockMapResponse(room: string): string {
  const descriptions: Record<string, string> = {
    empty: "An empty chamber. Dust motes dance in the dim light. Nothing of interest here... or is there?",
    combat: "You hear growling ahead. Something hostile lurks in this room!",
    treasure: "A glint of gold catches your eye! There might be treasure here.",
    rest: "A warm, safe alcove. You could rest here to recover your strength.",
    craft: "An ancient forge stands in the center, still glowing with residual heat.",
    boss: "The air grows heavy. A powerful presence fills this chamber. BOSS AWAITS!",
    shop: "A mysterious merchant sits cross-legged, surrounded by wares.",
    trap: "You notice tripwires and pressure plates. Proceed with caution!",
    mystery: "Strange symbols cover the walls. This room holds secrets.",
  };
  return descriptions[room] || "You enter an unknown room. The darkness is absolute.";
}

// ── POST handler ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, history, character, combat, party, mode, recipe, mapAction } = body;

    const messages: { role: string; content: string }[] = [];

    if (mode === "combat" && combat) {
      messages.push({ role: "system", content: COMBAT_SYSTEM });
      messages.push({ role: "system", content: `COMBAT: Player HP:${character.hp}/${character.maxHp}. Enemy: ${combat.enemy.name} HP:${combat.enemyHp}/${combat.enemy.maxHp}. ATK:${combat.enemy.attack}. DEF:${combat.enemy.defense}.` });
    } else if (mode === "boss" && combat) {
      messages.push({ role: "system", content: BOSS_SYSTEM });
      messages.push({ role: "system", content: `BOSS FIGHT: ${combat.enemy.name} (${combat.enemy.emoji}). HP:${combat.enemyHp}/${combat.enemy.maxHp}. Abilities: ${combat.enemy.abilities?.join(", ") || "none"}. Phase: ${combat.phase || 1}.` });
    } else if (mode === "craft" && recipe) {
      messages.push({ role: "system", content: CRAFT_SYSTEM });
      messages.push({ role: "system", content: `Crafting: ${recipe.result} from ${recipe.ingredients.join(" + ")}.` });
    } else if (mode === "map") {
      messages.push({ role: "system", content: EXPLORE_SYSTEM });
      messages.push({ role: "system", content: `DUNGEON MAP: Player at room ${mapAction?.room || 1}. Room type: ${mapAction?.type || "empty"}. Floor: ${mapAction?.floor || 1}.` });
    } else {
      messages.push({ role: "system", content: EXPLORE_SYSTEM });
    }

    if (Array.isArray(history)) {
      for (const msg of history.slice(-12)) {
        messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
      }
    }

    if (character?.name) {
      const partyText = party?.length ? party.map((p: { name: string; class: string; hp: number }) => `${p.name}(${p.class},HP:${p.hp})`).join(", ") : "solo";
      messages.push({ role: "system", content: `Player: ${character.name} Lv.${character.level} ${character.class}. HP:${character.hp}/${character.maxHp}. ATK:${character.attack} DEF:${character.defense} MAG:${character.magic}. Items:${character.inventory?.length || 0}. ${partyText}.` });
    }

    messages.push({ role: "user", content: action || "I look around carefully." });

    if (DEMO_MODE) {
      let mockText = "";
      if (mode === "combat" && combat) mockText = mockCombatResponse(action, combat.enemy.name);
      else if (mode === "boss" && combat) mockText = mockBossResponse(combat.enemy.name, combat.enemy.abilities || [], combat.phase || 1);
      else if (mode === "craft" && recipe) mockText = mockCraftResponse(recipe.result, recipe.ingredients);
      else if (mode === "map") mockText = mockMapResponse(mapAction?.type || "empty");
      else {
        const pn = party?.length ? party.map((p: { name: string }) => p.name).join(" and ") : "you";
        mockText = mockExploreResponse(action, pn);
      }
      return NextResponse.json({ text: mockText, provider: "Demo", usage: { prompt_tokens: 0, completion_tokens: 0 } });
    }

    const maxTok = mode === "boss" ? 250 : mode === "craft" ? 100 : mode === "map" ? 150 : 300;
    const result = await callLLM(messages, maxTok);

    if (!result.text) {
      let mockText = "";
      if (mode === "combat" && combat) mockText = mockCombatResponse(action, combat.enemy.name);
      else if (mode === "boss" && combat) mockText = mockBossResponse(combat.enemy.name, combat.enemy.abilities || [], combat.phase || 1);
      else if (mode === "craft" && recipe) mockText = mockCraftResponse(recipe.result, recipe.ingredients);
      else if (mode === "map") mockText = mockMapResponse(mapAction?.type || "empty");
      else {
        const pn = party?.length ? party.map((p: { name: string }) => p.name).join(" and ") : "you";
        mockText = mockExploreResponse(action, pn);
      }
      return NextResponse.json({ text: mockText, provider: "Demo (fallback)", usage: { prompt_tokens: 0, completion_tokens: 0 } });
    }

    return NextResponse.json({ text: result.text, provider: result.provider, usage: { prompt_tokens: 0, completion_tokens: 0 } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function mockExploreResponse(action: string, partyNames: string): string {
  const responses = [
    `You and ${partyNames} press deeper into the dungeon. The walls narrow, and skittering sounds echo ahead. A fork in the path beckons.`,
    `As ${partyNames} moves forward, the temperature drops. Ancient carvings depict a great battle. The corridor splits.`,
    `${partyNames} enters a vast underground chamber. Stalactites hang like stone fangs. Three exits are visible.`,
    `The group discovers a hidden passage. ${partyNames} squeezes through into a treasure room — guarded!`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ── GET handler ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "encounter") {
    const level = parseInt(url.searchParams.get("level") || "1");
    let pool: typeof ENEMIES = ENEMIES.filter((e) => e.tier === "common");
    if (level >= 3) pool = [...pool, ...ENEMIES.filter((e) => e.tier === "rare")];
    if (level >= 5) pool = [...pool, ...ENEMIES.filter((e) => e.tier === "epic")];
    if (level >= 8) pool = [...pool, ...ENEMIES.filter((e) => e.tier === "legendary")];
    const enemy = pool[Math.floor(Math.random() * pool.length)];
    const scale = 1 + (level - 1) * 0.15;
    return NextResponse.json({
      enemy: { ...enemy, hp: Math.round(enemy.hp * scale), attack: Math.round(enemy.attack * scale), defense: Math.round(enemy.defense * scale), xp: Math.round(enemy.xp * scale) },
      message: `A wild **${enemy.name}** ${enemy.emoji} appears!`,
    });
  }

  if (action === "boss") {
    const floor = parseInt(url.searchParams.get("floor") || "1");
    const boss = BOSSES.find((b) => b.room <= floor * 5 && b.room > (floor - 1) * 5) || BOSSES[Math.min(floor - 1, BOSSES.length - 1)];
    const scale = 1 + (floor - 1) * 0.2;
    return NextResponse.json({
      boss: { ...boss, hp: Math.round(boss.hp * scale), attack: Math.round(boss.attack * scale), defense: Math.round(boss.defense * scale), maxHp: Math.round(boss.hp * scale) },
    });
  }

  if (action === "recipes") {
    return NextResponse.json({ recipes: RECIPES });
  }

  if (action === "map") {
    const floor = parseInt(url.searchParams.get("floor") || "1");
    const room = parseInt(url.searchParams.get("room") || "1");
    const width = 5;
    const height = 4;
    const rooms: { x: number; y: number; type: string; discovered: boolean; boss: boolean; cleared: boolean }[] = [];

    // Generate rooms for this floor
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        let type = "empty";
        // Entrance always at 0,0
        if (x === 0 && y === 0) type = "rest";
        // Boss at bottom-right
        else if (x === width - 1 && y === height - 1) type = "boss";
        // Guaranteed rooms
        else if (idx === 4) type = "craft";
        else if (idx === 7) type = "treasure";
        else if (idx === 12) type = "rest";
        // Random rooms
        else {
          const r = Math.random();
          if (r < 0.25) type = "combat";
          else if (r < 0.35) type = "treasure";
          else if (r < 0.42) type = "trap";
          else if (r < 0.50) type = "mystery";
          else if (r < 0.55) type = "shop";
          else type = "empty";
        }

        rooms.push({ x, y, type, discovered: idx <= room, boss: type === "boss", cleared: idx < room });
      }
    }

    return NextResponse.json({
      rooms,
      playerPos: { x: room % width, y: Math.floor(room / width) },
      floor,
      totalRooms: width * height,
      currentRoom: room,
    });
  }

  if (action === "companions") {
    const companions = [
      { name: "Lyra", class: "Healer", emoji: "✨", hp: 70, attack: 5, defense: 6, personality: "wise and compassionate" },
      { name: "Grim", class: "Berserker", emoji: "🔥", hp: 90, attack: 14, defense: 4, personality: "fierce and loyal" },
      { name: "Sage", class: "Mage", emoji: "🔮", hp: 50, attack: 3, defense: 3, personality: "mysterious and brilliant" },
      { name: "Raven", class: "Rogue", emoji: "🌑", hp: 60, attack: 10, defense: 5, personality: "cunning and sarcastic" },
      { name: "Iron", class: "Knight", emoji: "🛡️", hp: 100, attack: 8, defense: 15, personality: "noble and steadfast" },
    ];
    const shuffled = [...companions].sort(() => Math.random() - 0.5);
    return NextResponse.json({ companions: shuffled.slice(0, 2) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
