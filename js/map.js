// js/map.js
// Defines the world grid, collision map, player spawn, and interactable objects.

const MAP = (() => {
  const TILE = 16;

  // Map dimensions (in tiles)
  const width = 60;
  const height = 40;

  // Build collision map: 0 walkable, 1 solid
  const solids = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const edge = (x === 0 || y === 0 || x === width - 1 || y === height - 1);
      row.push(edge ? 1 : 0);
    }
    solids.push(row);
  }

  // Add some fences/trees/buildings as solid stripes to shape the plaza
  // Horizontal fence
  for (let x = 6; x < width - 6; x++) solids[18][x] = 1;
  // Small house block
  for (let y = 8; y < 14; y++) for (let x = 10; x < 18; x++) solids[y][x] = 1;
  // Gallery block
  for (let y = 6; y < 12; y++) for (let x = 36; x < 48; x++) solids[y][x] = 1;
  // Trees on right
  for (let y = 22; y < 28; y++) for (let x = 44; x < 54; x++) if ((x + y) % 2 === 0) solids[y][x] = 1;

  // Player spawn (tile coordinates converted to pixels by main.js)
  const playerSpawn = { x: 5 * TILE + TILE / 2, y: 20 * TILE + TILE / 2 };

  // Interactable objects placed on tiles; type maps to UI panels
  const objects = [
    // About (NPC Sam stand-in)
    { id: 'about', type: 'about', name: 'Sam', x: 8, y: 20, data: {
        title: 'About Sam',
        text: 'Visual Communication student focusing on 3D stylization, lighting, and interactive narratives. Passionate about anime-inspired characters and cozy game worlds.',
        tags: ['3D Art', 'Game Art', 'Cinematics', 'Concept']
      }
    },

    // Skills board
    { id: 'skills', type: 'skills', name: 'Skills Board', x: 24, y: 20, data: {
        title: 'Skills',
        skills: [
          { name: 'Modeling', level: 'Intermediate', tags: ['Hard-surface','Stylized','Topology'] },
          { name: 'Texturing', level: 'Intermediate', tags: ['PBR','Baking','Trim Sheets'] },
          { name: 'Lighting', level: 'Intermediate', tags: ['Cinematic','Volumetrics','Color'] },
          { name: 'Rendering', level: 'Intermediate', tags: ['Composition','Look-dev'] },
          { name: 'Game Art', level: 'Intermediate', tags: ['Optimization','Shaders'] },
        ]
      }
    },

    // Art gallery terminal
    { id: 'gallery', type: 'gallery', name: 'Gallery', x: 40, y: 16, data: {
        title: '3D Art Gallery',
        items: [
          { title: 'Character Bust', img: 'assets/ui/art1.jpg', caption: 'Stylized hero with SSS and rim light.' },
          { title: 'Neon Alley', img: 'assets/ui/art2.jpg', caption: 'Moody city scene with wet surfaces.' },
          { title: 'Sci‑Fi Corridor', img: 'assets/ui/art3.jpg', caption: 'Emissive accents and volumetrics.' },
        ]
      }
    },

    // Projects arcade
    { id: 'projects', type: 'projects', name: 'Arcade', x: 28, y: 10, data: {
        title: 'Projects',
        items: [
          { title: 'JRPG Portfolio', desc: 'This playable site. Walk, interact, and discover content.', link: '#' },
          { title: 'Shader Studies', desc: 'Small experiments in stylized materials.', link: '#' },
          { title: 'Environment Set', desc: 'Modular kit for a cozy village edge.', link: '#' },
        ]
      }
    },

    // Contact mailbox
    { id: 'contact', type: 'contact', name: 'Mailbox', x: 14, y: 28, data: {
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

  return { width, height, solids, playerSpawn, objects };
})();
