# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-09-23

### ⚠️ Breaking changes
- Components no longer need to call `mount()` in the constructor.
- The `event` loading strategy now listens for custom events on `window` instead of `document.body`. You may need to update your code to dispatch events that trigger component loading to `window`, e.g. change `document.body.dispatchEvent(new CustomEvent('myCustomEvent'))` to `window.dispatchEvent(new CustomEvent('myCustomEvent'))`;

### Added

- Added `beforeUnmount()` lifecycle support for cleanup that must happen before a component is removed from the DOM (e.g. removing video buffers).
- Added a `booster:detached` event that loading strategies can use to perform cleanup routines.
- Added a helper function `js()` for lazy loading JavaScript files (for non-module scripts that can’t be statically imported).
- Added support for htmx 2.0.5+ history restore behaviour while retaining backwards compatibility.

### Fixed

- Prevented unresolved loading strategies from leaking memory.
- Fixed history restores for conductors when using htmx 2.0.5+.
- Fixed lifecycle cleanup edge cases when elements are swapped or removed.
- Components loaded via custom events are now triggered only once.

## [1.1.3] - 2025-09-06

### Changed

- Replaced Skypack examples with jsDelivr.
- Updated README documentation, including an example HTML structure for usage without `hx-boost`.

### Fixed

- Fixed conductor history restore behaviour for htmx 2.0.5+.
- Added compatibility with revised htmx history restore logic.

## [1.1.2] - 2024-05-29

### Fixed

- Fixed `data-reset="false"` behaviour for components.

## [1.1.0] - 2023-12-21

### Added

- Added Conductors for managing multiple elements from a single class.
- Added support for using `hx-history-preserve` on elements swapped by htmx.

### Changed

- Updated README documentation.

## [1.0.0] - 2023-12-07

### Added

- Exported `BoosterFactory` so it can be subclassed.
- Added reusable Booster extension support with custom factories.
- Added npm/import workflow support.
- Added separate browser script and npm module build workflow.
- Added optional component state with local, component, and global scopes.
- Added component loading strategies.
- Added cache-busting support via component version strings.
- Added dynamic component loading based on `data-booster` attributes.

### Changed

- Refactored the extension to support different factories.
- Split library code into separate imports.
- Updated package build workflow.
- Standardised naming and documentation.

## [0.x] - 2023-12-03

### Added

- Initial Booster Pack implementation.
- Initial example components and demo pages.
- Initial Vite build setup.
- Initial README documentation.