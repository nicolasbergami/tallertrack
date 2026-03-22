# Contexto del Proyecto: TallerTrack
[cite_start]TallerTrack es una plataforma digital B2B (SaaS) creada específicamente para talleres mecánicos de Argentina[cite: 4].
[cite_start]El objetivo principal es eliminar los llamados telefónicos de los clientes preguntando "está listo mi auto?" [cite: 6][cite_start], automatizando la comunicación vía WhatsApp cada vez que el vehículo cambia de estado[cite: 16].

## Tech Stack
- Frontend: React / TypeScript (Tailwind CSS)
- Backend: Node.js (con Worker separado para WhatsApp)
- [cite_start]Base de datos: PostgreSQL (Multi-tenant estricto) [cite: 99]

## Reglas de IA (Cómo debes comportarte)
1. PIENSA ANTES DE ESCRIBIR: Antes de generar código, analiza la arquitectura y explícame tu plan paso a paso.
2. NO SOBREINGENIERIZAR: Mantén el código simple. Evita crear archivos innecesarios.
3. CONTEXTO MODULAR: No leas todo el proyecto de golpe. Usa los archivos de habilidades (.claude/skills) según la tarea que te pida.

## Índice de Conocimiento (Skills & Agents)
- Si vas a trabajar en pantallas, UI o Frontend -> LEE: `.claude/skills/tallertrack-ui-patterns.md`
- Si vas a trabajar en la base de datos o backend -> `.claude/skills/tallertrack-ui-patterns.md`
- Si vas a trabajar en la conexión de WhatsApp -> `.claude/skills/whatsapp-backend-patterns.md`