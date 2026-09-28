---
name: hello-dola-video-planner
description: Plan and prompt high-end cinematic, photorealistic video generations on Dola AI while maximizing free daily credits. Contains lens optics, cinematic lighting, 30s narrative arcs, motion physics, and credit-budget planning to achieve 6+ professional videos per chat session without wasted re-rolls.
---

# hello_dola — Cinematic AI Video Planner & Prompt Engine

Goal: Produce Hollywood-grade, photorealistic, cinematic video generations on Dola AI while strictly managing free daily credit limits — targeting **at least 6 high-impact 30-second videos per chat session** with zero wasted generations.

---

## 1. The Physics of Photorealistic AI Video

Generative video models (like Dola AI) don't understand "good quality" or buzzwords like *"photorealistic, hyperrealistic, 4k, 8k, unreal engine"* — these terms often bias models toward synthetic 3D videogame rendering.

Realism comes from specifying **cinematic physical constraints**:
1. **Optics & Focal Length**: How light enters the lens (aperture, focal length, depth of field).
2. **Lighting Physics**: Directional key lights, natural bounce, volumetric atmospheric haze.
3. **Restrained Motion Dynamics**: Measured, physics-based movement. Erratic or stacked actions trigger limb tearing, warping, and morphing.
4. **Color Science**: Film stock grain, controlled dynamic range, and restrained color palettes over digital saturation.

---

## 2. The Cinematic Prompt Formula

Construct every prompt in this exact cinematic order:

```
[Lens & Optical Rig] + [Lighting & Atmospheric Conditions] + [Subject with Micro-Details] + [Paced Physical Action] + [Camera Move & Speed] + [Color Science & Film Stock]
```

### Breakdown of Elements:
- **Lens & Rig**: e.g., *"Shot on 35mm anamorphic lens, Arri Alexa LF, shallow depth of field, f/2.0 aperture"*
- **Lighting**: e.g., *"Soft directional golden-hour sunlight pouring through haze, subtle rim lighting, natural specular highlights"*
- **Subject**: e.g., *"Weathered artisan in linen tunic, visible skin texture, fine stubble, natural eye reflections"*
- **Action**: Single clear, physics-grounded movement (e.g., *"slowly lifts a steaming ceramic cup to chest height"*)
- **Camera Move**: Slow, controlled cinematic motion (e.g., *"slow steadicam push-in, low eye-level angle, smooth 24fps motion blur"*)
- **Color & Film Stock**: e.g., *"Kodak Vision3 500T color grading, organic subtle 35mm film grain, muted cinematic palette"*

---

## 3. Cinematic Vocabulary & Optics Cheat Sheet

Use these precise cinematographic terms instead of vague hype words:

### A. Camera Lenses & Optics
| Term | Visual Effect | When to Use |
|---|---|---|
| **35mm Anamorphic** | Wide cinematic field of view, horizontal lens flares, oval bokeh | Epic landscape, sci-fi, cinematic narrative |
| **50mm Prime (f/1.4)** | Natural human eye perspective, rich creamy background blur | Character portraits, dialogue, emotional moments |
| **85mm Telephoto** | Compression of background, flat perspective, extreme isolation | Close-up drama, wildlife, product details |
| **Probe / Macro Lens** | Microscopic detail, immersive ultra-close perspective | Liquids, food sizzle, mechanical gears |

### B. Controlled Camera Movement (Prevents Warping)
*Rule: Fast camera movement destroys diffusion temporal coherence. Always specify slow or steady motion.*

- `Slow dolly-in`: Gradually pushes inward toward subject, building tension.
- `Steadicam tracking shot`: Floats smoothly beside or behind the moving subject.
- `Slow orbital arc`: 15–30 degree smooth rotation around a centered subject.
- `Jib / Crane boom down`: Moves vertically from high angle down to ground level.
- `Locked-off tripod with subtle organic movement`: Stable frame where only the subject and environment (wind, smoke, water) move.

### C. Cinematic Lighting & Atmosphere
- **Volumetric Lighting / God Rays**: Light shafts filtering through dust, smoke, or morning mist.
- **Chiaroscuro / Low-Key**: High contrast, deep velvety shadows, dramatic single-source illumination.
- **Soft Diffusion / Bounce**: Flattering wrap-around light, no harsh digital clip on highlights.
- **Practical Lighting**: In-scene light sources (street lamps, neon signs, candle flame flickering).
- **Blue Hour / Golden Hour**: Deep cobalt sky with warm amber rim accents.

---

## 4. 30-Second Multi-Beat Narrative Arc Structure

Generating a continuous 30-second video requires a coherent narrative progression across the clip so the model does not freeze, loop awkwardly, or hallucinate between frames.

Structure 30-second prompts into a **3-Beat Progression**:

```
[BEAT 1: 0–8s — The Establish]
Wide or medium establishing frame. Introduce environment atmosphere, lighting, and subject posture. Steady camera positioning.

[BEAT 2: 8–22s — The Core Action]
Slow cinematic push-in or tracking movement. Subject executes one deliberate physical action with natural weight and micro-motions.

[BEAT 3: 22–30s — The Cinematic Resolve]
Camera settles into a wide pull-back or subtle rack focus. Action completes, lingering on atmospheric environment and emotional cadence.
```

