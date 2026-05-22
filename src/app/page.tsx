"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════
interface Message { role: "user" | "assistant"; content: string; timestamp: number; }
interface InventoryItem { name: string; type: string; power: number; emoji: string; rarity: string; equipped?: boolean; }
interface Character {
  name: string; class: string; level: number; hp: number; maxHp: number;
  attack: number; defense: number; magic: number; xp: number; xpNext: number;
  gold: number; inventory: InventoryItem[]; location: string;
}
interface Enemy {
  name: string; emoji: string; hp: number; maxHp: number; attack: number;
  defense: number; xp: number; tier: string; abilities?: string[];
}
interface CombatState {
  active: boolean; enemy: Enemy | null; enemyHp: number; playerDefending: boolean;
  combatLog: string[]; turnCount: number; partyHp: number[]; isBoss: boolean; phase: number;
}
interface PartyMember { name: string; class: string; emoji: string; hp: number; maxHp: number; attack: number; defense: number; personality: string; alive: boolean; }
interface LootDrop { name: string; type: string; power: number; emoji: string; rarity: string; }
interface Quest { id: string; title: string; description: string; status: string; reward: string; created: number; }
interface DungeonSession { id: string; name: string; character: Character; messages: Message[]; quests: Quest[]; party: PartyMember[]; map: MapState; created: number; updated: number; }
interface MapState { floor: number; room: number; rooms: MapRoom[]; discovered: number[]; }
interface MapRoom { x: number; y: number; type: string; discovered: boolean; boss: boolean; cleared: boolean; }
interface Recipe { result: string; type: string; power: number; emoji: string; rarity: string; ingredients: string[]; description: string; }

// ══════════════════════════════════════════════════════════════
// DEFAULTS
// ══════════════════════════════════════════════════════════════
const DEFAULT_CHARACTER: Character = {
  name: "Hero", class: "Warrior", level: 1, hp: 100, maxHp: 100,
  attack: 12, defense: 10, magic: 5, xp: 0, xpNext: 50, gold: 0,
  inventory: [
    { name: "Torch", type: "utility", power: 0, emoji: "🔥", rarity: "common" },
    { name: "Health Potion x3", type: "consumable", power: 25, emoji: "🧪", rarity: "common" },
    { name: "Rusty Sword", type: "weapon", power: 4, emoji: "🗡️", rarity: "common", equipped: true },
  ],
  location: "Dungeon Entrance",
};

const CLASSES = [
  { name: "Warrior", icon: "⚔️", stats: { attack: 12, defense: 10, magic: 5 }, hp: 100 },
  { name: "Mage", icon: "🔮", stats: { attack: 5, defense: 6, magic: 15 }, hp: 70 },
  { name: "Rogue", icon: "🗡️", stats: { attack: 10, defense: 7, magic: 8 }, hp: 80 },
  { name: "Paladin", icon: "🛡️", stats: { attack: 10, defense: 14, magic: 8 }, hp: 110 },
  { name: "Necromancer", icon: "💀", stats: { attack: 7, defense: 5, magic: 18 }, hp: 65 },
  { name: "Ranger", icon: "🏹", stats: { attack: 11, defense: 8, magic: 7 }, hp: 85 },
];

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  common: { bg: "bg-gray-600/30", text: "text-gray-300", border: "border-gray-500/50" },
  rare: { bg: "bg-blue-600/30", text: "text-blue-300", border: "border-blue-500/50" },
  epic: { bg: "bg-purple-600/30", text: "text-purple-300", border: "border-purple-500/50" },
  legendary: { bg: "bg-yellow-600/30", text: "text-yellow-300", border: "border-yellow-500/50" },
};

const ROOM_ICONS: Record<string, string> = {
  empty: "·", combat: "⚔️", treasure: "💎", rest: "🏕️", craft: "⚒️",
  boss: "💀", shop: "🏪", trap: "⚠️", mystery: "❓",
};

const ROOM_COLORS: Record<string, string> = {
  empty: "bg-gray-700", combat: "bg-red-900/50", treasure: "bg-yellow-900/50", rest: "bg-green-900/50",
  craft: "bg-orange-900/50", boss: "bg-red-800/70", shop: "bg-blue-900/50", trap: "bg-orange-900/50", mystery: "bg-purple-900/50",
};

const RECIPES: Recipe[] = [
  { result: "Fire Sword", type: "weapon", power: 12, emoji: "🔥", rarity: "rare", ingredients: ["Enchanted Blade", "Fire Scroll"], description: "A blade wreathed in eternal flame." },
  { result: "Mithril Plate", type: "armor", power: 14, emoji: "🛡️", rarity: "rare", ingredients: ["Mithril Armor", "Iron Shield"], description: "Lightweight yet incredibly strong." },
  { result: "Grand Health Potion", type: "consumable", power: 60, emoji: "🧪", rarity: "rare", ingredients: ["Health Potion", "Health Potion"], description: "Twice the healing power." },
  { result: "Dragonbane", type: "weapon", power: 20, emoji: "⚔️", rarity: "epic", ingredients: ["Dragonbone Sword", "Fire Sword"], description: "Forged to slay dragons." },
  { result: "Void Set", type: "armor", power: 18, emoji: "🌑", rarity: "epic", ingredients: ["Shadow Cloak", "Void Amulet"], description: "Armor from the space between worlds." },
  { result: "Godslayer", type: "weapon", power: 30, emoji: "⚡", rarity: "legendary", ingredients: ["Excalibur", "Dragonbane"], description: "A blade that can fell even gods." },
  { result: "Aegis Eternal", type: "armor", power: 28, emoji: "👑", rarity: "legendary", ingredients: ["Aegis of the Gods", "Phoenix Armor"], description: "The ultimate divine defense." },
];

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function parseMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <span key={i} className="text-yellow-400 font-bold">{part.slice(2, -2)}</span>;
    return <span key={i}>{part}</span>;
  });
}

function xpForLevel(level: number) { return Math.floor(50 * Math.pow(1.5, level - 1)); }

