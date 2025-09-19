// js/map.js (planned layout, refreshed collisions, sensible placement)
const MAP = (() => {
  const TILE = 16;

  // Dimensions and high-level plan
  // West: spawn plaza with Skills and About
  // North: Gallery wing
  // Northeast: Projects arcade
  // South: water garden with lanterns and benches
  // Northwest/West: cottages and a tiny farm patch (props only)
  const width = 64;
  const height = 44;

  // Collision grid: 0 walkable, 1 solid
  const solids = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const edge = (x === 0 || y === 0 || x === width - 1 || y === height - 1);
      row.push(edge ? 1 : 0);
    }
    solids.push(row);
  }

  // Clear any old blocking bands; rebuild concise silhouettes
  // Plaza fence line
  for (let x = 6; x < width - 6; x++) solids[20][x] = 1;

  // North gallery block (background silhouette, non-walk area)
  for (let y = 6; y < 12; y++) for (let x = 38; x < 52; x++) solids[y][x] = 1;

  // West cottages block
  for (let y = 10; y < 15; y++) for (let x = 8; x < 14; x++) solids[y][x] = 1;

  // Farm patch (fenced) NW
  for (let y = 14; y < 17; y++) for (let x = 6; x < 10; x++) solids[y][x] = 1;

  // Tree line in SE
  for (let y = 28; y < 34; y++) for (let x = 46; x < 58; x++) if ((x + y) % 2 === 0) solids[y][x] = 1;

  // Player spawn in west plaza, clear space around
  const playerSpawn = { x: 7 * TILE + TILE / 2, y: 22 * TILE + TILE / 2 };

  // Interactables placed along clear paths (no solids under them)
  const objects = [
    // West plaza core
    { id: 'about',   type: 'about',   name: 'Sam',         x: 10, y: 22, data: {
      title: 'About Sam',
      text: 'Stylized 3D + interactive narratives. Anime-inspired characters, cozy worlds, cinematic lighting.',
      tags: ['3D Art','Game Art','Cinematics','Concept']
    }},
    { id: 'skills',  type: 'skills',  name: 'Skills Board', x: 13, y: 22, data: {
      title: 'Skills',
      skills: [
        { name: 'Modeling',  level: 'Intermediate', tags: ['Stylized','Topology'] },
        { name: 'Texturing', level: 'Intermediate', tags: ['PBR','Baking','Trim'] },
        { name: 'Lighting',  level: 'Intermediate', tags: ['Cinematic','Color'] },
        { name: 'Rendering', level: 'Intermediate', tags: ['Composition','Look‑dev'] },
        { name: 'Game Art',  level: 'Intermediate', tags: ['Optimization','Shaders'] },
      ]
    }},

    // North gallery wing entrance
    { id: 'gallery', type: 'gallery', name: 'Gallery',      x: 28, y: 14, data: {
      title: '3D Art Gallery',
      items: [
        { title: 'Character Bust', img: 'assets/ui/art1.jpg', caption: 'Stylized hero with rim light.' },
        { title: 'Neon Alley',     img: 'assets/ui/art2.jpg', caption: 'Moody city with wet pavement.' },
        { title: 'Sci‑Fi Corridor',img: 'assets/ui/art3.jpg', caption: 'Volumetrics and emissives.' },
      ]
    }},

    // Northeast projects arcade
    { id: 'projects',type: 'projects',name: 'Arcade',       x: 40, y: 16, data: {
      title: 'Projects',
      items: [
        { title: 'JRPG Portfolio', desc: 'This playable site.', link: '#' },
        { title: 'Shader Studies', desc: 'Stylized materials.', link: '#' },
        { title: 'Environment Set',desc: 'Modular cozy set.', link: '#' },
      ]
    }},

    // South mailbox/contact near benches
    { id: 'contact', type: 'contact', name: 'Mailbox',      x: 20, y: 30, data: {
      title: 'Contact',
      email: 'sam@example.com',
      links: [
        { label: 'ArtStation', url: '#' },
        { label: 'GitHub',     url: '#' },
        { label: 'Instagram',  url: '#' }
      ]
    }},
  ];

  // Water garden (south) with one larger pool
  const water = { rects: [ { x0: 16, y0: 28, x1: 36, y1: 32 } ] };

  // Props arranged in clusters along paths; no props on solid tiles
  const props = [
    // Plaza framing
    { type: 'lamp',   x: 11, y: 21, emissive: true },
    { type: 'lamp',   x: 14, y: 21, emissive: true },
    { type: 'bench',  x: 12, y: 24 },
    { type: 'plant',  x: 9,  y: 23 },
    { type: 'plant',  x: 15, y: 23 },

    // Path guidance to north wings
    { type: 'sign',   x: 18, y: 20, text: 'Gallery ↑' },
    { type: 'sign',   x: 34, y: 18, text: 'Arcade →' },
    { type: 'banner', x: 26, y: 15, color: '#6ee7ff' },
    { type: 'banner', x: 30, y: 15, color: '#ff7ae6' },

    // Gallery forecourt
    { type: 'plant',  x: 27, y: 16 },
    { type: 'plant',  x: 29, y: 16 },

    // Arcade forecourt
    { type: 'crate',  x: 39, y: 18 },
    { type: 'crate',  x: 41, y: 18 },

    // Water garden ambience
    { type: 'lamp',   x: 18, y: 29, emissive: true },
    { type: 'lamp',   x: 34, y: 29, emissive: true },
    { type: 'bench',  x: 24, y: 31 },
    { type: 'plant',  x: 20, y: 31 },
    { type: 'plant',  x: 32, y: 31 },

    // West cottages/farm visuals (non-blocking props near solids)
    { type: 'crate',  x: 9,  y: 16 },
    { type: 'banner', x: 8,  y: 19, color: '#ffd966' },
  ];

  // Ambient NPCs positioned at open walkable tiles near points of interest
  const npcs = [
    { x: 12, y: 22, dir: 'left',  palette: { hair:'#6ee7ff', outfit:'#2a3347' } }, // plaza visitor
    { x: 28, y: 16, dir: 'down',  palette: { hair:'#ffd966', outfit:'#33405a' } }, // gallery viewer
    { x: 40, y: 18, dir: 'right', palette: { hair:'#ff7ae6', outfit:'#2e3a51' } }, // arcade patron
    { x: 22, y: 30, dir: 'up',    palette: { hair:'#a5f3fc', outfit:'#2b3b55' } }, // water garden
    { x: 33, y: 30, dir: 'up',    palette: { hair:'#fca5a5', outfit:'#2b3b55' } }, // water garden
  ];

  return { width, height, solids, playerSpawn, objects, props, npcs, water };
})();
