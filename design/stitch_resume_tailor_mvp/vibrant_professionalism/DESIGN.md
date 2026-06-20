---
name: Vibrant Professionalism
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#536600'
  on-secondary: '#ffffff'
  secondary-container: '#c6f000'
  on-secondary-container: '#566a00'
  tertiary: '#7b3300'
  on-tertiary: '#ffffff'
  tertiary-container: '#a04500'
  on-tertiary-container: '#ffd2bd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#c8f300'
  secondary-fixed-dim: '#afd500'
  on-secondary-fixed: '#171e00'
  on-secondary-fixed-variant: '#3e4c00'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb690'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783200'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1200px
---

## Brand & Style

This design system establishes a high-fidelity, AI-driven atmosphere that balances professional reliability with modern energy. It is designed for ambitious professionals who require a tool that feels both technologically advanced and deeply approachable.

The aesthetic follows a **Modern Corporate** style with a **Dynamic Accent** twist. It utilizes the clean structural integrity of high-end SaaS applications—characterized by generous whitespace and soft-surfaced containers—while injecting a sense of momentum through vibrant, geometric color pops. The emotional response should be one of "effortless precision": the app handles the heavy lifting of resume customization, leaving the user feeling confident and prepared.

## Colors

The palette is anchored by a deep, trustworthy purple and a high-visibility lime green that signals progression and action.

*   **Primary (Deep Purple):** Used for branding, primary navigation, and core interactive elements. It represents the "Sync" and intelligence of the platform.
*   **Secondary (Lime Green):** Reserved exclusively for "Go" actions, such as "Generate Resume" or "Finalize." It provides a high-contrast visual cue for success and movement.
*   **Neutral (Slate Greys):** A range of cool greys provides a sophisticated foundation for typography, ensuring maximum legibility without the harshness of pure black.
*   **Feedback (Warm Orange):** Applied to processing states, AI suggestions, or warnings, keeping the user informed without causing unnecessary alarm.
*   **Surface:** An off-white background (`#F8FAFC`) keeps the interface feeling light and airy, while pure white cards create a clear layered hierarchy.

## Typography

The design system uses **Plus Jakarta Sans** across all levels to maintain a cohesive, friendly, and modern personality. The typeface's wide apertures and geometric shapes ensure it remains highly legible in data-dense resume views while feeling stylish in marketing-led headers.

*   **Headlines:** Utilize heavy weights (600-700) with slight negative letter spacing to create a compact, "premium tool" feel.
*   **Body:** Optimized for reading long-form Job Descriptions. Line heights are generous (1.5x) to reduce cognitive load during the customization process.
*   **Labels:** Use semi-bold weights and uppercase styling for micro-copy and metadata to distinguish them clearly from body content.

## Layout & Spacing

The design system employs a **Fluid Grid** model with high-density vertical rhythm based on an 8px scale. 

*   **Grid Structure:** A 12-column grid for desktop transitions to a 1-column layout for mobile. Gutters are kept wide (24px) to emphasize the "clean" aesthetic and prevent information density from feeling overwhelming.
*   **Sectional Spacing:** Group related resume components (e.g., Work Experience, Education) using 32px or 48px gaps to create clear visual "chunks" of information.
*   **Safe Areas:** Mobile views utilize 16px side margins, while desktop views cap content at 1200px to maintain optimal line lengths for reading JD text.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layering**. 

1.  **Level 0 (Background):** Off-white `#F8FAFC`, non-interactive.
2.  **Level 1 (Cards/Containers):** Pure white `#FFFFFF` with a very soft, diffused shadow (Offset: 0, 4px; Blur: 20px; Opacity: 4% Black). These hold the primary resume and JD content.
3.  **Level 2 (Active Elements):** Focused input fields and hovering cards use a slightly deeper shadow (Blur: 30px; Opacity: 8% Black) to "lift" towards the user.
4.  **Overlays (Modals):** Use a Backdrop Blur (20px) to maintain context while focusing on specific AI customization tasks.

## Shapes

The shape language is defined by **Soft Geometricism**. 

*   **Primary Corners:** Standardized at 16px (`rounded-lg`) for all main cards and containers, echoing the friendly nature of the brand.
*   **Buttons & Inputs:** Use a 12px radius to feel substantial and "squishy" (tactile).
*   **Geometric Accents:** Use 45-degree angled "cuts" or large-scale circular background blurs to introduce energy without cluttering the functional UI elements.

## Components

*   **Buttons:** 
    *   *Primary:* Deep Purple background, white text. High-contrast and bold.
    *   *Action (Go):* Lime Green background, deep slate text. Used for final submission/sync.
*   **Input Fields:** Large 12px rounded corners, 2px slate border that transforms to Deep Purple on focus. Background remains white for clarity.
*   **Customization Chips:** Small, 100px rounded (pill) shapes used for "Keywords Found" or "Skill Matches." Use a light purple tint background with Deep Purple text.
*   **Comparison Cards:** Split-view containers for the original JD and the customized resume. These should have subtle inner borders (1px Slate 100) to define sections within the card.
*   **AI Suggestion Box:** Outlined with a gradient border (Purple to Lime) to denote "Intelligence-driven" content, using the Warm Orange for "Needs Review" status indicators.
*   **Progress Indicators:** Thick, 8px tall bars with Lime Green fills to visualize "Resume Match Score."