### Example 30s Master Prompt:
> *"Shot on 35mm anamorphic lens, Arri Alexa LF. Soft morning mist drifting through ancient pine forest, warm golden sunlight piercing through towering branches. (0–8s) A lone mountaineer in weathered wax-canvas coat stands on the mossy ridge, breath visible in cold air, steadicam slowly advancing. (8–22s) The mountaineer unslings brass binoculars, smoothly brings them to eyes, camera slowly orbiting at chest level. (22–30s) Camera gently pulls back revealing the vast misty mountain valley beyond, wind rustling evergreen needles. Kodak Vision3 500T 5219 film stock, organic film grain, natural 24fps motion blur, realistic cloth simulation."*

---

## 5. The Image-to-Video (I2V) Master Workflow (100% Realism)

For guaranteed photorealism and maximum credit savings:
1. **Never generate complex human anatomy or brand products purely with Text-to-Video (T2V)** if photorealism is paramount. T2V models must invent facial symmetry, clothing textures, and anatomy from scratch, leading to frequent 50% failure rates.
2. **Generate a 4K photorealistic reference image first** (using Midjourney, Flux, or Dola's image tools) featuring your exact character, lighting, and camera angle.
3. **Use Dola AI Image-to-Video (I2V)**:
   - In the prompt, **only describe the motion and camera trajectory**, not the static scene details.
   - *Example I2V prompt*: `"Slow cinematic dolly-in at 24fps. Subject blinks naturally, subtle wind flutters hair strands, soft chest breathing motion. Camera maintains steady focus on eyes. 30 seconds continuous smooth motion."`
   - *Result*: 95%+ first-pass success rate, saving valuable free credits.

---

## 6. Negative Descriptors & Deadly Pitfalls

Always avoid or negatively prompt against these common AI video bugs:

### Words to NEVER Use:
- ❌ `photorealistic, hyperrealistic, 4K, 8K, unreal engine, octane render` *(triggers synthetic CGI / plastic look)*
- ❌ `epic, amazing, gorgeous, dramatic` *(wasted tokens; adds zero visual instructions)*
- ❌ Multiple conflicting actions: *"The man runs, jumps, opens a door, sits down and cries"* *(causes severe morphing and body warping)*
- ❌ Sudden fast pans: *"Quick camera flip, fast whip pan, speed ramp"* *(causes screen tearing)*

### Negative Safety Net:
Keep these artifacts out of your clips:
`plastic skin, oversaturated colors, cartoon rendering, 3D CGI animation, jittery frame rate, morphing limbs, distorted hands, flickering light, motion blur smears, unnatural head turns, sudden jump cuts.`

---

## 7. Maximizing 6 × 30-Second Videos Per Chat Session

Dola AI free plan allows limited daily credits. To produce a complete 6-video story arc in a single chat:

### Credit Math Matrix:
- Estimated 30s generation: **~8 credits per video**
- Target: 6 clips × 8 credits = **~48 credits required**
- If your account balance is 50 credits, you have **2 credits margin of error** (meaning zero room for bad generations).

### The 6-Shot Cohesive Chat Storyboard:
Plan all 6 clips before typing a single prompt:

| Clip # | Type | Duration | Shot Type | Purpose |
|---|---|---|---|---|
| **01** | T2V / I2V | 30s | Wide establishing, slow boom down | World-building, sets lighting & tone |
| **02** | I2V | 30s | Medium tracking, steadicam advance | Introduce subject, establish costume & motion |
| **03** | I2V | 30s | Close-up, shallow depth of field | Micro-action, emotional connection |
| **04** | I2V | 30s | Over-the-shoulder / POV dolly-in | Discovering an object, environment shift |
| **05** | I2V | 30s | Dynamic low-angle tracking shot | Climax action, highest motion complexity |
| **06** | T2V / I2V | 30s | Extreme wide, slow camera pull-back | Resolution, lingering cinematic outro |

---

## 8. Pre-Flight Generation Checklist

Before clicking **Generate** in Dola AI, run this mental audit:

- [ ] **Optics Specified?** Lens type (e.g., 35mm / 50mm) and aperture/depth of field declared.
- [ ] **Lighting Source Defined?** Clear direction (golden hour, volumetric haze, rim light) set.
- [ ] **Motion Restrained?** Only ONE physical action with realistic speed and weight.
- [ ] **Camera Movement Smooth?** Steadicam, dolly, or slow orbit specified — no fast whip pans.
- [ ] **No CGI Buzzwords?** Removed all instances of "hyperrealistic", "unreal engine", or "8k".
- [ ] **Narrative Arc Included (for 30s)?** Beat 1 (establish), Beat 2 (action), Beat 3 (resolve).
- [ ] **Credit Feasibility Verified?** Today's remaining credits sufficient for the target duration.
