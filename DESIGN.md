# Design

## Stack

Bootstrap 5.3 as the base UI framework, extended with a custom global stylesheet. Font is Poppins (self-hosted, weights 400/500/700).

For more technical specification refer to [Design system references](./references/design-system-reference-llms.txt).

## Color system

CSS custom properties on :root. The primary brand color is a red (#dc3545), with a blue primary (#0d6ef8) used for interactive/loader elements. Additional semantic colors cover success (green), warning (orange), purple, and gray scales.

## Component conventions

Branded button variants (btn-branded, btn-outline-branded) mirror Bootstrap's button pattern. Status badges use a consistent pill pattern (item-status) with semantic color pairs (background + foreground) for warning, success, primary, danger, secondary, and dark states.

## Layout
App content is offset 82px from the top (fixed navbar height). Entry content is capped at 680px centered. The global loader is a fixed full-screen overlay with a three-dot opacity animation.

## Philosophy
Minimal custom CSS. Bootstrap handles the heavy lifting, and the custom layer only overrides brand color, fonts, status indicators, and a few structural globals.