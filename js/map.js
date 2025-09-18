// js/map.js (environment color + prop density + ambient NPCs)
const MAP = (() => {
  const TILE = 16;

  // Dimensions
  const width = 60;
  const height = 40;

  // Collision map
  const solids = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const edge = (x === 0 || y === 0 || x === width - 1 || y === height - 1);
      row.push(edge ? 1 : 0);
    }
    solids.push(row);
  }

  // Landmark solids giving depth silhouettes
  for (let x = 6; x < width - 6; x++) solids[18][x] = 1;                 // fence line
  for (let y = 8; y < 14; y++) for (let x = 10; x < 18; x++) solids[y][x] = 1; // house block
  for (let y = 6; y < 12; y++) for (let x = 36; x < 48; x++) solids[y][x] = 1; // distant block
  for (let y = 22; y < 28; y++) for (let x = 44; x < 54; x++) if ((x + y) % 2 === 0) solids[y][x] = 1; // trees

  // Player spawn
  const playerSpawn = { x: 5 * TILE + TILE / 2, y: 20 * TILE + TILE / 2 };

  // Interactables near spawn, spaced naturally
  const objects = [
    { id: 'about', type: 'about', name: 'Sam', x: 8, y: 20, data: {
        title: 'About Sam',
        text: 'Visual Communication student focusing on stylized 3D and interactive narratives. Anime-inspired characters, cozy worlds, cinematic lighting.',
        tags: ['3D Art','Game Art','Cinematics','Concept']
      }
    },
    { id: 'skills', type: 'skills', name: 'Skills Board', x: 12, y: 20, data: {
        title: 'Skills',
        skills: [
          { name: 'Modeling', level: 'Intermediate', tags: ['Stylized','Topology'] },
          { name: 'Texturing', level: 'Intermediate', tags: ['PBR','Baking','Trim'] },
          { name: 'Lighting', level: 'Intermediate', tags: ['Cinematic','Color'] },
          { name: 'Rendering', level: 'Intermediate', tags: ['Composition','Look‑dev'] },
          { name: 'Game Art', level: 'Intermediate', tags: ['Optimization','Shaders'] },
        ]
      }
    },
    { id: 'gallery', type: 'gallery', name: 'Gallery', x: 10, y: 18, data: {
        title: '3D Art Gallery',
        items: [
          { title: 'Character Bust', img: 'assets/ui/art1.jpg', caption: 'Stylized hero with rim light.' },
          { title: 'Neon Alley', img: 'assets/ui/art2.jpg', caption: 'Moody city with wet pavement.' },
          { title: 'Sci‑Fi Corridor', img: 'assets/ui/art3.jpg', caption: 'Volumetrics and emissives.' },
        ]
      }
    },
    { id: 'projects', type: 'projects', name: 'Arcade', x: 14, y: 16, data: {
        title: 'Projects',
        items: [
          { title: 'JRPG Portfolio', desc: 'This playable site.', link: '#' },
          { title: 'Shader Studies', desc: 'Stylized materials.', link: '#' },
          { title: 'Environment Set', desc: 'Modular cozy set.', link: '#' },
        ]
      }
    },
    { id: 'contact', type: 'contact', name: 'Mailbox', x: 10, y: 24, data: {
        title: 'Contact',
        email: 'sam@example.com',
        links: [
          { label: 'ArtStation', url: '#' },
          { label: 'GitHub', url: '#' },
          { label: 'Instagram', url: '#' }
        ]
      }
    },
  ];

  // Decorative props: more density and color variety; lamps feed glow
  const props = [
    // Plaza lamps framing the center
    { type: 'lamp', x: 9,  y: 19, emissive: true },
    { type: 'lamp', x: 13, y: 19, emissive: true },

    // Signage guiding to panels
    { type: 'sign', x: 11, y: 17, text: 'Gallery →', emissive: false },
    { type: 'sign', x: 13, y: 15, text: 'Arcade ↑', emissive: false },

    // Crates and planters add volume/color
    { type: 'crate', x: 15, y: 17, emissive: false },
    { type: 'plant', x: 9,  y: 21, emissive: false },
    { type: 'plant', x: 13, y: 21, emissive: false },

    // Banners and benches for color splashes
    { type: 'banner', x: 8,  y: 18, color: '#ff7ae6' },
    { type: 'banner', x: 12, y: 18, color: '#6ee7ff' },
    { type: 'bench',  x: 12, y: 22 }
  ];

  // Ambient background NPCs (idle only; drawn desaturated)
  const npcs = [
    { x: 16, y: 20, dir: 'left',  palette: { hair:'#6ee7ff', outfit:'#2a3347' } },
    { x: 8,  y: 16, dir: 'down',  palette: { hair:'#ffd966', outfit:'#33405a' } },
    { x: 14, y: 24, dir: 'right', palette: { hair:'#ff7ae6', outfit:'#2e3a51' } }
  ];

  return { width, height, solids, playerSpawn, objects, props, npcs };
})();