function rollLoot(tier: string): LootDrop {
  const tables: Record<string, LootDrop[]> = {
    common: [
      { name: "Health Potion", type: "consumable", power: 25, emoji: "🧪", rarity: "common" },
      { name: "Iron Shield", type: "armor", power: 3, emoji: "🛡️", rarity: "common" },
      { name: "Steel Dagger", type: "weapon", power: 4, emoji: "🗡️", rarity: "common" },
      { name: "Gold Coins", type: "currency", power: 10, emoji: "🪙", rarity: "common" },
    ],
    rare: [
      { name: "Enchanted Blade", type: "weapon", power: 8, emoji: "⚔️", rarity: "rare" },
      { name: "Mithril Armor", type: "armor", power: 7, emoji: "🛡️", rarity: "rare" },
      { name: "Mana Crystal", type: "consumable", power: 40, emoji: "💎", rarity: "rare" },
      { name: "Rare Gems", type: "currency", power: 50, emoji: "💎", rarity: "rare" },
    ],
    epic: [
      { name: "Dragonbone Sword", type: "weapon", power: 15, emoji: "⚔️", rarity: "epic" },
      { name: "Phoenix Shield", type: "armor", power: 12, emoji: "🛡️", rarity: "epic" },
      { name: "Elixir of Life", type: "consumable", power: 80, emoji: "🧪", rarity: "epic" },
    ],
    legendary: [
      { name: "Excalibur", type: "weapon", power: 25, emoji: "⚔️", rarity: "legendary" },
      { name: "Aegis of the Gods", type: "armor", power: 20, emoji: "🛡️", rarity: "legendary" },
      { name: "Phoenix Tear", type: "consumable", power: 150, emoji: "🧪", rarity: "legendary" },
    ],
  };
  const table = tables[tier] || tables.common;
  return table[Math.floor(Math.random() * table.length)];
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function DungeonMaster() {
  const [tab, setTab] = useState<"map" | "dungeon" | "combat" | "craft" | "party" | "character" | "inventory" | "quests" | "history" | "settings">("map");
  const [character, setCharacter] = useState<Character>(DEFAULT_CHARACTER);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [party, setParty] = useState<PartyMember[]>([]);
  const [combat, setCombat] = useState<CombatState>({
    active: false, enemy: null, enemyHp: 0, playerDefending: false,
    combatLog: [], turnCount: 0, partyHp: [], isBoss: false, phase: 1,
  });
  const [mapState, setMapState] = useState<MapState>({ floor: 1, room: 0, rooms: [], discovered: [0] });
  const [lootNotif, setLootNotif] = useState<LootDrop | null>(null);
  const [levelUpNotif, setLevelUpNotif] = useState(false);
  const [craftNotif, setCraftNotif] = useState<Recipe | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("Demo");
  const [sessions, setSessions] = useState<DungeonSession[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [encounterChance, setEncounterChance] = useState(30);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ── Load from localStorage ─────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dm_sessions");
      if (saved) setSessions(JSON.parse(saved));
      const savedChar = localStorage.getItem("dm_character");
      if (savedChar) setCharacter(JSON.parse(savedChar));
      const savedSession = localStorage.getItem("dm_current_session");
      if (savedSession) {
        const data = JSON.parse(savedSession);
        setSessionId(data.id); setMessages(data.messages || []);
        setCharacter(data.character || DEFAULT_CHARACTER); setQuests(data.quests || []);
        setParty(data.party || []); if (data.map) setMapState(data.map);
      }
    } catch {}
  }, []);

  // ── Save to localStorage ───────────────────────────────────
  useEffect(() => {
    if (sessionId) {
      const session: DungeonSession = {
        id: sessionId, name: character.name + " - " + character.class,
        character, messages, quests, party, map: mapState, created: Date.now(), updated: Date.now(),
      };
      localStorage.setItem("dm_current_session", JSON.stringify(session));
      setSessions((prev) => {
        const exists = prev.findIndex((s) => s.id === sessionId);
        const updated = exists >= 0 ? prev.map((s, i) => (i === exists ? session : s)) : [session, ...prev];
        const sliced = updated.slice(0, 20);
        localStorage.setItem("dm_sessions", JSON.stringify(sliced));
        return sliced;
      });
    }
  }, [messages, character, quests, party, mapState, sessionId]);

  useEffect(() => { localStorage.setItem("dm_character", JSON.stringify(character)); }, [character]);

  // Detect provider on mount
  useEffect(() => {
    fetch("/api/generate?action=status").then((r) => r.json()).then((d) => {
      if (d.provider) setProvider(d.provider);
    }).catch(() => {});
  }, []);

  const startNewSession = () => {
    setSessionId("dm_" + Date.now()); setMessages([]); setQuests([]); setParty([]);
    setCharacter(DEFAULT_CHARACTER);
    setCombat({ active: false, enemy: null, enemyHp: 0, playerDefending: false, combatLog: [], turnCount: 0, partyHp: [], isBoss: false, phase: 1 });
    setMapState({ floor: 1, room: 0, rooms: [], discovered: [0] });
    localStorage.removeItem("dm_current_session"); setTab("map");
  };

  const loadSession = (session: DungeonSession) => {
    setSessionId(session.id); setMessages(session.messages); setCharacter(session.character);
    setQuests(session.quests || []); setParty(session.party || []);
    if (session.map) setMapState(session.map);
    setCombat({ active: false, enemy: null, enemyHp: 0, playerDefending: false, combatLog: [], turnCount: 0, partyHp: [], isBoss: false, phase: 1 });
    setTab("map");
  };

  // ── Generate map ───────────────────────────────────────────
  const generateMap = async () => {
    try {
      const res = await fetch(`/api/generate?action=map&floor=${mapState.floor}&room=${mapState.room}`);
      const data = await res.json();
      if (data.rooms) {
        setMapState((prev) => ({ ...prev, rooms: data.rooms, playerPos: data.playerPos }));
      }
    } catch {}
  };

  useEffect(() => { generateMap(); }, [mapState.floor]); // eslint-disable-line

  // ── Move on map ────────────────────────────────────────────
  const moveOnMap = (newRoom: number) => {
    if (newRoom < 0 || newRoom >= 20) return;
    const room = mapState.rooms[newRoom];
    if (!room) return;

    setMapState((prev) => ({
      ...prev, room: newRoom,
      discovered: Array.from(new Set([...prev.discovered, newRoom])),
    }));

    // Room actions
    if (room.type === "combat") {
      setTab("combat");
      triggerEncounter();
    } else if (room.type === "boss") {
      setTab("combat");
      triggerBoss();
    } else if (room.type === "craft") {
      setTab("craft");
      setMessages((prev) => [...prev, {
        role: "assistant", content: "You find an ancient forge! The flames still burn with magical energy. You can craft powerful items here.",
        timestamp: Date.now(),
      }]);
    } else if (room.type === "treasure") {
      const loot = rollLoot(["common", "rare", "epic"][Math.floor(Math.random() * 3)]);
      setLootNotif(loot);
      setCharacter((prev) => ({ ...prev, inventory: [...prev.inventory, { ...loot, equipped: false }] }));
    } else if (room.type === "rest") {
      setCharacter((prev) => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + 30) }));
      setMessages((prev) => [...prev, {
        role: "assistant", content: "You rest at a safe campfire. The warmth restores your strength. +30 HP!",
        timestamp: Date.now(),
      }]);
    } else if (room.type === "trap") {
      const dmg = 10 + Math.floor(Math.random() * 15);
      setCharacter((prev) => ({ ...prev, hp: Math.max(1, prev.hp - dmg) }));
      setMessages((prev) => [...prev, {
        role: "assistant", content: "You trigger a trap! Poison darts shoot from the walls! -" + dmg + " HP!",
        timestamp: Date.now(),
      }]);
    } else if (room.type === "shop") {
      setMessages((prev) => [...prev, {
        role: "assistant" as const,
        content: "A mysterious merchant appears! Welcome, adventurer! You have " + character.gold + " gold.",
        timestamp: Date.now(),
      }]);
    } else {
      setTab("dungeon");
    }
  };

  // ── Encounter enemies ──────────────────────────────────────
  const triggerEncounter = async () => {
    try {
      const res = await fetch("/api/generate?action=encounter&level=" + character.level);
      const data = await res.json();
      if (data.enemy) {
        const partyHp = party.filter((p) => p.alive).map((p) => p.hp);
        setCombat({ active: true, enemy: data.enemy, enemyHp: data.enemy.hp, playerDefending: false, combatLog: [data.message], turnCount: 1, partyHp, isBoss: false, phase: 1 });
        setMessages((prev) => [...prev, { role: "assistant", content: data.message, timestamp: Date.now() }]);
      }
    } catch {}
  };

  const triggerBoss = async () => {
    try {
      const res = await fetch("/api/generate?action=boss&floor=" + mapState.floor);
      const data = await res.json();
      if (data.boss) {
        const boss = { ...data.boss, maxHp: data.boss.hp };
        const partyHp = party.filter((p) => p.alive).map((p) => p.hp);
        const msg = "The ground shakes! **" + boss.name + "** " + boss.emoji + " emerges!\n\n*" + boss.lore + "*";
        setCombat({ active: true, enemy: boss, enemyHp: boss.hp, playerDefending: false, combatLog: [msg], turnCount: 1, partyHp, isBoss: true, phase: 1 });
        setMessages((prev) => [...prev, { role: "assistant", content: msg, timestamp: Date.now() }]);
      }
    } catch {}
  };

  // ── Combat actions ─────────────────────────────────────────
  const combatAction = async (action: string) => {
    if (!combat.enemy || loading) return;
    let newPlayerHp = character.hp;
    let newEnemyHp = combat.enemyHp;
    const newPartyHp = [...combat.partyHp];
    let playerDefending = false;
    const log: string[] = [];

    if (action === "attack") {
      const isCrit = Math.random() > 0.8;
      const baseDmg = Math.max(1, character.attack - combat.enemy.defense + Math.floor(Math.random() * 5));
      const dmg = isCrit ? baseDmg * 2 : baseDmg;
      newEnemyHp -= dmg;
      log.push((isCrit ? "💥 CRITICAL! " : "⚔️ ") + "You deal **" + dmg + " damage** to " + combat.enemy.name + "!");
      party.filter((p) => p.alive).forEach((p) => {
        const pDmg = Math.max(1, p.attack - (combat.enemy?.defense || 0) + Math.floor(Math.random() * 3));
        newEnemyHp -= pDmg;
        log.push("🎭 " + p.name + " deals **" + pDmg + " damage**!");
      });
    } else if (action === "potion") {
      const heal = 25;
      newPlayerHp = Math.min(character.maxHp, newPlayerHp + heal);
      log.push("🧪 You use a Health Potion! +" + heal + " HP!");
    } else if (action === "defend") {
      playerDefending = true;
      log.push("🛡️ You raise your guard! Damage reduced by 60%!");
    } else if (action === "special") {
      const spDmg = Math.floor(character.magic * 2.5);
      newEnemyHp -= spDmg;
      log.push("✨ You channel all your magic into a devastating spell! **" + spDmg + " damage**!");
    } else if (action === "flee") {
      if (combat.isBoss) {
        log.push("🏃 You cannot flee from a BOSS fight!");
      } else if (Math.random() > 0.4) {
        log.push("🏃 You flee from battle!");
        setCombat({ active: false, enemy: null, enemyHp: 0, playerDefending: false, combatLog: [], turnCount: 0, partyHp: [], isBoss: false, phase: 1 });
        setCharacter((prev) => ({ ...prev, hp: newPlayerHp }));
        setMessages((prev) => [...prev, { role: "assistant", content: log.join("\n"), timestamp: Date.now() }]);
        return;
      } else {
        log.push("🏃 You try to flee but the " + (combat.enemy?.name || "enemy") + " blocks your escape!");
      }
    }

    // Check if enemy dead
    if (newEnemyHp <= 0) {
      const xpGain = combat.enemy.xp;
      const goldGain = Math.floor(Math.random() * combat.enemy.xp) + 5;
      log.push("\n🎉 **VICTORY!** Defeated " + combat.enemy.emoji + " **" + combat.enemy.name + "**!");
      log.push("+" + xpGain + " XP  |  +" + goldGain + " Gold");

      // Loot
      const loot = rollLoot(combat.enemy.tier);
      log.push("\n**Loot:** " + loot.emoji + " **" + loot.name + "** (" + loot.rarity + ")");

      // Boss bonus loot
      if (combat.isBoss) {
        const bonusLoot = rollLoot("legendary");
        log.push("\n🏆 **BOSS BONUS:** " + bonusLoot.emoji + " **" + bonusLoot.name + "**!");
        setLootNotif(bonusLoot);
        setCharacter((prev) => ({ ...prev, inventory: [...prev.inventory, { ...bonusLoot, equipped: false }] }));
      } else {
        setLootNotif(loot);
      }

      setCombat({ active: false, enemy: null, enemyHp: 0, playerDefending: false, combatLog: [], turnCount: 0, partyHp: [], isBoss: false, phase: 1 });
      setMessages((prev) => [...prev, { role: "assistant", content: log.join("\n"), timestamp: Date.now() }]);

      setCharacter((prev) => {
        const newInv = [...prev.inventory, { ...loot, equipped: false }];
        const newXp = prev.xp + xpGain;
        const newGold = prev.gold + goldGain;
        let newLevel = prev.level; let newXpNext = prev.xpNext; let newMaxHp = prev.maxHp;
        if (newXp >= prev.xpNext) { newLevel++; newXpNext = xpForLevel(newLevel); newMaxHp += 10; setLevelUpNotif(true); setTimeout(() => setLevelUpNotif(false), 3000); }
        return { ...prev, hp: prev.hp, xp: newXp, xpNext: newXpNext, gold: newGold, level: newLevel, maxHp: newMaxHp, inventory: newInv };
      });
      return;
    }

    // Boss phase check
    if (combat.isBoss && newEnemyHp < combat.enemy.maxHp * 0.5 && combat.phase === 1) {
      log.push("\n🔥 **PHASE 2!** " + combat.enemy.name + " powers up! Its abilities grow stronger!");
      setCombat((prev) => ({ ...prev, phase: 2 }));
    }

    // Enemy turn
    const baseEnemyDmg = Math.max(1, (combat.enemy?.attack || 0) - character.defense + Math.floor(Math.random() * 4));
    const enemyDmg = combat.isBoss && combat.phase === 2 ? Math.floor(baseEnemyDmg * 1.3) : baseEnemyDmg;
    const actualDmg = playerDefending ? Math.floor(enemyDmg * 0.4) : enemyDmg;
    newPlayerHp -= actualDmg;

    if (combat.isBoss && combat.enemy.abilities && Math.random() > 0.5) {
      const ability = combat.enemy.abilities[Math.floor(Math.random() * combat.enemy.abilities.length)];
      log.push("\n💀 " + combat.enemy.name + " uses **" + ability + "**!");
    }
    log.push(combat.enemy.emoji + " " + combat.enemy.name + " attacks for **" + actualDmg + " damage**!" + (playerDefending ? " (blocked!)" : ""));

    // Enemy attacks party
    if (party.filter((p) => p.alive).length > 0) {
      const tIdx = Math.floor(Math.random() * newPartyHp.length);
      if (newPartyHp[tIdx] > 0) {
        const pDmg = Math.max(1, Math.floor((combat.enemy?.attack || 0) * 0.5) - 3);
        newPartyHp[tIdx] -= pDmg;
        if (newPartyHp[tIdx] <= 0) log.push("💀 " + party[tIdx].name + " has fallen!");
        else log.push("💔 " + party[tIdx].name + " takes **" + pDmg + " damage** (HP:" + newPartyHp[tIdx] + ")");
      }
    }

    // Player death
    if (newPlayerHp <= 0) {
      log.push("\n💀 **DEFEATED...** The darkness consumes you.");
      setCombat({ active: false, enemy: null, enemyHp: 0, playerDefending: false, combatLog: [], turnCount: 0, partyHp: [], isBoss: false, phase: 1 });
      setCharacter((prev) => ({ ...prev, hp: Math.floor(prev.maxHp * 0.3), location: "Dungeon Entrance" }));
      setMessages((prev) => [...prev, { role: "assistant", content: log.join("\n"), timestamp: Date.now() }]);
      return;
    }

    setCombat((prev) => ({ ...prev, enemyHp: newEnemyHp, playerDefending, combatLog: [...prev.combatLog, ...log], turnCount: prev.turnCount + 1, partyHp: newPartyHp }));
    setCharacter((prev) => ({ ...prev, hp: newPlayerHp }));
    setMessages((prev) => [...prev, { role: "assistant", content: log.join("\n"), timestamp: Date.now() }]);
  };

  // ── Crafting ───────────────────────────────────────────────
  const craftItem = async (recipe: Recipe) => {
    // Check if player has ingredients
    const hasAll = recipe.ingredients.every((ing) => character.inventory.some((item) => item.name === ing || item.name.startsWith(ing)));
    if (!hasAll) {
      setMessages((prev) => [...prev, { role: "assistant", content: "You don't have the required ingredients for **" + recipe.result + "**!\n\nNeeded: " + recipe.ingredients.join(", "), timestamp: Date.now() }]);
      return;
    }

    // Remove ingredients
    const newInv = [...character.inventory];
    for (const ing of recipe.ingredients) {
      const idx = newInv.findIndex((item) => item.name === ing || item.name.startsWith(ing));
      if (idx >= 0) newInv.splice(idx, 1);
    }

    // Add crafted item
    const crafted: InventoryItem = { name: recipe.result, type: recipe.type, power: recipe.power, emoji: recipe.emoji, rarity: recipe.rarity, equipped: false };
    newInv.push(crafted);

    setCharacter((prev) => ({ ...prev, inventory: newInv }));
    setCraftNotif(recipe);
    setTimeout(() => setCraftNotif(null), 3000);

    // AI narration
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "Craft " + recipe.result, mode: "craft", recipe, character }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.text || "You successfully craft the **" + recipe.result + "**!", timestamp: Date.now() }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "You successfully craft the **" + recipe.result + "**! A masterwork!", timestamp: Date.now() }]);
    }
  };

  // ── Recruit companion ──────────────────────────────────────
  const recruitCompanion = async () => {
    try {
      const res = await fetch("/api/generate?action=companions");
      const data = await res.json();
      if (data.companions) {
        const available = data.companions.filter((c: PartyMember) => !party.find((p) => p.name === c.name));
        if (available.length > 0) {
          const newMember = { ...available[0], alive: true, hp: available[0].maxHp };
          setParty((prev) => [...prev, newMember]);
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: "🎭 **" + newMember.name + "** the " + newMember.class + " joins your party!\n\nParty size: " + (party.length + 1) + "/4",
            timestamp: Date.now(),
          }]);
        }
      }
    } catch {}
  };

  // ── Send explore action ────────────────────────────────────
  const sendAction = async () => {
    if (!input.trim() || loading) return;
    const action = input.trim(); setInput("");
    const userMsg: Message = { role: "user", content: action, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]); setLoading(true);
    if (!sessionId) setSessionId("dm_" + Date.now());
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, history: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })), character, party, mode: "explore" }),
      });
      const data = await res.json();
      if (data.text) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.text, timestamp: Date.now() }]);
        if (data.provider) setProvider(data.provider);
        if (Math.random() * 100 < encounterChance && !combat.active) setTimeout(() => triggerEncounter(), 800);
        setEncounterChance((prev) => Math.min(60, prev + 5));
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Connection lost.", timestamp: Date.now() }]);
    } finally { setLoading(false); inputRef.current?.focus(); }
  };

  const handleChoice = (choice: string) => {
    setInput(choice);
    setTimeout(() => {
      if (choice.trim() && !loading) {
        const action = choice.trim();
        const userMsg: Message = { role: "user", content: action, timestamp: Date.now() };
        setMessages((prev) => [...prev, userMsg]); setLoading(true);
        if (!sessionId) setSessionId("dm_" + Date.now());
        fetch("/api/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, history: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })), character, party, mode: "explore" }),
        }).then((r) => r.json()).then((data) => {
          if (data.text) { setMessages((prev) => [...prev, { role: "assistant", content: data.text, timestamp: Date.now() }]); if (data.provider) setProvider(data.provider); }
        }).catch(() => {}).finally(() => setLoading(false));
      }
    }, 100);
  };

  // ── Tabs config ──────────────────────────────────────────
  const tabs = [
    { id: "map" as const, label: "🗺️ Map" },
    { id: "dungeon" as const, label: "🗡️ Dungeon" },
    { id: "combat" as const, label: "⚔️ Combat" },
    { id: "craft" as const, label: "⚒️ Craft" },
    { id: "party" as const, label: "🎭 Party" },
    { id: "character" as const, label: "📊 Stats" },
    { id: "inventory" as const, label: "🎒 Inventory" },
    { id: "history" as const, label: "💾 History" },
    { id: "settings" as const, label: "⚙️ Settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Notifications */}
      {lootNotif && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setLootNotif(null)}>
          <div className={"p-8 rounded-2xl border-2 " + (TIER_COLORS[lootNotif.rarity]?.border || "border-gray-500") + " " + (TIER_COLORS[lootNotif.rarity]?.bg || "bg-gray-800") + " max-w-sm w-full mx-4 text-center animate-bounce"} onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-3">{lootNotif.emoji}</div>
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">{lootNotif.rarity} drop!</div>
            <div className={"text-xl font-bold " + (TIER_COLORS[lootNotif.rarity]?.text || "text-white")}>{lootNotif.name}</div>
            <div className="text-sm text-gray-400 mt-1">{lootNotif.type} • +{lootNotif.power} power</div>
            <button onClick={() => setLootNotif(null)} className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Collect</button>
          </div>
        </div>
      )}
      {levelUpNotif && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] bg-yellow-600/90 border border-yellow-400 rounded-xl px-6 py-3 text-center animate-bounce">
          <div className="text-2xl mb-1">🎉</div>
          <div className="font-bold text-yellow-100">LEVEL UP! Level {character.level}</div>
          <div className="text-xs text-yellow-200">+10 Max HP • Full Heal</div>
        </div>
      )}
      {craftNotif && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] bg-orange-600/90 border border-orange-400 rounded-xl px-6 py-3 text-center animate-bounce">
          <div className="text-2xl mb-1">⚒️</div>
          <div className="font-bold text-orange-100">CRAFTED: {craftNotif.result}</div>
          <div className="text-xs text-orange-200">{craftNotif.rarity} • +{craftNotif.power} power</div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-900/80 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎲</span>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">QuestFi AI</h1>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className={"w-2 h-2 rounded-full " + (provider === "Demo" ? "bg-gray-500" : "bg-green-500")} />{provider}</span>
                <span className="text-yellow-500">Lv.{character.level}</span>
                <span className="text-red-400">HP:{character.hp}/{character.maxHp}</span>
                <span className="text-yellow-400">🪙{character.gold}</span>
                <span className="text-cyan-400">F{mapState.floor}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {party.length > 0 && <div className="flex -space-x-2">{party.slice(0, 3).map((p, i) => <div key={i} className={"w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs " + (p.alive ? "bg-gray-700 border-gray-600" : "bg-red-900 border-red-700")}>{p.name[0]}</div>)}</div>}
            <button onClick={startNewSession} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium">+ New</button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-2 flex gap-0.5 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={"px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all " + (tab === t.id ? "text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/5" : "text-gray-500 hover:text-gray-300 border-b-2 border-transparent")}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* ═══════ MAP TAB ═══════════════════════════════════ */}
        {tab === "map" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-yellow-400">🗺️ Dungeon Map — Floor {mapState.floor}</h2>
              <div className="flex gap-2">
                <button onClick={() => { setMapState((p) => ({ ...p, floor: Math.max(1, p.floor - 1), room: 0 })); }} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs">↑ Floor Up</button>
                <button onClick={() => { setMapState((p) => ({ ...p, floor: p.floor + 1, room: 0 })); }} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs">↓ Floor Down</button>
              </div>
            </div>

            {/* Map Grid */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
                {mapState.rooms.map((room, i) => {
                  const isPlayer = mapState.room === i;
                  const isDiscovered = mapState.discovered.includes(i);
                  return (
                    <button key={i} onClick={() => { if (isDiscovered && i !== mapState.room) moveOnMap(i); }}
                      className={"aspect-square rounded-xl flex flex-col items-center justify-center border text-xs transition-all " +
                        (isPlayer ? "bg-yellow-600/40 border-yellow-500 ring-2 ring-yellow-500/50 scale-110" :
                         isDiscovered ? ROOM_COLORS[room.type] + " border-gray-600 hover:border-gray-500 hover:scale-105" :
                         "bg-gray-800/30 border-gray-700/30 opacity-30")}>
                      <span className="text-lg">{isPlayer ? "🧑" : isDiscovered ? ROOM_ICONS[room.type] : "❓"}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{isPlayer ? "You" : isDiscovered ? room.type : ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Legend */}
            <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4">
              <div className="text-xs font-bold text-yellow-500 mb-2">Room Types</div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                <span>⚔️ Combat</span><span>💎 Treasure</span><span>🏕️ Rest (+30 HP)</span>
                <span>⚒️ Craft</span><span>💀 Boss</span><span>🏪 Shop</span>
                <span>⚠️ Trap</span><span>❓ Mystery</span>
              </div>
            </div>

            {/* Movement buttons */}
            <div className="flex justify-center gap-2">
              <button onClick={() => moveOnMap(mapState.room - 1)} disabled={mapState.room <= 0}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded-lg text-sm">← Back</button>
              <button onClick={() => moveOnMap(mapState.room + 1)} disabled={mapState.room >= 19}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-30 rounded-lg text-sm font-bold">→ Advance</button>
            </div>
          </div>
        )}

        {/* ═══════ DUNGEON TAB ══════════════════════════════ */}
        {tab === "dungeon" && (
          <div className="space-y-4">
            <div className="space-y-4 min-h-[60vh]">
              {messages.map((msg, i) => (
                <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={"max-w-[85%] rounded-2xl px-5 py-3 " + (msg.role === "user" ? "bg-blue-600/30 border border-blue-500/30 text-blue-100" : "bg-gray-800/80 border border-gray-700/50 text-gray-200")}>
                    {msg.role === "assistant" && <div className="text-xs text-yellow-500/70 mb-1 font-medium">🎲 Dungeon Master</div>}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{parseMarkdown(msg.content)}</div>
                    {msg.role === "assistant" && i === messages.length - 1 && !loading && !combat.active && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.content.match(/\d+\.\s+(.+)$/gm)?.map((choice, ci) => {
                          const text = choice.replace(/^\d+\.\s+/, "");
                          return <button key={ci} onClick={() => handleChoice(text)} className="px-3 py-1.5 bg-gray-700/50 hover:bg-yellow-600/30 border border-gray-600/50 hover:border-yellow-500/50 rounded-lg text-xs text-gray-300 hover:text-yellow-300 transition-all">{text}</button>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl px-5 py-3"><div className="text-xs text-yellow-500/70 mb-1">🎲 Dungeon Master</div><div className="flex items-center gap-1.5 text-sm text-gray-500"><span className="animate-pulse">⚔️</span><span>Thinking...</span></div></div></div>}
              <div ref={messagesEndRef} />
            </div>
            <div className="sticky bottom-0 bg-gray-950/90 backdrop-blur-sm py-4 border-t border-gray-800/50">
              <form onSubmit={(e) => { e.preventDefault(); sendAction(); }} className="flex gap-2">
                <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="What do you do?..." disabled={loading}
                  className="flex-1 bg-gray-800/80 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 disabled:opacity-50" />
                <button type="submit" disabled={loading || !input.trim()} className="px-5 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 rounded-xl text-sm font-bold">⚔️</button>
              </form>
            </div>
          </div>
        )}

        {/* ═══════ COMBAT TAB ═══════════════════════════════ */}
        {tab === "combat" && (
          <div className="space-y-4">
            {combat.active && combat.enemy ? (
              <>
                {/* Enemy card */}
                <div className={"p-6 rounded-2xl border-2 " + (combat.isBoss ? "border-red-500 bg-red-900/20" : (TIER_COLORS[combat.enemy.tier]?.border || "border-gray-600") + " " + (TIER_COLORS[combat.enemy.tier]?.bg || "bg-gray-800/50"))}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={"text-4xl " + (combat.isBoss ? "animate-pulse" : "")}>{combat.enemy.emoji}</span>
                      <div>
                        <div className={"font-bold text-lg " + (combat.isBoss ? "text-red-400" : (TIER_COLORS[combat.enemy.tier]?.text || "text-white"))}>{combat.enemy.name}</div>
                        <div className="text-xs text-gray-400">{combat.isBoss ? "⚠️ BOSS" : combat.enemy.tier + " enemy"} {combat.isBoss && combat.phase > 1 ? "• PHASE 2" : ""}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Turn {combat.turnCount}</div>
                      <div className="text-xs text-yellow-500">+{combat.enemy.xp} XP</div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">HP</span><span className="text-white font-mono">{combat.enemyHp}/{combat.enemy.maxHp}</span></div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div className={"h-full rounded-full transition-all " + (combat.isBoss ? "bg-red-600" : "bg-red-500")} style={{ width: Math.max(0, (combat.enemyHp / combat.enemy.maxHp) * 100) + "%" }} />
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>⚔️ ATK: {combat.enemy.attack}</span><span>🛡️ DEF: {combat.enemy.defense}</span>
                    {combat.enemy.abilities && <span>✨ Abilities: {combat.enemy.abilities.join(", ")}</span>}
                  </div>
                </div>

                {/* Player + Party HP */}
                <div className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl">
                  <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">❤️ Your HP</span><span className="text-white font-mono">{character.hp}/{character.maxHp}</span></div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: (character.hp / character.maxHp * 100) + "%" }} /></div>
                  {party.filter((p) => p.alive).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {party.filter((p) => p.alive).map((p, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-400">{p.name}</span><span className="text-white font-mono">{combat.partyHp[i] || p.hp}/{p.maxHp}</span></div>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: (((combat.partyHp[i] || p.hp) / p.maxHp) * 100) + "%" }} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Combat actions */}
                <div className={"grid gap-2 " + (combat.isBoss ? "grid-cols-2" : "grid-cols-4")}>
                  <button onClick={() => combatAction("attack")} className="p-3 bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 rounded-xl text-center transition-all">
                    <div className="text-2xl mb-1">⚔️</div><div className="text-xs font-medium">Attack</div>
                  </button>
                  <button onClick={() => combatAction("potion")} className="p-3 bg-green-600/30 hover:bg-green-600/50 border border-green-500/30 rounded-xl text-center transition-all">
                    <div className="text-2xl mb-1">🧪</div><div className="text-xs font-medium">Potion</div>
                  </button>
                  <button onClick={() => combatAction("defend")} className="p-3 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 rounded-xl text-center transition-all">
                    <div className="text-2xl mb-1">🛡️</div><div className="text-xs font-medium">Defend</div>
                  </button>
                  <button onClick={() => combatAction("flee")} className="p-3 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/30 rounded-xl text-center transition-all">
                    <div className="text-2xl mb-1">🏃</div><div className="text-xs font-medium">Flee</div>
                  </button>
                  {combat.isBoss && (
                    <button onClick={() => combatAction("special")} className="col-span-2 p-3 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded-xl text-center transition-all">
                      <div className="text-2xl mb-1">✨</div><div className="text-xs font-medium">Magic Blast (x{character.magic})</div>
                    </button>
                  )}
                </div>

                {/* Combat log */}
                <div className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl max-h-48 overflow-y-auto">
                  <div className="text-xs font-bold text-yellow-500 mb-2">Combat Log</div>
                  {combat.combatLog.map((log, i) => <div key={i} className="text-xs text-gray-300 mb-1 whitespace-pre-wrap">{parseMarkdown(log)}</div>)}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">⚔️</div>
                <h2 className="text-xl font-bold text-gray-300 mb-2">No Active Combat</h2>
                <p className="text-sm text-gray-500 mb-6">Explore the dungeon map to find enemies!</p>
                <div className="flex justify-center gap-3">
                  <button onClick={triggerEncounter} className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-medium">🎲 Random Enemy</button>
                  <button onClick={triggerBoss} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium">💀 Boss Fight</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════ CRAFT TAB ════════════════════════════════ */}
        {tab === "craft" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-yellow-400">⚒️ Crafting Forge</h2>
            <p className="text-sm text-gray-500">Combine items to forge powerful gear. Visit a ⚒️ Craft room on the map to craft!</p>

            {RECIPES.map((recipe, i) => {
              const hasAll = recipe.ingredients.every((ing) => character.inventory.some((item) => item.name === ing || item.name.startsWith(ing)));
              const tc = TIER_COLORS[recipe.rarity] || TIER_COLORS.common;
              return (
                <div key={i} className={"p-4 rounded-xl border " + tc.border + " " + tc.bg + (hasAll ? "" : " opacity-50")}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{recipe.emoji}</span>
                      <div>
                        <div className={"font-bold " + tc.text}>{recipe.result}</div>
                        <div className="text-xs text-gray-400">{recipe.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={"text-xs px-2 py-0.5 rounded-full " + tc.bg + " " + tc.text + " capitalize"}>{recipe.rarity}</span>
                      <div className="text-xs text-gray-500 mt-1">+{recipe.power} power</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      Ingredients: {recipe.ingredients.map((ing, j) => {
                        const has = character.inventory.some((item) => item.name === ing || item.name.startsWith(ing));
                        return <span key={j} className={has ? "text-green-400" : "text-red-400"}>{has ? "✓" : "✗"} {ing}{j < recipe.ingredients.length - 1 ? " + " : ""}</span>;
                      })}
                    </div>
                    <button onClick={() => craftItem(recipe)} disabled={!hasAll}
                      className={"px-4 py-1.5 rounded-lg text-xs font-medium transition-all " + (hasAll ? "bg-orange-600 hover:bg-orange-500 text-white" : "bg-gray-700 text-gray-500 cursor-not-allowed")}>
                      {hasAll ? "⚒️ Craft" : "Missing Items"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════ PARTY TAB ════════════════════════════════ */}
        {tab === "party" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-yellow-400">🎭 Party ({party.length}/4)</h2>
              {party.length < 4 && <button onClick={recruitCompanion} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium">+ Recruit</button>}
            </div>
            <div className="p-4 bg-gray-800/50 border border-yellow-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-600/30 rounded-xl flex items-center justify-center text-2xl">👑</div>
                <div className="flex-1"><div className="font-bold text-yellow-400">{character.name} <span className="text-xs text-gray-500">(Leader)</span></div><div className="text-xs text-gray-400">Level {character.level} {character.class}</div></div>
                <div className="text-right text-xs text-gray-400"><div>HP: {character.hp}/{character.maxHp}</div><div>ATK: {character.attack} DEF: {character.defense}</div></div>
              </div>
            </div>
            {party.length === 0 ? <div className="text-center py-12 text-gray-600"><div className="text-4xl mb-3">🎭</div><p>No companions yet.</p></div> :
              party.map((m, i) => (
                <div key={i} className={"p-4 rounded-xl border " + (m.alive ? "bg-gray-800/50 border-gray-700/50" : "bg-red-900/20 border-red-700/30 opacity-50")}>
                  <div className="flex items-center gap-3">
                    <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-2xl " + (m.alive ? "bg-purple-600/30" : "bg-red-900/30")}>{m.emoji}</div>
                    <div className="flex-1"><div className="font-bold">{m.name} <span className="text-xs text-gray-500">({m.class})</span></div><div className="text-xs text-gray-400 italic">&quot;{m.personality}&quot;</div></div>
                    <div className="text-right text-xs text-gray-400"><div>HP: {m.hp}/{m.maxHp}</div><div>ATK: {m.attack} DEF: {m.defense}</div></div>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden"><div className={"h-full rounded-full transition-all " + (m.alive ? "bg-purple-500" : "bg-red-500")} style={{ width: (m.hp / m.maxHp * 100) + "%" }} /></div>
                </div>
              ))
            }
          </div>
        )}

        {/* ═══════ CHARACTER TAB ═════════════════════════════ */}
        {tab === "character" && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-yellow-400 mb-4">Character</h2>
              <div className="space-y-4">
                <div><label className="block text-xs text-gray-500 mb-1">Name</label><input type="text" value={character.name} onChange={(e) => setCharacter({ ...character, name: e.target.value })} className="w-full bg-gray-900/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50" /></div>
                <div><label className="block text-xs text-gray-500 mb-2">Class</label>
                  <div className="grid grid-cols-3 gap-2">{CLASSES.map((c) => (
                    <button key={c.name} onClick={() => setCharacter({ ...character, class: c.name, attack: c.stats.attack, defense: c.stats.defense, magic: c.stats.magic, maxHp: c.hp, hp: c.hp })}
                      className={"p-3 rounded-xl border text-sm " + (character.class === c.name ? "bg-yellow-600/20 border-yellow-500/50 text-yellow-300" : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600")}>
                      <div className="text-lg mb-1">{c.icon}</div><div>{c.name}</div>
                    </button>
                  ))}</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-yellow-400 mb-4">Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <StatBar label="❤️ HP" value={character.hp} max={character.maxHp} color="red" />
                <StatBar label="⚔️ ATK" value={character.attack} max={25} color="orange" />
                <StatBar label="🛡️ DEF" value={character.defense} max={25} color="blue" />
                <StatBar label="🔮 MAG" value={character.magic} max={25} color="purple" />
                <StatBar label="⭐ XP" value={character.xp} max={character.xpNext} color="green" />
                <StatBar label="🪙 Gold" value={character.gold} max={500} color="yellow" />
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
                <span>Level: <span className="text-white font-bold">{character.level}</span></span>
                <span>Next: <span className="text-green-400">{character.xp}/{character.xpNext} XP</span></span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ INVENTORY TAB ════════════════════════════ */}
        {tab === "inventory" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-yellow-400">🎒 Inventory ({character.inventory.length})</h2>
            {character.inventory.length === 0 ? <div className="text-center py-12 text-gray-600"><div className="text-4xl mb-3">🎒</div><p>Empty.</p></div> :
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {character.inventory.map((item, i) => {
                  const tc = TIER_COLORS[item.rarity] || TIER_COLORS.common;
                  return <div key={i} className={"flex items-center gap-3 p-3 rounded-xl border " + tc.border + " " + tc.bg}>
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex-1"><div className={"font-medium text-sm " + tc.text}>{item.name}</div><div className="text-xs text-gray-400">{item.type} • +{item.power} power</div></div>
                    <span className={"text-xs px-2 py-0.5 rounded-full " + tc.bg + " " + tc.text + " capitalize"}>{item.rarity}</span>
                  </div>;
                })}
              </div>
            }
          </div>
        )}

        {/* ═══════ HISTORY TAB ══════════════════════════════ */}
        {tab === "history" && (
          <div className="space-y-4">
            {sessions.length === 0 ? <div className="text-center py-16 text-gray-600"><div className="text-4xl mb-3">💾</div><p>No sessions.</p></div> :
              sessions.map((s) => (
                <button key={s.id} onClick={() => loadSession(s)}
                  className={"w-full text-left p-4 rounded-xl border transition-all " + (s.id === sessionId ? "bg-yellow-600/10 border-yellow-500/30" : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600")}>
                  <div className="flex items-center justify-between">
                    <div><h3 className="font-bold text-sm">{s.name}</h3><p className="text-xs text-gray-500">{s.messages.length} msgs • Lv.{s.character.level} • Floor {s.map?.floor || 1}</p></div>
                    <span className="text-xs text-gray-600">{new Date(s.updated).toLocaleDateString()}</span>
                  </div>
                </button>
              ))
            }
          </div>
        )}

        {/* ═══════ SETTINGS TAB ═════════════════════════════ */}
        {tab === "settings" && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-yellow-400 mb-2">🔑 API Keys</h2>
              <div className="space-y-4">
                <div><label className="block text-xs text-gray-400 mb-1">Groq API Key <span className="text-green-500">(Free)</span></label><input type="password" placeholder="gsk_..." className="w-full bg-gray-900/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500/50" /></div>
                <div><label className="block text-xs text-gray-400 mb-1">MiMo API Key <span className="text-blue-500">(Fallback)</span></label><input type="password" placeholder="mimo_..." className="w-full bg-gray-900/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50" /></div>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-yellow-400 mb-2">🎮 Combat</h2>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Encounter Chance: {encounterChance}%</label>
                <input type="range" min="0" max="80" value={encounterChance} onChange={(e) => setEncounterChance(parseInt(e.target.value))} className="w-full accent-yellow-500" />
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-yellow-400 mb-2">ℹ️ About</h2>
              <div className="text-sm text-gray-400 space-y-2">
                <p><strong className="text-gray-300">QuestFi AI v3.0</strong> — Map, Crafting & Boss Fights</p>
                <p>🗺️ Dungeon map • ⚒️ Crafting system • 💀 Boss fights with phases • ⚔️ Turn combat • 💎 Loot drops • 🎭 Party companions</p>
                <p className="text-xs text-gray-600">Built with Next.js 14, Groq Llama 3.3 70B & MiMo AI</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-gray-600">
          🎲 QuestFi AI V3.0 — Built with Next.js 14 & MiMo AI by <a href="https://github.com/ramdantukangngahuntu1" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-yellow-500 transition-colors">ramdantukangngahuntu1</a>
        </div>
      </footer>
    </div>
  );
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap: Record<string, string> = { red: "bg-red-500", orange: "bg-orange-500", blue: "bg-blue-500", purple: "bg-purple-500", green: "bg-green-500", yellow: "bg-yellow-500" };
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{label}</span><span className="text-white font-mono">{value}</span></div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden"><div className={"h-full rounded-full transition-all " + (colorMap[color] || "bg-gray-500")} style={{ width: pct + "%" }} /></div>
    </div>
  );
}
