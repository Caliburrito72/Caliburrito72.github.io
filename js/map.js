// js/map.js (tweaked for better object visibility)
// World grid, collision map, player spawn, and interactable objects.

const MAP = (() => {
  const TILE = 16;

  // Map dimensions (in tiles)
  const width = 60;
  const height = 40;

  // Collision map: 0 walkable, 1 solid
  const solids = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const edge = (x === 0 || y === 0 || x === width - 1 || y === height - 1);
      row.push(edge ? 1 : 0);
    }
    solids.push(row);
  }

  // Landmarks/blocks shaping the plaza
  for (let x = 6; x < width - 6; x++) solids[18][x] = 1; // horizontal fence
  for (let y = 8; y < 14; y++) for (let x = 10; x < 18; x++) solids[y][x] = 1; // small house block
  for (let y = 6; y < 12; y++) for (let x = 36; x < 48; x++) solids[y][x] = 1; // gallery block (background landmark)
  for (let y = 22; y < 28; y++) for (let x = 44; x < 54; x++) if ((x + y) % 2 === 0) solids[y][x] = 1; // trees

  // Player spawn (pixels)
  const playerSpawn = { x: 5 * TILE + TILE / 2, y: 20 * TILE + TILE / 2 };

  // Interactables: moved Gallery near spawn; spaced others for clarity
  const objects = [
    // About (NPC Sam) — near spawn
    { id: 'about', type: 'about', name: 'Sam', x: 8, y: 20, data: {
        title: 'About Sam',
        text: 'Visual Communication student focusing on 3D stylization, lighting, and interactive narratives. Passionate about anime-inspired characters and cozy game worlds.',
        tags: ['3D Art', 'Game Art', 'Cinematics', 'Concept']
      }
    },

    // Skills board — slightly to the right
    { id: 'skills', type: 'skills', name: 'Skills Board', x: 12, y: 20, data: {
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

    // Gallery — moved near spawn for quick verification
    { id: 'gallery', type: 'gallery', name: 'Gallery', x: 10, y: 18, data: {
        title: '3D Art Gallery',
        items: [
          { title: 'Character Bust', img: 'assets/ui/art1.jpg', caption: 'Stylized hero with SSS and rim light.' },
          { title: 'Neon Alley', img: 'assets/ui/art2.jpg', caption: 'Moody city scene with wet surfaces.' },
          { title: 'Sci‑Fi Corridor', img: 'assets/ui/art3.jpg', caption: 'Emissive accents and volumetrics.' },
        ]
      }
    },

    // Projects arcade — up a bit
    { id: 'projects', type: 'projects', name: 'Arcade', x: 14, y: 16, data: {
        title: 'Projects',
        items: [
          { title: 'JRPG Portfolio', desc: 'This playable site. Walk, interact, and discover content.', link: '#' },
          { title: 'Shader Studies', desc: 'Small experiments in stylized materials.', link: '#' },
          { title: 'Environment Set', desc: 'Modular kit for a cozy village edge.', link: '#' },
        ]
      }
    },

    // Contact mailbox — down a bit for spacing
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

  return { width, height, solids, playerSpawn, objects };
})();
