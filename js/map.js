// js/map.js
// Planned layout with fresh collisions, deliberate placements, and NPC dialogues.
// Flow: Spawn Plaza (About/Skills) → North Gallery → Northeast Arcade → South Water Garden → West cottages/farm visuals.

const MAP = (() => {
  const TILE = 16;

  // Dimensions chosen for comfortable exploration with current camera zoom
  const width = 64;   // tiles
  const height = 44;  // tiles

  // Collision grid: 0 walkable, 1 solid — regenerated from scratch to remove any legacy obstacles
  const solids = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const edge = (x === 0 || y === 0 || x === width - 1 || y === height - 1);
      row.push(edge ? 1 : 0);
    }
    solids.push(row);
  }

  // Silhouette blocks — designed as background/non-walkable regions that shape the scene without trapping the player
  // West cottages/farm block
  for (let y = 10; y < 15; y++) for (let x = 8; x < 14; x++) solids[y][x] = 1;
  // Plaza fence line to hint a plaza boundary
  for (let x = 6; x < width - 6; x++) solids[20][x] = 1;
  // North gallery silhouette
  for (let y = 6; y < 12; y++) for (let x = 38; x < 52; x++) solids[y][x] = 1;
  // Southeast tree line cluster
  for (let y = 28; y < 34; y++) for (let x = 46; x < 58; x++) if ((x + y) % 2 === 0) solids[y][x] = 1;

  // Spawn: west plaza center (clear walkable tiles around)
  const playerSpawn = { x: 7 * TILE + TILE / 2, y: 22 * TILE + TILE / 2 };

  // Interactables placed on walkable tiles along clear approach paths
  const objects = [
    // Plaza — About and Skills side-by-side so players learn interaction quickly
    { id: 'about',   type: 'about',   name: 'Sam',     x: 10, y: 22, data: {
      title: 'About Sam',
      text: 'Stylized 3D + interactive narratives. Anime-inspired characters, cozy worlds, cinematic lighting.',
      tags: ['3D Art','Game Art','Cinematics','Concept']
    }},
    { id: 'skills',  type: 'skills',  name: 'Skills',  x: 13, y: 22, data: {
      title: 'Skills',
      skills: [
        { name: 'Modeling',  level: 'Intermediate', tags: ['Stylized','Topology'] },
        { name: 'Texturing', level: 'Intermediate', tags: ['PBR','Baking','Trim'] },
        { name: 'Lighting',  level: 'Intermediate', tags: ['Cinematic','Color'] },
        { name: 'Rendering', level: 'Intermediate', tags: ['Composition','Look‑dev'] },
        { name: 'Game Art',  level: 'Intermediate', tags: ['Optimization','Shaders'] },
      ]
    }},

    // North Gallery forecourt
    { id: 'gallery', type: 'gallery', name: 'Gallery', x: 28, y: 14, data: {
      title: '3D Art Gallery',
      items: [
        { title: 'Character Bust', img: 'assets/ui/art1.jpg', caption: 'Stylized hero with rim light.' },
        { title: 'Neon Alley',     img: 'assets/ui/art2.jpg', caption: 'Moody city with wet pavement.' },
        { title: 'Sci‑Fi Corridor',img: 'assets/ui/art3.jpg', caption: 'Volumetrics and emissives.' },
      ]
    }},

    // Northeast Projects arcade
    { id: 'projects', type: 'projects', name: 'Arcade', x: 40, y: 16, data: {
      title: 'Projects',
      items: [
        { title: 'JRPG Portfolio', desc: 'This playable site.', link: '#' },
        { title: 'Shader Studies', desc: 'Stylized materials.', link: '#' },
        { title: 'Environment Set', desc: 'Modular cozy set.', link: '#' },
      ]
    }},

    // South water garden mailbox/contact
    { id: 'contact', type: 'contact', name: 'Mailbox', x: 20, y: 30, data: {
      title: 'Contact',
      email: 'sam@example.com',
      links: [
        { label: 'ArtStation', url: '#' },
        { label: 'GitHub',     url: '#' },
        { label: 'Instagram',  url: '#' }
      ]
    }},
  ];

  // Water garden — a single larger pool for color variety and atmosphere
  const water = { rects: [ { x0: 16, y0: 28, x1: 36, y1: 32 } ] };

  // Decorative props — arranged as natural clusters near each point of interest (no props on solid tiles)
  const props = [
    // Plaza framing
    { type: 'lamp',   x: 11, y: 21, emissive: true },
    { type: 'lamp',   x: 14, y: 21, emissive: true },
    { type: 'bench',  x: 12, y: 24 },
    { type: 'plant',  x:  9, y: 23 },
    { type: 'plant',  x: 15, y: 23 },

    // Guidance signs to wings
    { type: 'sign',   x: 18, y: 20, text: 'Gallery ↑' },
    { type: 'sign',   x: 34, y: 18, text: 'Arcade →' },
    { type: 'banner', x: 26, y: 15, color: '#6ee7ff' },
    { type: 'banner', x: 30, y: 15, color: '#ff7ae6' },

    // Gallery forecourt plants
    { type: 'plant',  x: 27, y: 16 },
    { type: 'plant',  x: 29, y: 16 },

    // Arcade forecourt crates
    { type: 'crate',  x: 39, y: 18 },
    { type: 'crate',  x: 41, y: 18 },

    // Water garden ambience
    { type: 'lamp',   x: 18, y: 29, emissive: true },
    { type: 'lamp',   x: 34, y: 29, emissive: true },
    { type: 'bench',  x: 24, y: 31 },
    { type: 'plant',  x: 20, y: 31 },
    { type: 'plant',  x: 32, y: 31 },

    // West cottages/farm visuals
    { type: 'crate',  x:  9, y: 16 },
    { type: 'banner', x:  8, y: 19, color: '#ffd966' },
  ];

  // Ambient NPCs — each on walkable tiles and with dialogue praising Sam or hinting navigation
  const npcs = [
    { x: 12, y: 22, dir: 'left',  name: 'Visitor', palette: { hair:'#2c2d31', outfit:'#2a3347' },
      dialogues: [
        "Sam’s portfolio is unreal—can’t wait to see the Gallery!", 
        "Try heading north to the Gallery entrance."
      ]
    },
    { x: 28, y: 16, dir: 'down',  name: 'Guide',   palette: { hair:'#3a2f24', outfit:'#33405a' },
      dialogues: [
        "The lighting studies in the Gallery are top tier.", 
        "Up ahead you’ll find curated pieces with emissive highlights."
      ]
    },
    { x: 40, y: 18, dir: 'right', name: 'Coder',   palette: { hair:'#1f1f1f', outfit:'#2e3a51' },
      dialogues: [
        "The Projects arcade shows how this site runs—pretty slick!", 
        "Walk up to the Arcade sign to open the Projects panel."
      ]
    },
    { x: 22, y: 30, dir: 'up',    name: 'Artist',  palette: { hair:'#2b1d14', outfit:'#2b3b55' },
      dialogues: [
        "This water garden is peaceful—Sam’s sense of mood is strong.", 
        "Mailbox nearby if messages need sending."
      ]
    },
    { x: 33, y: 30, dir: 'up',    name: 'Fan',     palette: { hair:'#0f0f0f', outfit:'#2b3b55' },
      dialogues: [
        "Sam’s environments feel like a diorama—love the glow!", 
        "Don’t miss the Arcade in the northeast."
      ]
    }
  ];

  return { width, height, solids, playerSpawn, objects, props, npcs, water };
})();
